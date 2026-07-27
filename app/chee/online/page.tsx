"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StoreOwner } from "../StoreOwner";

/**
 * チーゲーム — オンライン「早撃ちチー対決」
 *
 * 離れた友達とルームコードで対戦。ルール:
 * - 持ち時間制(チェスクロック): 各自30秒。自分の番の間だけ減り、0になった人の負け。
 * - 文字数しばり: 答えた人が「次は◯文字」を指定。次の人はその文字数ちょうどの「◯◯チー」を返す(既出NG)。
 * - 合う言葉を探す間も持ち時間は減り続ける = 早撃ちが有利。最後の1人が優勝。
 * 判定は自動(チー終端+文字数一致+重複なし+簡易NG)。サーバは状態(JSON)の置き場、各端末はポーリングで同期。
 *
 * ※ 対面(声で遊ぶ演技しばり版)は /chee のまま。UIはラーメン屋の屋台イメージ。絵文字は使わない。
 */

type RoomPlayer = { id: string; name: string; lives: number; avatar?: string; timeBankMs?: number; wins?: number };
type RoomState = {
  code: string;
  hostId: string;
  phase: "lobby" | "play" | "result";
  mode?: "voice" | "text";
  random?: boolean;
  players: RoomPlayer[];
  turnIdx: number;
  turnCount: number;
  deck: { text: string; tag: string }[];
  deckPos: number;
  outOrder: string[];
  settings: { timerSec: number; shibariFreq: number; livesSetting: number };
  turnStartedAt: number;
  usedWords?: string[];
  requiredLen?: number;
  log?: { name: string; word: string; ok: boolean }[];
  version: number;
  updatedAt: number;
};
type NextState = Omit<RoomState, "code" | "version" | "updatedAt">;

const BANK_MS = 30000; // 持ち時間30秒(固定)
const LEN_CHOICES = [3, 4, 5, 6, 7, 8]; // 2文字だと「チー」しか無く成立しないので3から
// 麺屋の暖簾に映える札の色(絵文字は使わず色で識別)
const COLORS = ["#e0503a", "#e0a133", "#5aa06a", "#4f8fc0", "#b06ac4", "#d0678f", "#5aa89f", "#c08a3a"];

// BGM: Web Audioで生成するループ(音声ファイル不要・著作権フリー)。ロビーは静か、対戦中はもりあがる。
const BGM_LOBBY_MELODY = [440, 0, 392, 440, 329.63, 0, 392, 0, 293.66, 329.63, 392, 0, 329.63, 293.66, 246.94, 0];
const BGM_LOBBY_BASS = [110, 130.81, 146.83, 130.81];
const BGM_PLAY_MELODY = [523.25, 659.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 587.33];
const BGM_PLAY_BASS = [130.81, 130.81, 196, 146.83];
const EIGHTH_LOBBY = 0.3;
const EIGHTH_PLAY = 0.2; // 対戦中は速くしてもりあげる

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
// ひらがな→カタカナ(入力を全部カタカナに)
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}
// 文字数に合わせた見本("◯◯チー")。チーは2文字なので ◯ は (n-2) 個
function maruWord(n: number): string {
  return "◯".repeat(Math.max(1, n - 2)) + "チー";
}
function endsWithChee(w: string): boolean {
  return /(チー|ちー)$/.test(w.trim());
}
function charLen(w: string): number {
  return [...w.trim()].length;
}
function hasNg(w: string): boolean {
  const n = w.replace(/\s+/g, "");
  return NG_WORDS.some((ng) => n.includes(ng));
}
function aliveByTime(p: RoomPlayer): boolean {
  return (p.timeBankMs ?? 0) > 0;
}
function nextAliveIdx(players: RoomPlayer[], from: number): number {
  let i = from;
  for (let n = 0; n < players.length; n++) {
    i = (i + 1) % players.length;
    if (aliveByTime(players[i])) return i;
  }
  return from;
}
function advanceSubmit(s: RoomState, word: string, nextLen: number, now: number): NextState {
  const players = s.players.map((p, i) =>
    i === s.turnIdx ? { ...p, timeBankMs: Math.max(0, (p.timeBankMs ?? BANK_MS) - (now - s.turnStartedAt)) } : p
  );
  const used = [...(s.usedWords || []), normalizeWord(word)];
  const log = [...(s.log || []), { name: s.players[s.turnIdx].name, word, ok: true }].slice(-24);
  return {
    ...s,
    players,
    usedWords: used,
    log,
    requiredLen: nextLen,
    turnIdx: nextAliveIdx(players, s.turnIdx),
    turnCount: s.turnCount + 1,
    turnStartedAt: now,
  };
}
function advanceTimeout(s: RoomState, now: number): NextState {
  const cur = s.players[s.turnIdx];
  const players = s.players.map((p, i) => (i === s.turnIdx ? { ...p, timeBankMs: 0 } : p));
  const outOrder = [...s.outOrder, cur.id];
  const log = [...(s.log || []), { name: cur.name, word: "持ち時間切れ", ok: false }].slice(-24);
  if (players.filter(aliveByTime).length <= 1) {
    const champ = players.find(aliveByTime);
    const ranked = champ ? players.map((p) => (p.id === champ.id ? { ...p, wins: (p.wins ?? 0) + 1 } : p)) : players;
    return { ...s, players: ranked, outOrder, log, phase: "result" };
  }
  return {
    ...s,
    players,
    outOrder,
    log,
    turnIdx: nextAliveIdx(players, s.turnIdx),
    turnCount: s.turnCount + 1,
    turnStartedAt: now,
  };
}

