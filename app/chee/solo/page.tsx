"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StoreOwner } from "../StoreOwner";

/**
 * チーゲーム — ひとり早撃ち練習(テキスト・オフライン完結)
 *
 * ルール: 画面が「◯文字」を出題 → その文字数ちょうどの「◯◯チー」を打つ(既出NG)。
 * 正解で持ち時間が増える。持ち時間が0になったら終了。連続正解数がスコア(自己ベストを端末に保存)。
 * サーバ不要・完全ローカル。麺屋チーの屋台イメージ。絵文字は使わない。
 */

const BGM_MELODY = [523.25, 659.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 587.33];
const BGM_BASS = [130.81, 130.81, 196, 146.83];
const EIGHTH = 0.2;

const START_BANK = 20000; // 初期持ち時間(ms)
const BONUS = 2000; // 正解ごとの加算(ms)
const NG_WORDS = ["しね", "死ね", "ころす", "殺す", "きもい", "うざい", "ぶす", "デブ"];

function charLen(w: string): number {
  return [...w.trim()].length;
}
function endsWithChee(w: string): boolean {
  return /(チー|ちー)$/.test(w.trim());
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
function hasNg(w: string): boolean {
  const n = w.replace(/\s+/g, "");
  return NG_WORDS.some((ng) => n.includes(ng));
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function CheeSolo() {
  const [phase, setPhase] = useState<"home" | "play" | "over">("home");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [required, setRequired] = useState(4);
  const [input, setInput] = useState("");
  const [err, setErr] = useState("");
  const [timeLeft, setTimeLeft] = useState(START_BANK);
  const [bgmOn, setBgmOn] = useState(true);

  const usedRef = useRef<Set<string>>(new Set());
  const composingRef = useRef(false); // IME変換中フラグ(変換中はカタカナ化しない)
  const bankRef = useRef(START_BANK);
  const lastTsRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const requiredRef = useRef(4);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bgmTimerRef = useRef<number | null>(null);
  const bgmStepRef = useRef(0);
  const bgmNextRef = useRef(0);
  const bgmOnRef = useRef(true);

  useEffect(() => {
    bgmOnRef.current = bgmOn;
  }, [bgmOn]);
  useEffect(() => {
    try {
      const b = Number(localStorage.getItem("chee-solo-best") || "0");
      if (b > 0) setBest(b);
      if (localStorage.getItem("chee-bgm") === "0") setBgmOn(false);
    } catch {
      // 取得不可でも続行
    }
  }, []);

  // ---- 音 ----
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
      // 非対応でも無視
    }
  }, []);
  const beep = useCallback((freq: number, dur: number, peak = 0.1, type: OscillatorType = "triangle") => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }, []);
  const bgmStep = useCallback((step: number, time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const mel = BGM_MELODY[step % BGM_MELODY.length];
    if (mel > 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = mel;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.05, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + EIGHTH * 0.9);
      o.connect(g).connect(ctx.destination);
      o.start(time);
      o.stop(time + EIGHTH);
    }
    if (step % 4 === 0) {
      const b = BGM_BASS[Math.floor(step / 4) % BGM_BASS.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = b;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.045, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + EIGHTH * 1.8);
      o.connect(g).connect(ctx.destination);
      o.start(time);
      o.stop(time + EIGHTH * 2);
    }
    if (step % 2 === 0) {
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
        bgmStep(bgmStepRef.current, bgmNextRef.current);
        bgmNextRef.current += EIGHTH;
        bgmStepRef.current = (bgmStepRef.current + 1) % BGM_MELODY.length;
      }
    }, 25);
  }, [bgmStep]);
  const stopBgm = useCallback(() => {
    if (bgmTimerRef.current !== null) {
      clearInterval(bgmTimerRef.current);
      bgmTimerRef.current = null;
    }
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);
  useEffect(
    () => () => {
      stopTick();
      stopBgm();
    },
    [stopTick, stopBgm]
  );

  const gameOver = useCallback(() => {
    stopTick();
    stopBgm();
    beep(196, 0.5, 0.12, "sawtooth");
    setPhase("over");
    setBest((prev) => {
      const nb = Math.max(prev, scoreRef.current);
      try {
        localStorage.setItem("chee-solo-best", String(nb));
      } catch {
        // 保存不可でも続行
      }
      return nb;
    });
  }, [stopTick, stopBgm, beep]);

  const startGame = () => {
    ensureAudio();
    if (bgmOn) startBgm();
    usedRef.current = new Set();
    bankRef.current = START_BANK;
    lastTsRef.current = Date.now();
    scoreRef.current = 0;
    requiredRef.current = 4;
    setScore(0);
    setRequired(4);
    setInput("");
    setErr("");
    setTimeLeft(START_BANK);
    setPhase("play");
    stopTick();
    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      bankRef.current -= now - lastTsRef.current;
      lastTsRef.current = now;
      if (bankRef.current <= 0) {
        bankRef.current = 0;
        setTimeLeft(0);
        gameOver();
        return;
      }
      setTimeLeft(bankRef.current);
    }, 100);
  };

  const submit = () => {
    if (phase !== "play") return;
    const w = input.trim();
    if (!w) {
      setErr("「◯◯チー」を打ってね");
      return;
    }
    if (!endsWithChee(w)) {
      setErr("「チー」で終わる言葉にして");
      beep(220, 0.12, 0.08);
      return;
    }
    if (charLen(w) !== requiredRef.current) {
      setErr(`${requiredRef.current}文字ちょうどにして(いま${charLen(w)}文字)`);
      beep(220, 0.12, 0.08);
      return;
    }
    if (hasNg(w)) {
      setErr("その言葉はナシ");
      return;
    }
    if (usedRef.current.has(normalizeWord(w))) {
      setErr("もう出た言葉！");
      beep(220, 0.12, 0.08);
      return;
    }
    usedRef.current.add(normalizeWord(w));
    bankRef.current = Math.min(START_BANK, bankRef.current + BONUS);
    const ns = scoreRef.current + 1;
    scoreRef.current = ns;
    setScore(ns);
    const nr = randInt(3, 6);
    requiredRef.current = nr;
    setRequired(nr);
    setInput("");
    setErr("");
    beep(880, 0.12, 0.1);
  };

  const toggleBgm = () => {
    setBgmOn((v) => {
      const n = !v;
      try {
        localStorage.setItem("chee-bgm", n ? "1" : "0");
      } catch {
        // 保存不可でも切替は有効
      }
      if (n) {
        ensureAudio();
        if (phase === "play") startBgm();
      } else {
        stopBgm();
      }
      return n;
    });
  };

  const pct = Math.max(0, Math.min(100, (timeLeft / START_BANK) * 100));

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 px-4 py-5 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <Link href="/chee/online" className="text-xs text-stone-400 hover:text-stone-200">
            ← みんなで対戦へ
          </Link>
          <button
            onClick={toggleBgm}
            className="text-xs px-2 py-1 rounded border border-stone-700 text-stone-300 hover:bg-stone-800"
          >
            {bgmOn ? "音楽 あり" : "音楽 なし"}
          </button>
        </div>

        <div className="mb-6">
          <div className="mx-auto rounded-b-lg bg-red-800 px-4 pt-4 pb-5 text-center border-x-2 border-b-2 border-red-950 shadow-lg shadow-black/40">
            <p className="text-[10px] tracking-[0.5em] text-red-200/80 mb-1">麺 屋</p>
            <h1
              className="text-5xl font-black tracking-[0.15em] text-stone-50"
              style={{ fontFamily: '"Yu Mincho","Hiragino Mincho ProN","Noto Serif JP",serif' }}
            >
              チー
            </h1>
            <p className="text-[11px] text-red-100/90 mt-1 tracking-widest">ひとり早撃ち練習</p>
          </div>
          <div className="flex gap-1 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="h-3 w-9 bg-red-800 rounded-b-md border-x-2 border-b-2 border-red-950" />
            ))}
          </div>
        </div>

        {err && phase === "play" && (
          <div className="mb-3 rounded-md bg-red-950/70 border border-red-800 px-3 py-2 text-sm text-red-100">{err}</div>
        )}

        {/* ホーム */}
        {phase === "home" && (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <StoreOwner size={110} />
            </div>
            <section className="bg-stone-900 rounded-lg p-5 border border-stone-700">
              <p className="text-sm text-stone-300 leading-relaxed text-left">
                画面が「<b className="text-amber-200">◯文字</b>」を出すので、その文字数ちょうどの「◯◯<b className="text-amber-200">チー</b>」を打つだけ。
                正解で<b className="text-amber-200">持ち時間が増え</b>、時間切れで終了。何連続できるか自己ベストに挑戦。
              </p>
            </section>
            <section className="bg-amber-100 rounded-lg p-4 border-2 border-amber-800/40">
              <p className="text-xs text-stone-600">自己ベスト</p>
              <p className="text-3xl font-black text-red-800" style={{ fontFamily: '"Yu Mincho",serif' }}>
                {best} 連続
              </p>
            </section>
            <button
              onClick={startGame}
              className="w-full py-4 rounded-md text-lg font-black bg-red-700 hover:bg-red-600 text-stone-50 active:scale-[0.98] transition"
            >
              はじめる
            </button>
            <Link href="/chee" className="block text-xs text-stone-500 underline underline-offset-2">
              対面版(声で遊ぶ)へ
            </Link>
          </div>
        )}

        {/* プレイ */}
        {phase === "play" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>連続 {score}</span>
              <span>自己ベスト {best}</span>
            </div>

            <section className="bg-red-900/40 rounded-lg p-4 border border-red-800 text-center">
              <p className="text-xs text-red-200/80 mb-1">お題</p>
              <p className="text-2xl font-black text-amber-100">
                <span className="text-4xl text-amber-300">{required}</span> 文字ちょうどの「{maruWord(required)}」
              </p>
            </section>

            <section className="bg-stone-900 rounded-lg p-4 border border-stone-700 text-center">
              <p className={`text-5xl font-black tabular-nums ${timeLeft <= 5000 ? "text-red-400" : "text-stone-100"}`}>
                {(timeLeft / 1000).toFixed(1)}
                <span className="text-lg">秒</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                  className={`h-full rounded-full ${timeLeft <= 5000 ? "bg-red-500" : "bg-amber-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-stone-500">正解ごとに +2秒</p>
            </section>

            <div className="flex gap-2">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
                }}
                autoFocus
                placeholder={`${required}文字「${maruWord(required)}」`}
                maxLength={20}
                className="flex-1 bg-stone-900 rounded-md px-3 py-2 text-base outline-none focus:ring-2 focus:ring-red-600 border border-stone-700"
              />
              <button onClick={submit} className="px-6 rounded-md bg-red-700 hover:bg-red-600 text-stone-50 font-black">
                出す
              </button>
            </div>
            <button onClick={gameOver} className="w-full text-xs text-stone-500 underline underline-offset-2">
              やめる
            </button>
          </div>
        )}

        {/* ゲームオーバー */}
        {phase === "over" && (
          <div className="space-y-5 text-center">
            <section className="bg-amber-100 rounded-lg p-8 border-2 border-amber-800/40">
              <p className="text-xs tracking-[0.3em] text-red-800/80 mb-1">閉店</p>
              <p className="text-2xl font-black text-red-800 mb-3" style={{ fontFamily: '"Yu Mincho",serif' }}>
                {score} 連続
              </p>
              <p className="text-xs text-stone-600">
                自己ベスト {best} 連続{score >= best && score > 0 ? "（更新！）" : ""}
              </p>
            </section>
            <button
              onClick={startGame}
              className="w-full py-3 rounded-md text-sm font-black bg-red-700 hover:bg-red-600 text-stone-50 active:scale-[0.98] transition"
            >
              もう一回
            </button>
            <div className="flex justify-center gap-4">
              <Link href="/chee/online" className="text-xs text-stone-500 underline underline-offset-2">
                みんなで対戦
              </Link>
              <Link href="/chee" className="text-xs text-stone-500 underline underline-offset-2">
                対面版
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
