// app/chee/lib/room.ts
// チーゲーム オンライン対戦の「同期ルーム」サーバ保存。
// 設計: サーバは状態(JSON)の置き場に徹する“薄い”ストア。ゲームのロジックはクライアントが持ち、
// 行動した端末が新しい state を version 付きで PUT、他端末はポーリングで取得して画面を同期する。
// 判定(セーフ/アウト)は人間(通話/対面)が行い、その結果を state に反映する = ゲームの本質を維持。
// 保存は既存の Upstash Redis(KV)を流用。未設定なら kvConfigured()=false。
import { kvGet, kvSet, kvDel, kvConfigured } from "../../chousei/lib/kv";

export { kvConfigured };

export type RoomPlayer = { id: string; name: string; lives: number; avatar?: string; timeBankMs?: number };

export type RoomState = {
  code: string;
  hostId: string;
  phase: "lobby" | "play" | "result";
  mode?: "voice" | "text"; // text=各自が答えを打ち込み自動判定 / voice=通話しながら人が判定
  players: RoomPlayer[];
  turnIdx: number;
  turnCount: number;
  deck: { text: string; tag: string }[];
  deckPos: number;
  outOrder: string[]; // 脱落した player.id を順に
  settings: { timerSec: number; shibariFreq: number; livesSetting: number };
  turnStartedAt: number; // タイマー同期用(epoch ms)。ターン開始でリセット
  usedWords?: string[]; // text mode: 既出語(重複判定・正規化済み)
  requiredLen?: number; // text mode(早撃ち): 現手番が返すべき文字数(前の人が指定)
  log?: { name: string; word: string; ok: boolean }[]; // text mode: 実況フィード(直近のみ)
  version: number; // 楽観ロック
  updatedAt: number;
};

const key = (code: string) => `chee:room:${code}`;

/** 紛らわしい文字を除いた4桁ルームコード */
export function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O/1/I を除外
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const raw = await kvGet(key(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    return null;
  }
}

const ROOM_TTL_SEC = 60 * 60 * 6; // 6時間で自動失効(遊び終わったルーム・不適切な入力を長期保持しない)

export async function saveRoom(state: RoomState): Promise<void> {
  await kvSet(key(state.code), JSON.stringify(state), ROOM_TTL_SEC);
}

export async function deleteRoom(code: string): Promise<void> {
  await kvDel(key(code));
}

/** 未使用コードを引いて新規ルームを作成。 */
export async function createRoom(init: Omit<RoomState, "code" | "version" | "updatedAt">): Promise<RoomState> {
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    if (!(await getRoom(code))) break;
    code = genCode();
  }
  const state: RoomState = { ...init, code, version: 1, updatedAt: Date.now() };
  await saveRoom(state);
  return state;
}

/**
 * 楽観ロック更新。expectedVersion が現在と一致する時だけ next を保存し version+1。
 * 競合時は { ok:false, current } を返す(呼び出し側で再取得→やり直し)。
 */
export async function updateRoom(
  code: string,
  expectedVersion: number,
  next: Omit<RoomState, "code" | "version" | "updatedAt">
): Promise<{ ok: true; state: RoomState } | { ok: false; current: RoomState | null }> {
  const current = await getRoom(code);
  if (!current) return { ok: false, current: null };
  if (current.version !== expectedVersion) return { ok: false, current };
  const state: RoomState = { ...next, code, version: current.version + 1, updatedAt: Date.now() };
  await saveRoom(state);
  return { ok: true, state };
}
