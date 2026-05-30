// 日程調整: イベント設定の保存/取得(サーバ共有用)。
import { NextResponse } from "next/server";
import { kvGet, kvSet, kvConfigured } from "../../../chousei/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = (id: string) => `chousei:event:${id}`;

export async function GET(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const raw = await kvGet(KEY(id));
    if (!raw) return NextResponse.json({ event: null });
    const ev = JSON.parse(raw) as Record<string, unknown>;
    // マスター鍵はクライアントに渡さない(/verify-master でのみ照合)。
    if ("adminKey" in ev) delete ev.adminKey;
    return NextResponse.json({ event: ev });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ error: "kv_unconfigured" }, { status: 503 });
  let body: { id?: string } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body?.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    await kvSet(KEY(body.id), JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "kv_error" }, { status: 502 });
  }
}
