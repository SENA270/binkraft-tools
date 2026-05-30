// イベントごとのマスター鍵を照合する。鍵自体は GET /event で返さないので、ここでだけ判定する。
import { NextResponse } from "next/server";
import { kvGet, kvConfigured } from "../../../chousei/lib/kv";
import { adminKeyMatches } from "../../../chousei/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = (id: string) => `chousei:event:${id}`;

export async function POST(req: Request) {
  if (!kvConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  let body: { id?: string; k?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { id, k } = body;
  if (!id || !k) return NextResponse.json({ ok: false });
  try {
    const raw = await kvGet(KEY(id));
    if (!raw) return NextResponse.json({ ok: false });
    const ev = JSON.parse(raw) as { adminKey?: string };
    return NextResponse.json({ ok: adminKeyMatches(ev.adminKey, k) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
