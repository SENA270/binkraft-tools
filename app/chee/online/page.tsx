"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * チーゲーム — オンライン(テキスト)モード
 *
 * 離れた友達とルームコードで対戦。各自が「◯◯チー」を打ち込み、
 * 「チーで終わる＋既出でない」を自動判定。時間切れ/詰まりでライフを失い、最後の1人が優勝。
 * サーバ(既存の /api/chee/room + KV)は状態(JSON)の置き場に徹し、各端末はポーリングで同期する。
 *
 * ※ 対面(声で遊ぶ演技しばり版)は /chee のまま。こちらはテキストなので演技しばりは扱わない。
 */

type RoomPlayer = { id: string; name: string; lives: number; avatar?: string };
type RoomState = {
  code: string;
  hostId: string;
  phase: "lobby" | "play" | "result";
  mode?: "voice" | "text";
  players: RoomPlayer[];
  turnIdx: number;
  turnCount: number;
  deck: { text: string; tag: string }[];
  deckPos: number;
  outOrder: string[];
  settings: { timerSec: number; shibariFreq: number; livesSetting: number };
  turnStartedAt: number;
  usedWords?: string[];
  log?: { name: string; word: string; ok: boolean }[];
  version: number;
  updatedAt: number;
};
type NextState = Omit<RoomState, "code" | "version" | "updatedAt">;

const AVATARS = ["🦊", "🐱", "🐰", "🐼", "🐸", "🐧", "🦁", "🐯", "🐨", "🐵", "🐮", "🦄", "🐙", "🐢", "🦖", "🐝"];

const TIMER_OPTIONS = [
  { label: "20秒", value: 20 },
  { label: "30秒", value: 30 },
  { label: "45秒", value: 45 },
  { label: "なし", value: 0 },
];
const LIVES_OPTIONS = [
  { label: "サドンデス", value: 1 },
  { label: "ライフ2", value: 2 },
  { label: "ライフ3", value: 3 },
];

