// 日程調整: 主催者が最終日時を確定/解除する。イベントレコードに confirmed を保存。
// 認可: adminKey 必須。stored.adminKey と一致しないリクエストは 401。
//   (Stage1.5.2: 認可漏れ修正前は ID だけで誰でも確定変更できる脆弱性があった)
import { NextResponse } from "next/server";
import { kvGet, kvSet, kvConfigured } from "../../../chousei/lib/kv";
import { adminKeyMatches } from "../../../chousei/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = (id: string) => `chousei:event:${id}`;

type ConfirmedSlot = { date: string; start: number; end: number };

function validSlot(v: unknown): v is ConfirmedSlot {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.date === "string" && typeof s.start === "number" && typeof s.end === "number" && s.end > s.start;
}

export async function POST(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });
  let body: { id?: string; confirmed?: unknown; adminKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { id, confirmed, adminKey } = body;
  if (!id || typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  if (confirmed !== null && !validSlot(confirmed)) {
    return NextResponse.json({ error: "invalid confirmed" }, { status: 400 });
  }
  try {
    const raw = await kvGet(KEY(id));
    if (!raw) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
    const ev = JSON.parse(raw) as Record<string, unknown>;
    // 認可: イベントの adminKey と一致した場合のみ確定変更を許可。
    // 旧データ(adminKey 無し) は localStorage フォールバック由来のごく稀ケース。
    // ここでは「サーバに鍵が無い=持ち主が誰か未確定」とみなし 401(他人による上書き防止)。
    const storedKey = typeof ev.adminKey === "string" ? ev.adminKey : undefined;
    if (!adminKeyMatches(storedKey, adminKey)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    ev.confirmed = confirmed; // null で解除
    await kvSet(KEY(id), JSON.stringify(ev));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}
