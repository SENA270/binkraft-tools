// app/api/masu/board/route.ts
// 100マス計算のランキング(匿名・端末名のみ・ログインなし)。
//  GET  ?mode=add|mul → { board:[{name,ms,at}] } 上位10(速い順)
//  POST { mode, name, ms } → 記録を追加して上位20保存、上位10を返す
// KV 未設定なら空配列(ローカル自己ベストのみで動作)。
import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, kvConfigured } from "../../../chousei/lib/kv";

export const dynamic = "force-dynamic";

const YEAR2 = 60 * 60 * 24 * 730;
type Entry = { name: string; ms: number; at: number };
const key = (mode: string) => `masu:board:${mode === "mul" ? "mul" : "add"}`;

function parse(raw: string | null): Entry[] {
  if (!raw) return [];
  try {
    const a = JSON.parse(raw);
    if (!Array.isArray(a)) return [];
    return a.filter((e) => e && typeof e.name === "string" && typeof e.ms === "number");
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ board: [] });
  const mode = new URL(req.url).searchParams.get("mode") || "add";
  const board = parse(await kvGet(key(mode))).slice(0, 10);
  return NextResponse.json({ board });
}

export async function POST(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ board: [] });
  let body: { mode?: string; name?: string; ms?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const mode = body.mode === "mul" ? "mul" : "add";
  const name = String(body.name || "ゲスト").slice(0, 12);
  const ms = Number(body.ms);
  if (!ms || ms <= 0 || ms > 3_600_000) return NextResponse.json({ error: "bad_ms" }, { status: 400 });
  const cur = parse(await kvGet(key(mode)));
  cur.push({ name, ms, at: Date.now() });
  cur.sort((a, b) => a.ms - b.ms);
  const top = cur.slice(0, 20);
  await kvSet(key(mode), JSON.stringify(top), YEAR2);
  return NextResponse.json({ board: top.slice(0, 10) });
}
