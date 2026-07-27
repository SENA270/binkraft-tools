// app/api/chee/room/route.ts
// チーゲーム オンライン対戦ルームの同期API。
//  GET  ?code=XXXX            → 現在のルーム状態(ポーリング用)
//  POST { init }              → ルーム新規作成 → { state }（code を含む）
//  PUT  { code, version, next } → 楽観ロック更新（version 不一致は 409 + 現在値）
// KV 未設定なら 503（クライアントは「オンライン非対応」表示にフォールバック）。
import { NextRequest, NextResponse } from "next/server";
import { kvConfigured, createRoom, getRoom, updateRoom, type RoomState } from "../../../chee/lib/room";

export const dynamic = "force-dynamic";

type InitBody = Omit<RoomState, "code" | "version" | "updatedAt">;

function validPlayers(p: unknown): boolean {
  return Array.isArray(p) && p.length <= 8 && p.every((x) => x && typeof (x as RoomState["players"][0]).id === "string");
}

export async function GET(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ error: "online_unavailable" }, { status: 503 });
  const code = (new URL(req.url).searchParams.get("code") || "").toUpperCase().slice(0, 6);
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
  const state = await getRoom(code);
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ state });
}

export async function POST(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ error: "online_unavailable" }, { status: 503 });
  let body: { init?: InitBody };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const init = body.init;
  if (!init || !validPlayers(init.players) || typeof init.hostId !== "string") {
    return NextResponse.json({ error: "bad_init" }, { status: 400 });
  }
  const state = await createRoom(init);
  return NextResponse.json({ state });
}

export async function PUT(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ error: "online_unavailable" }, { status: 503 });
  let body: { code?: string; version?: number; next?: InitBody };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const { code, version, next } = body;
  if (!code || typeof version !== "number" || !next || !validPlayers(next.players)) {
    return NextResponse.json({ error: "bad_update" }, { status: 400 });
  }
  const res = await updateRoom(code.toUpperCase(), version, next);
  if (!res.ok) return NextResponse.json({ error: "conflict", current: res.current }, { status: 409 });
  return NextResponse.json({ state: res.state });
}
