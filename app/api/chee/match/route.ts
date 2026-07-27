// app/api/chee/match/route.ts
// チーゲーム オンライン「ランダムマッチ」。
//  POST { player } → 待機中の公開ルームがあれば入室、なければ新規作成して待機登録。
// 待機ルームは KV の chee:pub ポインタで1件だけ保持(低トラフィック前提の簡易マッチング)。
// KV 未設定なら 503。
import { NextRequest, NextResponse } from "next/server";
import { kvConfigured, createRoom, getRoom, updateRoom, type RoomState, type RoomPlayer } from "../../../chee/lib/room";
import { kvGet, kvSet } from "../../../chousei/lib/kv";

export const dynamic = "force-dynamic";

const PUB_KEY = "chee:pub";
const RANDOM_MAX = 4; // ランダムルームの上限人数

type NextBody = Omit<RoomState, "code" | "version" | "updatedAt">;

function bodyOf(room: RoomState, players: RoomPlayer[]): NextBody {
  return {
    hostId: room.hostId,
    phase: room.phase,
    mode: room.mode,
    random: room.random,
    players,
    turnIdx: room.turnIdx,
    turnCount: room.turnCount,
    deck: room.deck,
    deckPos: room.deckPos,
    outOrder: room.outOrder,
    settings: room.settings,
    turnStartedAt: room.turnStartedAt,
    usedWords: room.usedWords,
    requiredLen: room.requiredLen,
    log: room.log,
  };
}

export async function POST(req: NextRequest) {
  if (!kvConfigured()) return NextResponse.json({ error: "online_unavailable" }, { status: 503 });
  let body: { player?: RoomPlayer };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const player = body.player;
  if (!player || typeof player.id !== "string" || typeof player.name !== "string" || !player.name.trim()) {
    return NextResponse.json({ error: "bad_player" }, { status: 400 });
  }

  // 待機中の公開ルームを探して入室
  const waiting = (await kvGet(PUB_KEY)) || "";
  if (waiting) {
    const room = await getRoom(waiting);
    if (
      room &&
      room.random &&
      room.phase === "lobby" &&
      room.players.length < RANDOM_MAX &&
      !room.players.some((p) => p.id === player.id)
    ) {
      const res = await updateRoom(room.code, room.version, bodyOf(room, [...room.players, player]));
      if (res.ok) {
        // 上限に達したら公開枠から外す。まだ空きがあれば次の人も入れるよう残す
        await kvSet(PUB_KEY, res.state.players.length >= RANDOM_MAX ? "" : room.code);
        return NextResponse.json({ state: res.state, joined: true });
      }
      // 競合したら新規作成にフォールバック
    }
  }

  // 新規の公開ルームを作成して待機登録
  const init: NextBody = {
    hostId: player.id,
    phase: "lobby",
    mode: "text",
    random: true,
    players: [player],
    turnIdx: 0,
    turnCount: 0,
    deck: [],
    deckPos: 0,
    outOrder: [],
    settings: { timerSec: 30, shibariFreq: 0, livesSetting: 1 },
    turnStartedAt: 0,
    usedWords: [],
    requiredLen: 0,
    log: [],
  };
  const state = await createRoom(init);
  await kvSet(PUB_KEY, state.code);
  return NextResponse.json({ state, host: true });
}
