// イベントごとのマスター鍵を照合する。鍵自体は GET /event で返さないので、ここでだけ判定する。
// レート制限: IP+event-id 単位で 1分10件(マスター鍵総当たり対策。本来 128bit で総当たり不可能だが多層防御)。
import { NextResponse } from "next/server";
import { kvGet, kvConfigured } from "../../../chousei/lib/kv";
import { adminKeyMatches } from "../../../chousei/lib/storage";
import { rateLimit, clientIp, rateLimitedResponse } from "../../../chousei/lib/ratelimit";

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
  // 同一 IP × 同一 event-id への試行を制限(オフラインで鍵をブレークしない限り意味は薄いが多層防御)。
  const rl = await rateLimit("verify-master", `${clientIp(req)}:${id}`, 10, 60_000);
  if (!rl.ok) return rateLimitedResponse(rl);
  try {
    const raw = await kvGet(KEY(id));
    if (!raw) return NextResponse.json({ ok: false });
    const ev = JSON.parse(raw) as { adminKey?: string };
    return NextResponse.json({ ok: adminKeyMatches(ev.adminKey, k) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
