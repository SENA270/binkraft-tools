// 日程調整: 主催者が最終日時を確定/解除する。イベントレコードに confirmed を保存。
import { NextResponse } from "next/server";
import { kvGet, kvSet, kvConfigured } from "../../../chousei/lib/kv";

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
  let body: { id?: string; confirmed?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { id, confirmed } = body;
  if (!id || typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  if (confirmed !== null && !validSlot(confirmed)) {
    return NextResponse.json({ error: "invalid confirmed" }, { status: 400 });
  }
  try {
    const raw = await kvGet(KEY(id));
    if (!raw) return NextResponse.json({ error: "event_not_found" }, { status: 404 });
    const ev = JSON.parse(raw) as Record<string, unknown>;
    ev.confirmed = confirmed; // null で解除
    await kvSet(KEY(id), JSON.stringify(ev));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}
