// app/api/chee/user/route.ts
// チーゲーム 匿名の通算戦績(端末IDごと・ログインなし・PIIなし)＋通算勝利の全体ランキング。
//  GET  ?uid=...   → { stats:{ name, wins, games } }
//  GET  ?board=1   → { board:[{ name, wins }] } 通算勝利の上位(部屋を跨いだ全体)
//  POST { uid, name, won } → games+1(wonならwins+1)して保存＋全体ランキングを更新
// KV 未設定なら 503。
import { NextRequest, NextResponse } from "next/server";
import { kvConfigured } from "../../../chee/lib/room";
import { kvGet, kvSet } from "../../../chousei/lib/kv";

export const dynamic = "force-dynamic";

const YEAR2 = 60 * 60 * 24 * 730; // 約2年保持
const key = (uid: string) => `chee:user:${uid}`;
const BOARD_KEY = "chee:board"; // 通算勝利の全体ランキング(uidで重複排除)

type Stats = { name: string; wins: number; games: number; updatedAt: number };
type BoardEntry = { uid: string; name: string; wins: number };

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

function parseBoard(raw: string | null): BoardEntry[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    if (!Array.isArray(a)) return [];
    return a.filter((e) => e && typeof e.uid === "string" && typeof e.name === "string" && typeof e.wins === "number");
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ error: "online_unavailable" }, { status: 503 });
  const params = new URL(req.url).searchParams;
  if (params.get("board")) {
    const board = parseBoard(await kvGet(BOARD_KEY))
      .filter((e) => e.wins > 0)
      .slice(0, 10)
      .map((e) => ({ name: e.name, wins: e.wins }));
    return NextResponse.json({ board });
  }
  const uid = (params.get("uid") || "").slice(0, 64);
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

  // 全体ランキング更新(同じuidは1件に集約・勝利数降順で上位50保持)
  const board = parseBoard(await kvGet(BOARD_KEY)).filter((e) => e.uid !== uid);
  board.push({ uid, name: next.name, wins: next.wins });
  board.sort((a, b) => b.wins - a.wins);
  await kvSet(BOARD_KEY, JSON.stringify(board.slice(0, 50)), YEAR2);

  return NextResponse.json({ stats: next });
}
