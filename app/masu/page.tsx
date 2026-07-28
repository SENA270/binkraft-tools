"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MathOnii } from "./MathOnii";

/**
 * 100マス計算 — 暗算タイムアタック(1人用)
 *
 * 上10個・左10個の数字から、たしざん/かけざんの100問を順に暗算で解く。
 * 数字パッドで入力し、正解で自動的に次へ。全100問のタイムを競う。
 * 自己ベスト(端末保存)＋ランキング(匿名・端末名のみ)。対戦なし。
 * やさしい数学のお兄さん・水色ベース。スクロールなし。
 */

type Mode = "add" | "sub" | "mul" | "div";
type Entry = { name: string; ms: number; at: number };

function modeLabel(m: Mode): string {
  return m === "add" ? "たし算" : m === "sub" ? "ひき算" : m === "mul" ? "かけ算" : "わり算";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmt(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}秒`;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}分${String(r).padStart(2, "0")}秒`;
}
const NG_WORDS = ["しね", "死ね", "ころす", "殺す", "きもい", "うざい", "ぶす", "デブ"];
function cleanName(w: string): string {
  const t = w.trim();
  const n = t.replace(/\s+/g, "");
  return NG_WORDS.some((ng) => n.includes(ng)) ? "" : t;
}

export default function Masu() {
  const [phase, setPhase] = useState<"home" | "play" | "done">("home");
  const [mode, setMode] = useState<Mode>("add");
  const [name, setName] = useState("");
  const [top, setTop] = useState<number[]>([]);
  const [left, setLeft] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [wrong, setWrong] = useState(false);
  const [now, setNow] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [board, setBoard] = useState<Entry[]>([]);
  const [finalMs, setFinalMs] = useState(0);
  const [resultNote, setResultNote] = useState("");
  const startRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef(""); // 連打でも取りこぼさないよう最新入力をrefで保持
  const idxRef = useRef(0);

  useEffect(() => {
    try {
      const n = localStorage.getItem("chee-name");
      if (n) setName(n);
      const m = localStorage.getItem("masu-mode");
      if (m === "add" || m === "sub" || m === "mul" || m === "div") setMode(m);
    } catch {
      // 取得不可でも続行
    }
  }, []);

  const loadBoard = useCallback((m: Mode) => {
    let cancelled = false;
    fetch(`/api/masu/board?mode=${m}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.board) setBoard(j.board);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const b = localStorage.getItem(`masu-best-${mode}`);
      setBest(b ? Number(b) : null);
    } catch {
      // 取得不可でも続行
    }
    if (phase !== "play") return loadBoard(mode);
  }, [mode, phase, loadBoard]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // PC等の物理キーボードでも遊べるように(0-9で入力・Backspaceで消す)
  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") pressDigit(e.key);
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, top, left]);

  const r = Math.floor(idx / 10);
  const c = idx % 10;
  const a = left[r] ?? 0;
  const b = top[c] ?? 0;
  // div: a=割る数(1〜10), b=商(0〜9), 表示は(a*b)÷a、答えは b
  const curAns = mode === "mul" ? a * b : mode === "sub" ? a - b : mode === "div" ? b : a + b;

  const startGame = () => {
    setTop(shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    // ひき算は「大きい数−小さい数」で負にならないよう、左列を10〜19にする(答え1〜19)
    setLeft(
      mode === "sub"
        ? shuffle([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
        : mode === "div"
          ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) // わり算: 割る数(0を除外して割り切れるように)
          : shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    );
    setIdx(0);
    idxRef.current = 0;
    setInput("");
    inputRef.current = "";
    setWrong(false);
    startRef.current = Date.now();
    setNow(Date.now());
    setPhase("play");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setNow(Date.now()), 100);
    try {
      const nm = cleanName(name);
      if (nm) localStorage.setItem("chee-name", nm);
    } catch {
      // 保存不可でも続行
    }
  };

  const finish = (ms: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setFinalMs(ms);
    const oldBest = best;
    if (oldBest == null) setResultNote("はじめての記録！");
    else if (ms < oldBest) setResultNote(`自己ベスト更新！ ${fmt(oldBest - ms)}速い`);
    else if (ms === oldBest) setResultNote("自己ベストタイ！");
    else setResultNote(`自己ベストまで あと ${fmt(ms - oldBest)}`);
    setPhase("done");
    setBest((prev) => {
      const nb = prev == null ? ms : Math.min(prev, ms);
      try {
        localStorage.setItem(`masu-best-${mode}`, String(nb));
      } catch {
        // 保存不可でも続行
      }
      return nb;
    });
    const nm = cleanName(name) || "ゲスト";
    fetch("/api/masu/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, name: nm, ms }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((j) => {
        if (j?.board) setBoard(j.board);
      })
      .catch(() => {});
  };

  const pressDigit = (d: string) => {
    if (phase !== "play") return;
    // 連打対策: idx/input は state ではなく ref を真値にして計算(再描画待ちで取りこぼさない)
    const i = idxRef.current;
    const aa = left[Math.floor(i / 10)] ?? 0;
    const bb = top[i % 10] ?? 0;
    const ans = mode === "mul" ? aa * bb : mode === "sub" ? aa - bb : mode === "div" ? bb : aa + bb;
    const next = (inputRef.current + d).slice(0, 2);
    if (Number(next) === ans) {
      if (i >= 99) {
        finish(Date.now() - startRef.current);
        return;
      }
      idxRef.current = i + 1;
      inputRef.current = "";
      setIdx(i + 1);
      setInput("");
      setWrong(false);
    } else if (next.length >= String(ans).length) {
      inputRef.current = "";
      setWrong(true);
      setInput("");
      setTimeout(() => setWrong(false), 250);
    } else {
      inputRef.current = next;
      setInput(next);
    }
  };
  const backspace = () => {
    inputRef.current = inputRef.current.slice(0, -1);
    setInput(inputRef.current);
  };

  const elapsed = phase === "play" ? now - startRef.current : finalMs;
  const isNewBest = phase === "done" && best != null && finalMs <= best;
  const opSym = mode === "mul" ? "×" : mode === "sub" ? "−" : "+";

  return (
    <main className="h-[100dvh] overflow-y-auto overscroll-none bg-sky-50 text-slate-800 px-4 py-3 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-xs text-sky-600 hover:text-sky-800">
            ← ツール一覧
          </Link>
          {phase === "play" && (
            <span className="text-sm font-bold tabular-nums text-sky-700">
              {fmt(elapsed)} ・ {idx}/100
            </span>
          )}
        </div>

        {/* ===== ホーム ===== */}
        {phase === "home" && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-gradient-to-b from-sky-100 to-sky-50 border border-sky-200 px-4 pt-4 pb-5 text-center">
              <div className="flex justify-center mb-1">
                <MathOnii size={92} />
              </div>
              <h1 className="text-3xl font-black text-sky-700 tracking-wide">100マス計算</h1>
              <p className="text-xs text-sky-600/80 mt-1">やさしい数学のお兄さんと暗算タイムアタック</p>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="お名前（ランキングに出ます）"
              maxLength={12}
              className="w-full bg-white rounded-lg px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-sky-400 border border-sky-200"
            />

            <div className="flex gap-2">
              {(["add", "sub", "mul", "div"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    try {
                      localStorage.setItem("masu-mode", m);
                    } catch {
                      // 保存不可でも切替は有効
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition ${
                    mode === m ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {modeLabel(m)}
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full py-3.5 rounded-lg text-lg font-black bg-sky-500 hover:bg-sky-600 text-white active:scale-[0.98] transition"
            >
              スタート
            </button>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white border border-sky-200 p-3 text-center">
                <p className="text-[11px] text-slate-500">自己ベスト</p>
                <p className="text-xl font-black text-sky-700">{best != null ? fmt(best) : "—"}</p>
              </div>
              <div className="rounded-lg bg-white border border-sky-200 p-3">
                <p className="text-[11px] text-slate-500 mb-1 text-center">ランキング</p>
                {board.length > 0 ? (
                  <ol className="space-y-0.5">
                    {board.slice(0, 3).map((e, i) => (
                      <li key={i} className="flex justify-between text-[11px]">
                        <span className="truncate text-slate-600">
                          {i + 1}. {e.name}
                        </span>
                        <span className="tabular-nums text-sky-700">{fmt(e.ms)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[11px] text-slate-400 text-center">まだ記録なし</p>
                )}
              </div>
            </div>

            <Link
              href="/blog/100masu-keisan"
              className="block text-center text-xs text-sky-600 underline underline-offset-2"
            >
              100マス計算のやり方・効果を読む
            </Link>
          </div>
        )}

        {/* ===== プレイ ===== */}
        {phase === "play" && (
          <div className="space-y-3">
            {/* 進捗グリッド */}
            <div className="grid grid-cols-10 gap-0.5 mx-auto w-max">
              {Array.from({ length: 100 }, (_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-[3px] ${
                    i < idx ? "bg-sky-500" : i === idx ? "bg-blue-600" : "bg-sky-100 border border-sky-200"
                  }`}
                />
              ))}
            </div>

            {/* 問題 */}
            <div
              className={`rounded-2xl border px-4 py-6 text-center transition-colors ${
                wrong ? "bg-red-50 border-red-300" : "bg-white border-sky-200"
              }`}
            >
              <p className="text-5xl font-black tabular-nums text-slate-800">
                {mode === "div" ? (
                  <>
                    {a * b} <span className="text-sky-500">÷</span> {a}
                  </>
                ) : (
                  <>
                    {a} <span className="text-sky-500">{opSym}</span> {b}
                  </>
                )}
              </p>
              <p className="mt-2 text-4xl font-black tabular-nums text-sky-700 h-11">
                {input || <span className="text-sky-200">?</span>}
              </p>
            </div>

            {/* 数字パッド */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  className="py-4 rounded-lg text-2xl font-black bg-white border border-sky-200 text-slate-800 active:bg-sky-100 transition"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={backspace}
                className="py-4 rounded-lg text-lg font-bold bg-sky-100 text-sky-700 active:bg-sky-200 transition"
              >
                ⌫
              </button>
              <button
                onClick={() => pressDigit("0")}
                className="py-4 rounded-lg text-2xl font-black bg-white border border-sky-200 text-slate-800 active:bg-sky-100 transition"
              >
                0
              </button>
              <button
                onClick={() => {
                  if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                  }
                  setPhase("home");
                }}
                className="py-4 rounded-lg text-xs font-bold bg-sky-100 text-sky-600 active:bg-sky-200 transition"
              >
                やめる
              </button>
            </div>
          </div>
        )}

        {/* ===== 結果 ===== */}
        {phase === "done" && (
          <div className="space-y-3 text-center">
            <div className="rounded-2xl bg-white border border-sky-200 p-6">
              <div className="flex justify-center mb-1">
                <MathOnii size={76} />
              </div>
              <p className="text-sm text-sky-600">
                {isNewBest ? "お兄さん「自己ベスト更新、すごい！」" : "お兄さん「よくがんばったね！」"}
              </p>
              <p className="mt-2 text-4xl font-black tabular-nums text-sky-700">{fmt(finalMs)}</p>
              {resultNote && <p className="mt-1 text-sm font-bold text-sky-600">{resultNote}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {modeLabel(mode)}100マス ・ 自己ベスト {best != null ? fmt(best) : "—"}
              </p>
            </div>

            {board.length > 0 && (
              <div className="rounded-2xl bg-white border border-sky-200 p-4 text-left">
                <p className="text-xs font-bold text-sky-700 mb-2 text-center">ランキング（{modeLabel(mode)}）</p>
                <ol className="space-y-1">
                  {board.slice(0, 5).map((e, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span className="w-6 text-center text-slate-400">{i + 1}</span>
                        <span className="truncate text-slate-700">{e.name}</span>
                      </span>
                      <span className="tabular-nums text-sky-700">{fmt(e.ms)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <button
              onClick={startGame}
              className="w-full py-3 rounded-lg text-base font-black bg-sky-500 hover:bg-sky-600 text-white active:scale-[0.98] transition"
            >
              もう一回
            </button>
            <button onClick={() => setPhase("home")} className="text-xs text-sky-600 underline underline-offset-2">
              ホームへ
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
