// app/api/chee/user/route.ts
// チーゲーム 匿名の通算戦績(端末IDごと・ログインなし・PIIなし)。
//  GET  ?uid=... → { stats:{ name, wins, games } }
//  POST { uid, name, won } → games+1(wonならwins+1)して保存(長期保持で"ずっと残る")
// KV 未設定なら 503。
import { NextRequest, NextResponse } from "next/server";
import { kvConfigured } from "../../../chee/lib/room";
import { kvGet, kvSet } from "../../../chousei/lib/kv";

export const dynamic = "force-dynamic";

const YEAR2 = 60 * 60 * 24 * 730; // 約2年保持
const key = (uid: string) => `chee:user:${uid}`;

type Stats = { name: string; wins: number; games: number; updatedAt: number };

function parse(raw: string | null): Stats {
  if (raw) {
    try {
      const s = JSON.parse(raw) as Partial<Stats>;
      return {
        name: typeof s.name === "string" ? s.name : "",
        wins: typeof s.wins === "number" ? s.wins : 0,
        games: typeof s.games === "number" ? s.games : 0,
        updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : 0,
      };
    } catch {
      // 壊れていたらゼロから
    }
  }
  return { name: "", wins: 0, games: 0, updatedAt: 0 };
}

export async function GET(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ error: "online_unavailable" }, { status: 503 });
  const uid = (new URL(req.url).searchParams.get("uid") || "").slice(0, 64);
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
  return NextResponse.json({ stats: parse(await kvGet(key(uid))) });
}

export async function POST(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ error: "online_unavailable" }, { status: 503 });
  let body: { uid?: string; name?: string; won?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const uid = (body.uid || "").slice(0, 64);
  if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });
  const cur = parse(await kvGet(key(uid)));
  const next: Stats = {
    name: (body.name || cur.name || "").slice(0, 12),
    wins: cur.wins + (body.won ? 1 : 0),
    games: cur.games + 1,
    updatedAt: Date.now(),
  };
  await kvSet(key(uid), JSON.stringify(next), YEAR2);
  return NextResponse.json({ stats: next });
}
