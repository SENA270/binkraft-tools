// 回答送信時に Google カレンダーへ「（仮）」予定を書き込む。
// - 認証: gauth_session(ログイン) と gcal_token(カレンダー権限) が両方必要。なければ skipped で返す(エラーじゃない)
// - 衝突チェック: freebusy で既存予定がある時間は仮押さえせずスキップ
// - 識別: extendedProperties.private.itsuau_event_id + itsuau_response_email を埋める
// - 通知: reminders.useDefault=false(うるさくしない)
// - 再送信: 既存マッピングを先に削除してから新規作成(冪等)
import { NextResponse } from "next/server";
import { kvGet, kvSet, kvConfigured } from "../../../../chousei/lib/kv";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchFreeBusy,
} from "../../../../chousei/lib/google";
import { verifySession, SESSION_COOKIE_NAME, sessionConfigured } from "../../../../chousei/lib/session";
import { readCookie } from "../../../../chousei/lib/request";
import { rateLimit, clientIp, rateLimitedResponse } from "../../../../chousei/lib/ratelimit";
import { jstIso, busyToDayMinutes, intervalsOverlap } from "../../../../chousei/lib/time";
import type { EventConfig, Interval } from "../../../../chousei/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_KEY = (id: string) => `chousei:event:${id}`;
const TENTATIVE_KEY = (id: string, email: string) => `chousei:tentative:${id}:${email.toLowerCase()}`;

type StoredEvent = { id: string; title: string; config: EventConfig };
type TentativeRecord = { date: string; eventId: string; start: number; end: number };
type SubmittedResponse = {
  name: string;
  byDate: Record<string, { unavailable: boolean; intervals: Interval[] }>;
};

export async function POST(req: Request) {
  const token = readCookie(req, "gcal_token");
  if (!token) return NextResponse.json({ skipped: true, reason: "no_cal_auth" });

  if (!sessionConfigured()) return NextResponse.json({ skipped: true, reason: "session_not_configured" });
  const sess = verifySession(readCookie(req, SESSION_COOKIE_NAME));
  if (!sess) return NextResponse.json({ skipped: true, reason: "no_login" });

  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });

  // 仮押さえは Google API 呼び出しを伴うので厳しめに。
  // email 単位(同一アカウントの濫用防止) + IP 単位(同一ネットワークの濫用)の両方を見る。
  const rlEmail = await rateLimit("tentative-email", sess.email.toLowerCase(), 10, 60_000);
  if (!rlEmail.ok) return rateLimitedResponse(rlEmail);
  const rlIp = await rateLimit("tentative-ip", clientIp(req), 20, 60_000);
  if (!rlIp.ok) return rateLimitedResponse(rlIp);

  let body: { id?: string; response?: SubmittedResponse };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { id, response } = body;
  if (!id || !response) return NextResponse.json({ error: "id/response required" }, { status: 400 });

  // 1. イベント取得
  let ev: StoredEvent | null = null;
  try {
    const raw = await kvGet(EVENT_KEY(id));
    ev = raw ? (JSON.parse(raw) as StoredEvent) : null;
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
  if (!ev) return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  // 2. 既存の仮押さえを削除(編集時に古いものを始末)。
  //    削除失敗したものは KV に残し、次回呼び出しで再試行できるようにする(=トランザクション風の冪等性)。
  let existing: TentativeRecord[] = [];
  try {
    const existingRaw = await kvGet(TENTATIVE_KEY(id, sess.email));
    existing = existingRaw ? (JSON.parse(existingRaw) as TentativeRecord[]) : [];
  } catch (e) {
    console.error("[tentative] existing kvGet failed:", e);
  }

  // 「Google上にまだ存在しうる仮押さえ」の現状ビュー。
  // この配列を Google 操作のたびに KV へ反映し、途中で落ちても次回が回収できる状態にする。
  const liveOnGoogle: TentativeRecord[] = [...existing];
  const persist = async () => {
    try {
      await kvSet(TENTATIVE_KEY(id, sess.email), JSON.stringify(liveOnGoogle));
    } catch (e) {
      console.error("[tentative] persist failed:", e);
    }
  };

  let removed = 0;
  for (const e of [...existing]) {
    try {
      await deleteCalendarEvent(token, e.eventId);
      // 削除成功 → liveOnGoogle から除去
      const idx = liveOnGoogle.findIndex((x) => x.eventId === e.eventId);
      if (idx >= 0) liveOnGoogle.splice(idx, 1);
      removed++;
      await persist();
    } catch (err) {
      // 削除失敗 → liveOnGoogle に残して次回再試行(orphan を放置しない)
      console.warn("[tentative] delete failed (will retry next time):", err);
    }
  }

  const dates = ev.config.candidateDates;
  if (dates.length === 0) {
    await persist();
    return NextResponse.json({ created: 0, skipped: 0, removed });
  }

  // 3. freebusy で既存予定の取得(衝突チェック用)
  const sortedDates = [...dates].sort();
  const busyByDate: Record<string, Interval[]> = {};
  try {
    const busy = await fetchFreeBusy(
      token,
      jstIso(sortedDates[0], 0),
      jstIso(sortedDates[sortedDates.length - 1], 1440)
    );
    for (const date of dates) {
      busyByDate[date] = busy
        .map((b) => busyToDayMinutes(date, b.start, b.end))
        .filter((x): x is Interval => x !== null);
    }
  } catch (e) {
    console.warn("[tentative] freebusy failed (proceeding without conflict check):", e);
  }

  // 4. 仮押さえ作成(各成功ごとに KV 反映 → 途中失敗でも orphan ゼロ)
  let createdCount = 0;
  let skipped = 0;
  for (const date of dates) {
    const day = response.byDate[date];
    if (!day || day.unavailable) continue;
    const dayBusy = busyByDate[date] || [];
    for (const iv of day.intervals) {
      if (iv.end <= iv.start) continue;
      const wanted: Interval = { start: iv.start, end: iv.end };
      if (dayBusy.some((b) => intervalsOverlap(wanted, b))) {
        skipped++;
        continue;
      }
      try {
        const eventId = await createCalendarEvent(token, {
          summary: `（仮）${ev.title}｜イツアウ`,
          start: { dateTime: jstIso(date, iv.start), timeZone: "Asia/Tokyo" },
          end: { dateTime: jstIso(date, iv.end), timeZone: "Asia/Tokyo" },
          extendedProperties: {
            private: { itsuau_event_id: id, itsuau_response_email: sess.email },
          },
          reminders: { useDefault: false },
        });
        liveOnGoogle.push({ date, eventId, start: iv.start, end: iv.end });
        createdCount++;
        await persist(); // 1件作るたびに反映(orphan防止)
      } catch (e) {
        console.warn("[tentative] createCalendarEvent failed:", e);
        skipped++;
      }
    }
  }

  // 5. 最終状態を確実に反映(persist のリトライ的位置付け)
  await persist();
  return NextResponse.json({ created: createdCount, skipped, removed });
}