// 打ち込み文字の簡易NGワード除け(中高生に見えるため)。完全ではないが露骨表現を弾く。
const NG_WORDS = ["しね", "死ね", "ころす", "殺す", "きもい", "うざい", "ぶす", "デブ"];

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
function normalizeWord(w: string): string {
  return w.trim().replace(/\s+/g, "").toLowerCase();
}
function endsWithChee(w: string): boolean {
  return /(チー|ちー)$/.test(w.trim());
}
function hasNg(w: string): boolean {
  const n = w.replace(/\s+/g, "");
  return NG_WORDS.some((ng) => n.includes(ng));
}
function pickAvatar(existing: RoomPlayer[]): string {
  const used = new Set(existing.map((p) => p.avatar));
  return AVATARS.find((a) => !used.has(a)) || AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
function nextAliveIdx(players: RoomPlayer[], from: number): number {
  let i = from;
  for (let n = 0; n < players.length; n++) {
    i = (i + 1) % players.length;
    if (players[i].lives > 0) return i;
  }
  return from;
}

function advanceSafe(s: RoomState, word: string): NextState {
  const used = [...(s.usedWords || []), normalizeWord(word)];
  const log = [...(s.log || []), { name: s.players[s.turnIdx].name, word, ok: true }].slice(-24);
  return {
    ...s,
    usedWords: used,
    log,
    turnIdx: nextAliveIdx(s.players, s.turnIdx),
    turnCount: s.turnCount + 1,
    turnStartedAt: Date.now(),
  };
}

function advanceOut(s: RoomState, reason: string): NextState {
  const cur = s.players[s.turnIdx];
  const players = s.players.map((p, i) => (i === s.turnIdx ? { ...p, lives: p.lives - 1 } : p));
  const nowDead = players[s.turnIdx].lives <= 0;
  const outOrder = nowDead ? [...s.outOrder, cur.id] : s.outOrder;
  const log = [...(s.log || []), { name: cur.name, word: reason, ok: false }].slice(-24);
  const alive = players.filter((p) => p.lives > 0).length;
  if (nowDead && alive <= 1) {
    return { ...s, players, outOrder, log, phase: "result" };
  }
  return {
    ...s,
    players,
    outOrder,
    log,
    turnIdx: nextAliveIdx(players, s.turnIdx),
    turnCount: s.turnCount + 1,
    turnStartedAt: Date.now(),
  };
}

export default function CheeOnline() {
  const [myId] = useState(newId);
  const [myName, setMyName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [timerSec, setTimerSec] = useState(30);
  const [livesSetting, setLivesSetting] = useState(2);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const roomRef = useRef<RoomState | null>(null);

  const setRoomBoth = useCallback((s: RoomState | null) => {
    roomRef.current = s;
    setRoom(s);
  }, []);

  // ---- サーバ同期 ----
  const applyMutation = useCallback(
    async (fn: (s: RoomState) => NextState | null) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const cur = roomRef.current;
        if (!cur) return;
        const next = fn(cur);
        if (!next) return;
        const res = await fetch("/api/chee/room", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: cur.code, version: cur.version, next }),
        });
        if (res.ok) {
          const j = await res.json();
          setRoomBoth(j.state);
          return;
        }
        if (res.status === 409) {
          const j = await res.json();
          if (j.current) setRoomBoth(j.current);
          continue; // 最新でやり直し
        }
        return; // その他エラーは諦める(次のポーリングで復帰)
      }
    },
    [setRoomBoth]
  );

  // ポーリング(ロビー・対戦・結果すべて)
  useEffect(() => {
    if (!room?.code) return;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/chee/room?code=${room.code}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setRoomBoth(j.state);
        }
      } catch {
        // 一時的な通信エラーは無視
      }
    }, 1500);
    return () => clearInterval(id);
  }, [room?.code, setRoomBoth]);

  // 1秒ごとの時計 + 時間切れの自動アウト(どの端末からでも試行・楽観ロックで二重防止)
  const timeoutAdvance = useCallback(() => {
    applyMutation((s) => {
      if (s.phase !== "play" || s.settings.timerSec <= 0) return null;
      if ((Date.now() - s.turnStartedAt) / 1000 < s.settings.timerSec + 1) return null;
      return advanceOut(s, "時間切れ");
    });
  }, [applyMutation]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowTick(Date.now());
      const cur = roomRef.current;
      if (cur && cur.phase === "play" && cur.settings.timerSec > 0) {
        if ((Date.now() - cur.turnStartedAt) / 1000 >= cur.settings.timerSec + 1) timeoutAdvance();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timeoutAdvance]);

  // ---- アクション ----
  const create = async () => {
    setErr("");
    if (hasNg(myName)) {
      setErr("その名前は使えません");
      return;
    }
    setBusy(true);
    try {
      const me: RoomPlayer = { id: myId, name: myName.trim() || "ホスト", lives: livesSetting, avatar: AVATARS[0] };
      const init: NextState = {
        hostId: myId,
        phase: "lobby",
        mode: "text",
        players: [me],
        turnIdx: 0,
        turnCount: 0,
        deck: [],
        deckPos: 0,
        outOrder: [],
        settings: { timerSec, shibariFreq: 0, livesSetting },
        turnStartedAt: 0,
        usedWords: [],
        log: [],
      };
      const r = await fetch("/api/chee/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init }),
      });
      if (r.status === 503) {
        setErr("いまオンライン機能が使えません(サーバ設定待ち)。対面版で遊んでね。");
        return;
      }
      if (!r.ok) {
        setErr("ルーム作成に失敗しました");
        return;
      }
      const j = await r.json();
      setRoomBoth(j.state);
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setErr("");
    if (hasNg(myName)) {
      setErr("その名前は使えません");
      return;
    }
    const code = codeInput.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!code) {
      setErr("ルームコードを入れてね");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/chee/room?code=${code}`, { cache: "no-store" });
      if (r.status === 503) {
        setErr("いまオンライン機能が使えません(サーバ設定待ち)");
        return;
      }
      if (r.status === 404) {
        setErr("そのルームは見つかりません");
        return;
      }
      if (!r.ok) {
        setErr("参加に失敗しました");
        return;
      }
      const j = await r.json();
      const s: RoomState = j.state;
      if (s.phase !== "lobby") {
        setErr("このルームはもう始まっています");
        return;
      }
      if (s.players.length >= 8) {
        setErr("満員です(最大8人)");
        return;
      }
      setRoomBoth(s);
      const me: RoomPlayer = {
        id: myId,
        name: myName.trim() || "ゲスト",
        lives: s.settings.livesSetting,
        avatar: pickAvatar(s.players),
      };
      await applyMutation((cur) =>
        cur.players.some((p) => p.id === myId) ? cur : { ...cur, players: [...cur.players, me] }
      );
    } finally {
      setBusy(false);
    }
  };

  const startGame = () =>
    applyMutation((s) => {
      if (s.players.length < 2) return null;
      const players = s.players.map((p) => ({ ...p, lives: s.settings.livesSetting }));
      return {
        ...s,
        players,
        phase: "play",
        turnIdx: 0,
        turnCount: 0,
        outOrder: [],
        usedWords: [],
        log: [],
        turnStartedAt: Date.now(),
      };
    });

  const submit = () => {
    const w = input.trim();
    if (!w) return;
    if (!endsWithChee(w)) {
      setErr("「チー」で終わる言葉にしてね");
      return;
    }
    if (hasNg(w)) {
      setErr("その言葉はナシで！");
      return;
    }
    const norm = normalizeWord(w);
    if ((roomRef.current?.usedWords || []).includes(norm)) {
      setErr("もう出た言葉！");
      return;
    }
    setErr("");
    setInput("");
    applyMutation((s) => advanceSafe(s, w));
  };

  const declareOut = () => applyMutation((s) => advanceOut(s, "詰まった"));

  const leave = () => setRoomBoth(null);
  const backToLobby = () =>
    applyMutation((s) => ({ ...s, phase: "lobby", log: [], usedWords: [] }));

  // ホスト操作(モデレーション: 荒らし・AFK・不適切入力への対処)
  const dissolve = async () => {
    const cur = roomRef.current;
    if (cur) {
      try {
        await fetch(`/api/chee/room?code=${cur.code}`, { method: "DELETE" });
      } catch {
        // 削除失敗でもローカルは離脱する
      }
    }
    leave();
  };
  const kickInLobby = (id: string) =>
    applyMutation((s) =>
      s.hostId === myId && s.phase === "lobby" && id !== s.hostId
        ? { ...s, players: s.players.filter((p) => p.id !== id) }
        : null
    );
  const skipCurrent = () =>
    applyMutation((s) => (s.hostId === myId && s.phase === "play" ? advanceOut(s, "スキップ") : null));

  // ---- 派生 ----
  const isHost = room?.hostId === myId;
  const myTurn = !!room && room.phase === "play" && room.players[room.turnIdx]?.id === myId;
  const timeLeft =
    room && room.phase === "play" && room.settings.timerSec > 0
      ? Math.max(0, Math.ceil(room.settings.timerSec - (nowTick - room.turnStartedAt) / 1000))
      : null;
  const aliveCount = room?.players.filter((p) => p.lives > 0).length ?? 0;
  const winner = room?.players.find((p) => p.lives > 0);
  const nameById = (id: string) => room?.players.find((p) => p.id === id)?.name ?? "?";
  const ranking =
    room && winner
      ? [winner.name, ...[...room.outOrder].reverse().map(nameById)]
      : room
        ? [...room.outOrder].reverse().map(nameById)
        : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Link href="/chee" className="text-xs text-slate-400 hover:text-slate-200">
            ← 対面版(声で遊ぶ)へ
          </Link>
          {room && (
            <button onClick={leave} className="text-xs text-slate-500 underline underline-offset-2">
              退出
            </button>
          )}
        </div>

        <h1 className="text-center mb-1">
          <span className="text-3xl font-black tracking-wide bg-gradient-to-r from-sky-400 to-emerald-300 bg-clip-text text-transparent">
            チーゲーム オンライン
          </span>
        </h1>
        <p className="text-center text-xs text-slate-400 mb-6">
          離れた友達と、テキストで「チー」対戦 🀄
        </p>

        {err && (
          <div className="mb-4 rounded-lg bg-red-950/60 border border-red-800 px-3 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        {/* ===== ホーム(作成/参加) ===== */}
        {!room && (
          <div className="space-y-5">
            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-3 text-slate-300">あなたの名前</h2>
              <input
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="なまえ (任意)"
                maxLength={12}
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </section>

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-slate-300">ルームを作る (ホスト)</h2>
              <div>
                <p className="text-[11px] text-slate-500 mb-1">制限時間 / ターン</p>
                <div className="flex gap-2">
                  {TIMER_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setTimerSec(o.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                        timerSec === o.value ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 mb-1">ライフ</p>
                <div className="flex gap-2">
                  {LIVES_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setLivesSetting(o.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                        livesSetting === o.value ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={create}
                disabled={busy}
                className="w-full py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 active:scale-[0.98] transition disabled:opacity-50"
              >
                ルームを作る
              </button>
            </section>

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-slate-300">コードで参加</h2>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") join();
                  }}
                  placeholder="ABCD"
                  maxLength={6}
                  className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-lg font-black tracking-widest text-center placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={join}
                  disabled={busy}
                  className="px-5 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold disabled:opacity-50"
                >
                  参加
                </button>
              </div>
            </section>

            <section className="pt-4 border-t border-slate-800 text-sm text-slate-400 leading-relaxed space-y-2">
              <h2 className="text-slate-200 font-bold">オンライン版の遊び方</h2>
              <p>
                ホストが「ルームを作る」→ 出た<b className="text-emerald-300">4文字コード</b>を友達に共有 → みんなが「コードで参加」。
                順番に「◯◯<b className="text-emerald-300">チー</b>」を打ち込みます。「チーで終わる・前と被らない」だけが自動判定。
                時間切れ・詰まりでライフが減り、最後の1人が優勝です。
              </p>
            </section>
          </div>
        )}

        {/* ===== ロビー ===== */}
        {room && room.phase === "lobby" && (
          <div className="space-y-5">
            <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 mb-1">ルームコード (友達に共有)</p>
              <p className="text-4xl font-black tracking-[0.3em] text-emerald-300">{room.code}</p>
              <button
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(room.code);
                  } catch {
                    // コピー不可でもコード自体は見えている
                  }
                }}
                className="mt-2 text-[11px] text-slate-400 underline underline-offset-2"
              >
                コードをコピー
              </button>
            </section>

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-3 text-slate-300">参加者 ({room.players.length}人)</h2>
              <div className="flex flex-wrap gap-2">
                {room.players.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-slate-800 text-slate-200"
                  >
                    {p.avatar} {p.name}
                    {p.id === room.hostId ? " 👑" : ""}
                    {isHost && p.id !== room.hostId && (
                      <button
                        onClick={() => kickInLobby(p.id)}
                        aria-label={`${p.name}を退出させる`}
                        className="ml-1 text-[11px] text-red-300 hover:text-red-200"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">タイマー{room.settings.timerSec || "なし"} ・ ライフ{room.settings.livesSetting}</p>
            </section>

            {isHost ? (
              <button
                onClick={startGame}
                disabled={room.players.length < 2}
                className="w-full py-4 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 active:scale-[0.98] transition disabled:opacity-40"
              >
                {room.players.length < 2 ? "あと1人待ち…" : "ゲーム開始 🀄"}
              </button>
            ) : (
              <p className="text-center text-sm text-slate-400 py-4">ホストの開始を待っています…</p>
            )}
            {isHost && (
              <button onClick={dissolve} className="w-full text-xs text-slate-500 underline underline-offset-2">
                部屋を解散する(データ削除)
              </button>
            )}
          </div>
        )}

        {/* ===== 対戦中 ===== */}
        {room && room.phase === "play" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>ターン {room.turnCount + 1} ・ 残り {aliveCount}人</span>
              <span>既出 {room.usedWords?.length ?? 0} 語</span>
            </div>

            <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 mb-1">いまの番</p>
              <p className="text-3xl font-black text-emerald-300 mb-1">
                {room.players[room.turnIdx]?.avatar} {room.players[room.turnIdx]?.name}
                {myTurn ? " (あなた!)" : ""}
              </p>
              {room.settings.livesSetting > 1 && (
                <p className="text-sm mb-1">{"❤️".repeat(Math.max(room.players[room.turnIdx]?.lives ?? 0, 0))}</p>
              )}
              {timeLeft !== null && (
                <p className={`text-5xl font-black tabular-nums ${timeLeft <= 3 ? "text-amber-300" : "text-slate-200"}`}>
                  {timeLeft}
                </p>
              )}
            </section>

            {myTurn ? (
              <section className="bg-gradient-to-r from-emerald-950 to-teal-950 rounded-2xl p-4 border border-emerald-800 space-y-3">
                <p className="text-sm font-bold text-emerald-100">あなたの番！「◯◯チー」を打ち込もう</p>
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                    }}
                    autoFocus
                    placeholder="例: ライチー"
                    maxLength={20}
                    className="flex-1 bg-slate-900 rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button onClick={submit} className="px-5 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                    言う！
                  </button>
                </div>
                <button
                  onClick={declareOut}
                  className="w-full py-2 rounded-lg bg-red-500/80 text-white text-sm font-bold active:scale-[0.98]"
                >
                  詰まった…(アウト) 💀
                </button>
              </section>
            ) : (
              <p className="text-center text-sm text-slate-400 py-2">
                {room.players[room.turnIdx]?.name} さんが入力中…
              </p>
            )}

            {/* 実況フィード */}
            <section className="bg-slate-900 rounded-2xl p-3 border border-slate-800">
              <div className="flex flex-col-reverse gap-1 max-h-48 overflow-y-auto">
                {(room.log || []).map((e, i) => (
                  <p key={i} className={`text-sm ${e.ok ? "text-slate-300" : "text-red-300"}`}>
                    <span className="text-slate-500">{e.name}:</span>{" "}
                    {e.ok ? `「${e.word}」✓` : `${e.word} ✗`}
                  </p>
                ))}
                {(room.log || []).length === 0 && <p className="text-xs text-slate-600">まだ発言がありません</p>}
              </div>
            </section>

            <div className="flex flex-wrap gap-1.5 justify-center">
              {room.players.map((p) => (
                <span
                  key={p.id}
                  className={`text-[11px] px-2 py-1 rounded-full ${
                    p.lives <= 0
                      ? "bg-slate-900 text-slate-600 line-through"
                      : p.id === room.players[room.turnIdx]?.id
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {p.avatar} {p.name}
                  {room.settings.livesSetting > 1 && p.lives > 0 ? ` ${"❤️".repeat(p.lives)}` : ""}
                </span>
              ))}
            </div>

            {isHost && (
              <div className="flex gap-4 justify-center pt-1">
                <button onClick={skipCurrent} className="text-[11px] text-slate-400 underline underline-offset-2">
                  現在の人をスキップ(進まない時)
                </button>
                <button onClick={dissolve} className="text-[11px] text-red-300 underline underline-offset-2">
                  部屋を解散
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== 結果 ===== */}
        {room && room.phase === "result" && (
          <div className="space-y-5 text-center">
            <section className="bg-gradient-to-b from-emerald-950 to-slate-900 rounded-2xl p-8 border border-emerald-800">
              <p className="text-5xl mb-3">🏆</p>
              <p className="text-xs text-emerald-300 mb-1">優勝 — 本日のチーマスター</p>
              <p className="text-3xl font-black text-emerald-200">
                {winner?.avatar} {winner?.name || "—"}
              </p>
              <p className="mt-3 text-xs text-slate-400">全 {room.turnCount + 1} ターン ・ 既出 {room.usedWords?.length ?? 0} 語</p>
            </section>

            {ranking.length > 1 && (
              <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-left">
                <h2 className="text-xs font-bold text-slate-400 mb-2 text-center">最終順位</h2>
                <ol className="space-y-1">
                  {ranking.map((name, i) => (
                    <li key={`${name}-${i}`} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-center">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}位`}</span>
                      <span className={i === 0 ? "font-bold text-emerald-200" : "text-slate-300"}>{name}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {isHost ? (
              <button
                onClick={startGame}
                className="w-full py-3 rounded-2xl text-sm font-bold bg-emerald-500 text-slate-950 active:scale-[0.97] transition"
              >
                同じメンバーでもう一回
              </button>
            ) : (
              <button
                onClick={backToLobby}
                className="w-full py-3 rounded-2xl text-sm font-bold bg-slate-800 text-slate-300 active:scale-[0.97] transition"
              >
                ロビーに戻る
              </button>
            )}
            <button onClick={leave} className="text-xs text-slate-500 underline underline-offset-2">
              退出する
            </button>
            {isHost && (
              <button onClick={dissolve} className="ml-4 text-xs text-red-300 underline underline-offset-2">
                部屋を解散
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
