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

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export async function POST(req: Request) {
  const token = readCookie(req, "gcal_token");
  if (!token) return NextResponse.json({ skipped: true, reason: "no_cal_auth" });

  if (!sessionConfigured()) return NextResponse.json({ skipped: true, reason: "session_not_configured" });
  const sess = verifySession(readCookie(req, SESSION_COOKIE_NAME));
  if (!sess) return NextResponse.json({ skipped: true, reason: "no_login" });

  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });

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

  // 2. 既存の仮押さえを削除(編集時に古いものを始末)
  let existing: TentativeRecord[] = [];
  try {
    const existingRaw = await kvGet(TENTATIVE_KEY(id, sess.email));
    existing = existingRaw ? (JSON.parse(existingRaw) as TentativeRecord[]) : [];
  } catch {
    /* 取得失敗時は無視して進める */
  }
  let removed = 0;
  for (const e of existing) {
    try {
      await deleteCalendarEvent(token, e.eventId);
      removed++;
    } catch {
      /* 既に手動削除されている等。続行 */
    }
  }

  const dates = ev.config.candidateDates;
  if (dates.length === 0) {
    await kvSet(TENTATIVE_KEY(id, sess.email), JSON.stringify([])).catch(() => {});
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
  } catch {
    /* freebusy取得失敗 → 衝突チェックなしで進む(緩い) */
  }

  // 4. 仮押さえ作成
  const created: TentativeRecord[] = [];
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
        created.push({ date, eventId, start: iv.start, end: iv.end });
      } catch {
        skipped++;
      }
    }
  }

  // 5. マッピング保存
  try {
    await kvSet(TENTATIVE_KEY(id, sess.email), JSON.stringify(created));
  } catch {
    /* noop */
  }

  return NextResponse.json({ created: created.length, skipped, removed });
}