export default function CheeOnline() {
  const [myId, setMyId] = useState(newId);
  const [myName, setMyName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [nowTick, setNowTick] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [bgmOn, setBgmOn] = useState(true);
  const [myStats, setMyStats] = useState<{ wins: number; games: number } | null>(null);
  const [showOpening, setShowOpening] = useState(false);
  const roomRef = useRef<RoomState | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<number | null>(null);
  const bgmStepRef = useRef(0);
  const bgmNextRef = useRef(0);
  const bgmOnRef = useRef(true);
  const wonPlayedRef = useRef(false);
  const statsSentRef = useRef(false);
  const autoStartRef = useRef(false);
  const composingRef = useRef(false); // IME変換中フラグ(変換中はカタカナ化しない)
  const prevPhaseRef = useRef<string | undefined>(undefined);

  const setRoomBoth = useCallback((s: RoomState | null) => {
    roomRef.current = s;
    setRoom(s);
  }, []);

  // ---- BGM(Web Audio生成・ファイル不要・オン/オフ切替) ----
  const ensureAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === "suspended") void audioCtxRef.current.resume();
    } catch {
      // Web Audio 非対応でも無視
    }
  }, []);

  const bgmPlayStep = useCallback((step: number, time: number, mode: "lobby" | "play") => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const melArr = mode === "play" ? BGM_PLAY_MELODY : BGM_LOBBY_MELODY;
    const bassArr = mode === "play" ? BGM_PLAY_BASS : BGM_LOBBY_BASS;
    const eighth = mode === "play" ? EIGHTH_PLAY : EIGHTH_LOBBY;
    const mel = melArr[step % melArr.length];
    if (mel > 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = mel;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(mode === "play" ? 0.06 : 0.05, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + eighth * 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(time);
      o.stop(time + eighth);
    }
    if (step % 4 === 0) {
      const b = bassArr[Math.floor(step / 4) % bassArr.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = b;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.045, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + eighth * 1.8);
      o.connect(g).connect(ctx.destination);
      o.start(time);
      o.stop(time + eighth * 2);
    }
    // 対戦中はキックドラムで疾走感を足す
    if (mode === "play" && step % 2 === 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(150, time);
      o.frequency.exponentialRampToValueAtTime(50, time + 0.12);
      g.gain.setValueAtTime(0.08, time);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(time);
      o.stop(time + 0.16);
    }
  }, []);

  const startBgm = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || bgmTimerRef.current !== null) return;
    bgmNextRef.current = ctx.currentTime + 0.1;
    bgmStepRef.current = 0;
    bgmTimerRef.current = window.setInterval(() => {
      const c = audioCtxRef.current;
      if (!c) return;
      while (bgmNextRef.current < c.currentTime + 0.12) {
        const mode = roomRef.current?.phase === "play" ? "play" : "lobby";
        bgmPlayStep(bgmStepRef.current, bgmNextRef.current, mode);
        bgmNextRef.current += mode === "play" ? EIGHTH_PLAY : EIGHTH_LOBBY;
        const len = mode === "play" ? BGM_PLAY_MELODY.length : BGM_LOBBY_MELODY.length;
        bgmStepRef.current = (bgmStepRef.current + 1) % len;
      }
    }, 25);
  }, [bgmPlayStep]);

  const stopBgm = useCallback(() => {
    if (bgmTimerRef.current !== null) {
      clearInterval(bgmTimerRef.current);
      bgmTimerRef.current = null;
    }
  }, []);

  const kickAudio = () => {
    ensureAudio();
    if (bgmOn) startBgm();
  };
  const toggleBgm = () => {
    setBgmOn((v) => {
      const next = !v;
      try {
        localStorage.setItem("chee-bgm", next ? "1" : "0");
      } catch {
        // 保存できなくても切替は有効
      }
      if (next) {
        ensureAudio();
        startBgm();
      } else {
        stopBgm();
      }
      return next;
    });
  };

  // 勝利ファンファーレ(店主の「チー！！」の効果音)
  const playFanfare = useCallback(() => {
    if (!bgmOnRef.current) return;
    ensureAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.03;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const time = t0 + i * 0.14;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.12, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
      o.connect(g).connect(ctx.destination);
      o.start(time);
      o.stop(time + 0.34);
    });
  }, [ensureAudio]);

  // 開店の合図(店主の開始演出の効果音・鐘風)
  const playOpening = useCallback(() => {
    if (!bgmOnRef.current) return;
    ensureAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const bell = (freq: number, time: number, dur: number, peak: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(peak, time + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      o.connect(g).connect(ctx.destination);
      o.start(time);
      o.stop(time + dur + 0.02);
    };
    const t = ctx.currentTime + 0.02;
    bell(1046.5, t, 0.5, 0.12);
    bell(1567.98, t + 0.12, 0.6, 0.1);
  }, [ensureAudio]);

  useEffect(() => {
    try {
      if (localStorage.getItem("chee-bgm") === "0") setBgmOn(false);
      const savedName = localStorage.getItem("chee-name");
      if (savedName) setMyName(savedName);
      let uid = localStorage.getItem("chee-uid");
      if (!uid) {
        uid = newId();
        localStorage.setItem("chee-uid", uid);
      }
      setMyId(uid);
    } catch {
      // 取得不可でも既定ON
    }
  }, []);
  useEffect(() => {
    bgmOnRef.current = bgmOn;
  }, [bgmOn]);
  useEffect(() => () => stopBgm(), [stopBgm]);
  // 決着したら一度だけ店主の「チー！！」ファンファーレ
  useEffect(() => {
    if (room?.phase === "result") {
      if (!wonPlayedRef.current) {
        wonPlayedRef.current = true;
        playFanfare();
      }
    } else {
      wonPlayedRef.current = false;
    }
  }, [room?.phase, playFanfare]);

  // 対戦開始(lobby/result → play)で店主の開店演出
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = room?.phase;
    if (room?.phase === "play" && prev !== "play") {
      setShowOpening(true);
      playOpening();
      const t = setTimeout(() => setShowOpening(false), 2200);
      return () => clearTimeout(t);
    }
  }, [room?.phase, playOpening]);

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
          continue;
        }
        return;
      }
    },
    [setRoomBoth]
  );

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

  const timeoutAdvance = useCallback(() => {
    applyMutation((s) => {
      if (s.phase !== "play") return null;
      const p = s.players[s.turnIdx];
      if ((p.timeBankMs ?? BANK_MS) - (Date.now() - s.turnStartedAt) > 0) return null;
      return advanceTimeout(s, Date.now());
    });
  }, [applyMutation]);

  useEffect(() => {
    const id = setInterval(() => {
      setNowTick(Date.now());
      const cur = roomRef.current;
      if (cur && cur.phase === "play") {
        const p = cur.players[cur.turnIdx];
        if ((p.timeBankMs ?? BANK_MS) - (Date.now() - cur.turnStartedAt) <= 0) timeoutAdvance();
      }
    }, 250);
    return () => clearInterval(id);
  }, [timeoutAdvance]);

  // ---- アクション ----
  const randomMatch = async () => {
    setErr("");
    kickAudio();
    const nm = myName.trim();
    if (!nm) {
      setErr("名前を入れてね（結果・ランキングに出ます）");
      return;
    }
    if (hasNg(nm)) {
      setErr("その名前は使えません");
      return;
    }
    try {
      localStorage.setItem("chee-name", nm);
    } catch {
      // 保存できなくても続行
    }
    setBusy(true);
    try {
      const me: RoomPlayer = { id: myId, name: nm, lives: 1, timeBankMs: BANK_MS, wins: 0 };
      const r = await fetch("/api/chee/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player: me }),
      });
      if (r.status === 503) {
        setErr("いまオンライン機能が使えません(サーバ設定待ち)");
        return;
      }
      if (!r.ok) {
        setErr("マッチングに失敗しました");
        return;
      }
      const j = await r.json();
      setRoomBoth(j.state);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setErr("");
    kickAudio();
    const nm = myName.trim();
    if (!nm) {
      setErr("名前を入れてね（結果・ランキングに出ます）");
      return;
    }
    if (hasNg(nm)) {
      setErr("その名前は使えません");
      return;
    }
    try {
      localStorage.setItem("chee-name", nm);
    } catch {
      // 保存できなくても続行
    }
    setBusy(true);
    try {
      const me: RoomPlayer = { id: myId, name: nm, lives: 1, timeBankMs: BANK_MS, wins: 0 };
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
        settings: { timerSec: 30, shibariFreq: 0, livesSetting: 1 },
        turnStartedAt: 0,
        usedWords: [],
        requiredLen: 0,
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
        setErr("暖簾を出せませんでした(作成失敗)");
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
    kickAudio();
    const nm = myName.trim();
    if (!nm) {
      setErr("名前を入れてね（結果・ランキングに出ます）");
      return;
    }
    if (hasNg(nm)) {
      setErr("その名前は使えません");
      return;
    }
    try {
      localStorage.setItem("chee-name", nm);
    } catch {
      // 保存できなくても続行
    }
    const code = codeInput.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (!code) {
      setErr("暖簾の番号(コード)を入れてね");
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
        setErr("その暖簾は見つかりません");
        return;
      }
      if (!r.ok) {
        setErr("入店に失敗しました");
        return;
      }
      const j = await r.json();
      const s: RoomState = j.state;
      if (s.phase !== "lobby") {
        setErr("この店はもう営業中(開始済み)です");
        return;
      }
      if (s.players.length >= 8) {
        setErr("満席です(最大8人)");
        return;
      }
      setRoomBoth(s);
      const me: RoomPlayer = { id: myId, name: nm, lives: 1, timeBankMs: BANK_MS, wins: 0 };
      await applyMutation((cur) =>
        cur.players.some((p) => p.id === myId) ? cur : { ...cur, players: [...cur.players, me] }
      );
    } finally {
      setBusy(false);
    }
  };

  const startGame = () => {
    kickAudio();
    return applyMutation((s) => {
      if (s.players.length < 2) return null;
      const players = s.players.map((p) => ({ ...p, timeBankMs: BANK_MS }));
      return {
        ...s,
        players,
        phase: "play",
        turnIdx: 0,
        turnCount: 0,
        outOrder: [],
        usedWords: [],
        log: [],
        requiredLen: 0,
        turnStartedAt: Date.now(),
      };
    });
  };

  // 文字数ボタンを押すと「送信＋次の人の文字数を指定」を同時に行う(エンター代わり)
  const submit = (nl: number) => {
    const s = roomRef.current;
    if (!s || s.players[s.turnIdx]?.id !== myId) return;
    kickAudio();
    const w = input.trim();
    if (!w) {
      setErr("まず「◯◯チー」を打ってね");
      return;
    }
    if (!endsWithChee(w)) {
      setErr("「チー」で終わる言葉にして");
      return;
    }
    const need = s.requiredLen ?? 0;
    if (need > 0 && charLen(w) !== need) {
      setErr(`${need}文字ちょうどにして(いまは${charLen(w)}文字)`);
      return;
    }
    if (hasNg(w)) {
      setErr("その言葉はナシ");
      return;
    }
    if ((s.usedWords || []).includes(normalizeWord(w))) {
      setErr("もう出た言葉！");
      return;
    }
    setErr("");
    setInput("");
    applyMutation((cur) => advanceSubmit(cur, w, nl, Date.now()));
  };

  const leave = () => setRoomBoth(null);
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
    applyMutation((s) => (s.hostId === myId && s.phase === "play" ? advanceTimeout(s, Date.now()) : null));

  // ---- 派生 ----
  const isHost = room?.hostId === myId;
  const myTurn = !!room && room.phase === "play" && room.players[room.turnIdx]?.id === myId;
  const need = room?.requiredLen ?? 0; // 0 = 1手目(文字数しばりなし・自由)
  const aliveCount = room?.players.filter(aliveByTime).length ?? 0;
  const winner = room?.players.find(aliveByTime);
  const colorOf = (i: number) => COLORS[i % COLORS.length];
  const idxOf = (id: string) => room?.players.findIndex((p) => p.id === id) ?? 0;
  const nameById = (id: string) => room?.players.find((p) => p.id === id)?.name ?? "?";
  const remainMs = (p: RoomPlayer, isActive: boolean) => {
    const base = p.timeBankMs ?? BANK_MS;
    return isActive ? Math.max(0, base - (nowTick - (room?.turnStartedAt ?? nowTick))) : Math.max(0, base);
  };
  const ranking =
    room && winner
      ? [winner.name, ...[...room.outOrder].reverse().map(nameById)]
      : room
        ? [...room.outOrder].reverse().map(nameById)
        : [];
  const historyRanking = room ? [...room.players].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0)) : [];

  // ホームで通算戦績(匿名・端末ID)を取得
  useEffect(() => {
    if (room?.code || !myId) return;
    let cancelled = false;
    fetch(`/api/chee/user?uid=${myId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.stats) setMyStats({ wins: j.stats.wins, games: j.stats.games });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [myId, room?.code]);

  // 決着したら通算戦績を保存(1ゲーム1回・自分が参加していた時のみ)
  useEffect(() => {
    if (room?.phase === "result") {
      if (!statsSentRef.current) {
        statsSentRef.current = true;
        if (room.players.some((p) => p.id === myId)) {
          const meName = room.players.find((p) => p.id === myId)?.name || myName.trim();
          const won = room.players.find(aliveByTime)?.id === myId;
          fetch("/api/chee/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: myId, name: meName, won }),
          }).catch(() => {});
        }
      }
    } else {
      statsSentRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.phase, myId, myName]);

  // ランダムルームは2人揃ったらホストが自動開始
  useEffect(() => {
    if (room?.random && room.phase === "lobby" && isHost && room.players.length >= 2) {
      if (!autoStartRef.current) {
        autoStartRef.current = true;
        startGame();
      }
    } else if (room?.phase !== "lobby") {
      autoStartRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.random, room?.phase, room?.players.length, isHost]);

  return (
    <main className="min-h-[100dvh] overscroll-none bg-stone-950 text-stone-100 px-4 py-5 flex flex-col items-center">
      <style>{`
        @keyframes chee-sway { 0%,100% { transform: rotate(-0.6deg); } 50% { transform: rotate(0.6deg); } }
        @keyframes chee-pop { 0% { transform: scale(0.6); opacity: 0; } 55% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <Link href="/chee" className="text-xs text-stone-400 hover:text-stone-200">
            ← 対面版(声で遊ぶ)へ
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleBgm}
              className="text-xs px-2 py-1 rounded border border-stone-700 text-stone-300 hover:bg-stone-800"
            >
              {bgmOn ? "音楽 あり" : "音楽 なし"}
            </button>
            {room && (
              <button onClick={leave} className="text-xs text-stone-500 underline underline-offset-2">
                退店
              </button>
            )}
          </div>
        </div>

        {/* 暖簾(のれん) */}
        <div className="mb-6" style={{ animation: "chee-sway 5s ease-in-out infinite", transformOrigin: "top center" }}>
          <div className="mx-auto rounded-b-lg bg-red-800 px-4 pt-4 pb-5 text-center border-x-2 border-b-2 border-red-950 shadow-lg shadow-black/40">
            <p className="text-[10px] tracking-[0.5em] text-red-200/80 mb-1">麺 屋</p>
            <h1
              className="text-5xl font-black tracking-[0.15em] text-stone-50"
              style={{ fontFamily: '"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP",serif' }}
            >
              チー
            </h1>
            <p className="text-[11px] text-red-100/90 mt-1 tracking-widest">早撃ち・オンライン対決</p>
          </div>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="h-3 w-9 bg-red-800 rounded-b-md border-x-2 border-b-2 border-red-950" />
            ))}
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-md bg-red-950/70 border border-red-800 px-3 py-2 text-sm text-red-100">
            {err}
          </div>
        )}

        {/* ===== 入口(作成/参加) ===== */}
        {!room && (
          <div className="space-y-5">
            <section className="bg-stone-900 rounded-lg p-4 border border-stone-700">
              <h2 className="text-sm font-bold mb-3 text-amber-200/90">お名前（必須）</h2>
              <input
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="なまえ（結果・ランキングに出ます）"
                maxLength={12}
                className="w-full bg-stone-800 rounded-md px-3 py-2 text-sm placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-red-600"
              />
              {myStats && myStats.games > 0 && (
                <p className="mt-2 text-[11px] text-stone-500">
                  あなたの通算：{myStats.wins}勝 / {myStats.games}戦（この端末）
                </p>
              )}
            </section>

            <section className="bg-stone-900 rounded-lg p-4 border border-red-800/50 space-y-2">
              <h2 className="text-sm font-bold text-amber-200/90">ランダム対戦（すぐ遊ぶ）</h2>
              <p className="text-[11px] text-stone-400">知らない誰かと自動マッチ。2人揃えば自動で開始。</p>
              <button
                onClick={randomMatch}
                disabled={busy}
                className="w-full py-3 rounded-md text-base font-black bg-red-700 hover:bg-red-600 text-stone-50 active:scale-[0.98] transition disabled:opacity-50"
              >
                ランダム対戦をさがす
              </button>
            </section>

            <section className="bg-stone-900 rounded-lg p-4 border border-stone-700 space-y-3">
              <h2 className="text-sm font-bold text-amber-200/90">暖簾を出す (部屋を作る)</h2>
              <p className="text-[11px] text-stone-400">持ち時間30秒の早撃ち勝負。作ると番号(コード)が出るので友達に渡してね。</p>
              <button
                onClick={create}
                disabled={busy}
                className="w-full py-3 rounded-md text-base font-black bg-red-700 hover:bg-red-600 text-stone-50 active:scale-[0.98] transition disabled:opacity-50"
              >
                暖簾を出す
              </button>
            </section>

            <section className="bg-stone-900 rounded-lg p-4 border border-stone-700 space-y-3">
              <h2 className="text-sm font-bold text-amber-200/90">来店する (番号で参加)</h2>
              <div className="flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") join();
                  }}
                  placeholder="ABCD"
                  maxLength={6}
                  className="flex-1 bg-stone-800 rounded-md px-3 py-2 text-lg font-black tracking-[0.4em] text-center placeholder:text-stone-600 outline-none focus:ring-2 focus:ring-red-600"
                />
                <button
                  onClick={join}
                  disabled={busy}
                  className="px-5 rounded-md bg-red-700 hover:bg-red-600 text-stone-50 text-sm font-bold disabled:opacity-50"
                >
                  来店する
                </button>
              </div>
            </section>

            <section className="bg-stone-900 rounded-lg p-4 border border-stone-700 space-y-2">
              <h2 className="text-sm font-bold text-amber-200/90">ひとりで練習（1人用）</h2>
              <p className="text-[11px] text-stone-400">相手がいなくてもOK。文字数のお題を早撃ちでこなす自己ベスト挑戦。</p>
              <Link
                href="/chee/solo"
                className="block w-full py-3 rounded-md text-center text-base font-black bg-red-700 hover:bg-red-600 text-stone-50 active:scale-[0.98] transition"
              >
                ひとりで練習する
              </Link>
            </section>

            <section className="pt-3 border-t border-stone-800 text-sm text-stone-400 leading-relaxed space-y-2">
              <h2 className="text-amber-200/90 font-bold">早撃ちチー対決の遊び方</h2>
              <p>
                各自<b className="text-amber-200">持ち時間30秒</b>。自分の番の間だけ時計が減り、<b className="text-red-300">0になった人の負け</b>。
                <b className="text-amber-200">1手目は自由</b>に「◯◯チー」。答えた人が「次は<b className="text-amber-200">◯文字</b>」を指定→<b className="text-amber-200">2手目から</b>はその文字数ちょうどを返す(既出は無効)。
                考えている間も時計は減るので、早撃ちが勝ち。最後の1人が優勝。
              </p>
            </section>
          </div>
        )}

        {/* ===== ロビー ===== */}
        {room && room.phase === "lobby" && (
          <div className="space-y-5">
            {room.random ? (
              <section className="bg-stone-900 rounded-lg p-6 border border-stone-700 text-center">
                <p className="text-sm text-amber-200/90 font-bold">対戦相手をさがしています…</p>
                <p className="mt-1 text-[11px] text-stone-500">2人揃うと自動で開店（対決開始）</p>
              </section>
            ) : (
              <section className="bg-amber-100 rounded-lg p-5 border-2 border-amber-800/40 text-center">
                <p className="text-xs text-stone-600 mb-1">暖簾の番号(友達に渡す)</p>
                <p className="text-4xl font-black tracking-[0.35em] text-red-800" style={{ fontFamily: '"Yu Mincho",serif' }}>
                  {room.code}
                </p>
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(room.code);
                    } catch {
                      // コピー不可でも番号は見えている
                    }
                  }}
                  className="mt-2 text-[11px] text-stone-500 underline underline-offset-2"
                >
                  番号をコピー
                </button>
              </section>
            )}

            <section className="bg-stone-900 rounded-lg p-4 border border-stone-700">
              <h2 className="text-sm font-bold mb-3 text-amber-200/90">お客さん ({room.players.length}人)</h2>
              <div className="flex flex-wrap gap-2">
                {room.players.map((p, i) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-stone-800 text-stone-100"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(i) }} />
                    {p.name}
                    {isHost && p.id !== room.hostId && (
                      <button
                        onClick={() => kickInLobby(p.id)}
                        aria-label={`${p.name}を退店させる`}
                        className="ml-1 text-[11px] text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-stone-500">持ち時間 各30秒 ・ 1手目は自由、2手目から文字数しばり</p>
            </section>

            {room.random ? null : isHost ? (
              <button
                onClick={startGame}
                disabled={room.players.length < 2}
                className="w-full py-4 rounded-md text-lg font-black bg-red-700 hover:bg-red-600 text-stone-50 active:scale-[0.98] transition disabled:opacity-40"
              >
                {room.players.length < 2 ? "あと1人待ち…" : "対決スタート"}
              </button>
            ) : (
              <p className="text-center text-sm text-stone-400 py-4">いらっしゃい！まもなく開店です…</p>
            )}
            {isHost && (
              <button onClick={dissolve} className="w-full text-xs text-stone-500 underline underline-offset-2">
                暖簾をしまう(部屋を解散・データ削除)
              </button>
            )}
          </div>
        )}

        {/* ===== 対戦中 ===== */}
        {room && room.phase === "play" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>{room.turnCount + 1}手目 ・ 残り{aliveCount}人</span>
              <span>既出 {room.usedWords?.length ?? 0} 語</span>
            </div>

            {/* お題(必要文字数) */}
            <section className="bg-red-900/40 rounded-lg p-4 border border-red-800 text-center">
              <p className="text-xs text-red-200/80 mb-1">いまのお題</p>
              {need > 0 ? (
                <p className="text-2xl font-black text-amber-100">
                  <span className="text-4xl text-amber-300">{need}</span> 文字ちょうどの「{maruWord(need)}」
                </p>
              ) : (
                <p className="text-2xl font-black text-amber-100">
                  {room.turnCount === 0 ? "口火の一杯！自由に「◯◯チー」" : "自由に「◯◯チー」なら何でも"}
                </p>
              )}
            </section>

            {/* 現在の手番 + 持ち時間 */}
            <section className="bg-stone-900 rounded-lg p-5 border border-stone-700 text-center">
              <p className="text-xs text-stone-400 mb-1">いまの番</p>
              <p className="text-2xl font-black" style={{ color: colorOf(idxOf(room.players[room.turnIdx]?.id ?? "")) }}>
                {room.players[room.turnIdx]?.name}
                {myTurn ? "（あなた）" : ""}
              </p>
              {(() => {
                const rem = remainMs(room.players[room.turnIdx], true);
                const pct = Math.max(0, Math.min(100, (rem / BANK_MS) * 100));
                return (
                  <>
                    <p className={`text-5xl font-black tabular-nums mt-1 ${rem <= 5000 ? "text-red-400" : "text-stone-100"}`}>
                      {(rem / 1000).toFixed(1)}
                      <span className="text-lg">秒</span>
                    </p>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-800">
                      <div
                        className={`h-full rounded-full ${rem <= 5000 ? "bg-red-500" : "bg-amber-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </>
                );
              })()}
            </section>

            {room.log && room.log.length > 0 && (
              <p className="text-center text-sm text-stone-300">
                直前：<b style={{ color: colorOf(idxOf(room.players.find((p) => p.name === room.log![room.log!.length - 1].name)?.id ?? "")) }}>{room.log[room.log.length - 1].name}</b>{" "}
                {room.log[room.log.length - 1].ok
                  ? `「${room.log[room.log.length - 1].word}」`
                  : `— ${room.log[room.log.length - 1].word}`}
              </p>
            )}

            {myTurn ? (
              <section className="bg-red-900/30 rounded-lg p-4 border border-red-800 space-y-3">
                <p className="text-sm font-bold text-amber-100">
                  {need > 0
                    ? `あなたの番！${need}文字「${maruWord(need)}」を打つ`
                    : room.turnCount === 0
                      ? "口火の一杯！自由に「◯◯チー」を打つ"
                      : "あなたの番！「◯◯チー」を打つ(自由)"}
                </p>
                <input
                  value={input}
                  onChange={(e) => setInput(composingRef.current ? e.target.value : toKatakana(e.target.value))}
                  onCompositionStart={() => {
                    composingRef.current = true;
                  }}
                  onCompositionEnd={(e) => {
                    composingRef.current = false;
                    setInput(toKatakana(e.currentTarget.value));
                  }}
                  autoFocus
                  placeholder={need > 0 ? maruWord(need) : "例: ライチー"}
                  maxLength={20}
                  className="w-full bg-stone-900 rounded-md px-3 py-2 text-base outline-none focus:ring-2 focus:ring-red-600"
                />
                <div>
                  <p className="text-[11px] text-stone-400 mb-1">打てたら、次の人に出す文字数を押す（＝これで送信）</p>
                  <div className="flex gap-1.5">
                    {LEN_CHOICES.map((n) => (
                      <button
                        key={n}
                        onClick={() => submit(n)}
                        className="flex-1 py-2.5 rounded-md text-base font-black bg-amber-400 text-stone-900 hover:bg-amber-300 active:scale-95 transition"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : (
              <p className="text-center text-sm text-stone-400 py-2">{room.players[room.turnIdx]?.name} さんが考え中…</p>
            )}

            {/* 実況(お品書き) */}
            <section className="bg-stone-900 rounded-lg p-3 border border-stone-700">
              <div className="flex flex-col-reverse gap-1 max-h-44 overflow-y-auto">
                {(room.log || []).map((e, i) => (
                  <p key={i} className={`text-sm ${e.ok ? "text-stone-200" : "text-red-300"}`}>
                    <span className="text-stone-500">{e.name}:</span> {e.ok ? `「${e.word}」` : e.word}
                  </p>
                ))}
                {(room.log || []).length === 0 && <p className="text-xs text-stone-600">まだ一杯も出ていません</p>}
              </div>
            </section>

            {/* 各自の持ち時間 */}
            <div className="space-y-1.5">
              {room.players.map((p, i) => {
                const active = p.id === room.players[room.turnIdx]?.id;
                const rem = remainMs(p, active);
                const dead = !aliveByTime(p) || rem <= 0;
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: colorOf(i) }} />
                    <span className={`text-xs w-20 truncate ${dead ? "text-stone-600 line-through" : "text-stone-300"}`}>
                      {p.name}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${active ? "bg-amber-400" : "bg-stone-600"}`}
                        style={{ width: `${Math.max(0, Math.min(100, (rem / BANK_MS) * 100))}%` }}
                      />
                    </div>
                    <span className={`text-[11px] tabular-nums w-10 text-right ${dead ? "text-stone-600" : "text-stone-400"}`}>
                      {(rem / 1000).toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>

            {isHost && (
              <div className="flex gap-4 justify-center pt-1">
                <button onClick={skipCurrent} className="text-[11px] text-stone-400 underline underline-offset-2">
                  現在の人を退場(進まない時)
                </button>
                <button onClick={dissolve} className="text-[11px] text-red-400 underline underline-offset-2">
                  暖簾をしまう
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== 結果 ===== */}
        {room && room.phase === "result" && (
          <div className="space-y-5 text-center">
            <section className="bg-amber-100 rounded-lg p-8 border-2 border-amber-800/40">
              <div className="flex justify-center mb-1">
                <StoreOwner size={80} />
              </div>
              <p className="text-6xl font-black text-red-700 leading-none" style={{ fontFamily: '"Yu Mincho",serif' }}>
                チー！！
              </p>
              <p className="mt-2 mb-4 text-sm text-stone-700">店主「{winner?.name || "—"} の勝ち、チー！！」</p>
              <p className="text-xs tracking-[0.3em] text-red-800/80 mb-1">本日の一等</p>
              <p className="text-3xl font-black text-red-800" style={{ fontFamily: '"Yu Mincho",serif' }}>
                {winner?.name || "—"}
              </p>
              <p className="mt-3 text-xs text-stone-600">全 {room.turnCount + 1} 手 ・ 出た言葉 {room.usedWords?.length ?? 0} 語</p>
            </section>

            {room.players.some((p) => (p.wins ?? 0) > 0) && (
              <section className="bg-stone-900 rounded-lg p-4 border border-amber-800/40 text-left">
                <h2 className="text-xs font-bold text-amber-200/90 mb-2 text-center">歴代ランキング（この店の通算勝利）</h2>
                <ol className="space-y-1">
                  {historyRanking.map((p, i) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-8 text-center text-stone-400">{i === 0 ? "一等" : `${i + 1}位`}</span>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(idxOf(p.id)) }} />
                        <span className={i === 0 ? "font-bold text-amber-100" : "text-stone-300"}>{p.name}</span>
                      </span>
                      <span className="text-xs text-stone-400">{p.wins ?? 0}勝</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {ranking.length > 1 && (
              <section className="bg-stone-900 rounded-lg p-4 border border-stone-700 text-left">
                <h2 className="text-xs font-bold text-amber-200/90 mb-2 text-center">番付</h2>
                <ol className="space-y-1">
                  {ranking.map((name, i) => (
                    <li key={`${name}-${i}`} className="flex items-center gap-2 text-sm">
                      <span className="w-10 text-center text-stone-400">
                        {i === 0 ? "一等" : i === 1 ? "二等" : i === 2 ? "三等" : `${i + 1}位`}
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(idxOf(room.players.find((p) => p.name === name)?.id ?? "")) }} />
                      <span className={i === 0 ? "font-bold text-amber-100" : "text-stone-300"}>{name}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {isHost ? (
              <button
                onClick={startGame}
                className="w-full py-3 rounded-md text-sm font-bold bg-red-700 hover:bg-red-600 text-stone-50 active:scale-[0.98] transition"
              >
                同じ顔ぶれでもう一戦
              </button>
            ) : (
              <p className="text-sm text-stone-400">再戦をお待ちください…</p>
            )}
            <div>
              <button onClick={leave} className="text-xs text-stone-500 underline underline-offset-2">
                退店する
              </button>
              {isHost && (
                <button onClick={dissolve} className="ml-4 text-xs text-red-400 underline underline-offset-2">
                  暖簾をしまう
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showOpening && room?.phase === "play" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
          <div className="text-center px-8" style={{ animation: "chee-pop 0.5s ease" }}>
            <div className="flex justify-center mb-3">
              <StoreOwner size={132} />
            </div>
            <p className="mb-2 text-4xl font-black text-red-500" style={{ fontFamily: '"Yu Mincho",serif' }}>
              いらっしゃい！
            </p>
            <p className="text-lg text-amber-100">店主「早撃ち、勝負だチー！！」</p>
          </div>
        </div>
      )}
    </main>
  );
}
