"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

type Phase = "idle" | "countdown" | "recording" | "result";

type RawEvent = { time: number; type: "down" | "up" };

type NoteToken = { kind: "note" | "rest"; length: number };

type BarTokens = { bar: number; tokens: NoteToken[] };

const BARS = 4;
const BEATS_PER_BAR = 4;
const SIXTEENTHS_PER_BAR = 16;
const TOTAL_SIXTEENTHS = BARS * SIXTEENTHS_PER_BAR;

const NOTE_VALUES = [16, 12, 8, 6, 4, 3, 2, 1] as const;

const NOTE_LABELS: Record<number, { symbol: string; name: string; xml: string }> = {
  16: { symbol: "𝅝", name: "全", xml: "whole" },
  12: { symbol: "𝅗𝅥.", name: "付点2分", xml: "half." },
  8: { symbol: "𝅗𝅥", name: "2分", xml: "half" },
  6: { symbol: "♩.", name: "付点4分", xml: "quarter." },
  4: { symbol: "♩", name: "4分", xml: "quarter" },
  3: { symbol: "♪.", name: "付点8分", xml: "eighth." },
  2: { symbol: "♪", name: "8分", xml: "eighth" },
  1: { symbol: "𝅘𝅥𝅯", name: "16分", xml: "16th" },
};

const REST_LABELS: Record<number, { symbol: string; name: string }> = {
  16: { symbol: "𝄻", name: "全休" },
  12: { symbol: "𝄼.", name: "付点2分休" },
  8: { symbol: "𝄼", name: "2分休" },
  6: { symbol: "𝄽.", name: "付点4分休" },
  4: { symbol: "𝄽", name: "4分休" },
  3: { symbol: "𝄾.", name: "付点8分休" },
  2: { symbol: "𝄾", name: "8分休" },
  1: { symbol: "𝄿", name: "16分休" },
};

function scheduleClick(audioCtx: AudioContext, time: number, isDownbeat: boolean) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = isDownbeat ? 1400 : 900;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(isDownbeat ? 0.4 : 0.25, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
  osc.start(time);
  osc.stop(time + 0.07);
}

function quantize(events: RawEvent[], recordStart: number, secPer16th: number): boolean[] {
  const slots: boolean[] = new Array(TOTAL_SIXTEENTHS).fill(false);
  const sorted = [...events].sort((a, b) => a.time - b.time);
  for (let i = 0; i < TOTAL_SIXTEENTHS; i++) {
    const t = recordStart + (i + 0.5) * secPer16th;
    let pressed = false;
    for (const e of sorted) {
      if (e.time <= t) pressed = e.type === "down";
      else break;
    }
    slots[i] = pressed;
  }
  return slots;
}

function slotsToTokens(slots: boolean[]): BarTokens[] {
  const bars: BarTokens[] = [];
  for (let b = 0; b < BARS; b++) {
    const start = b * SIXTEENTHS_PER_BAR;
    const end = start + SIXTEENTHS_PER_BAR;
    const tokens: NoteToken[] = [];
    let i = start;
    while (i < end) {
      const isNote = slots[i];
      let j = i;
      while (j < end && slots[j] === isNote) j++;
      let r = j - i;
      for (const v of NOTE_VALUES) {
        while (r >= v) {
          tokens.push({ kind: isNote ? "note" : "rest", length: v });
          r -= v;
        }
      }
      i = j;
    }
    bars.push({ bar: b + 1, tokens });
  }
  return bars;
}

export default function VocalRhythmPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [bpm, setBpm] = useState(120);
  const [bars, setBars] = useState<BarTokens[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [copied, setCopied] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const eventsRef = useRef<RawEvent[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordEndRef = useRef<number>(0);
  const beatTimersRef = useRef<number[]>([]);
  const finishTimerRef = useRef<number | null>(null);
  const isPressedRef = useRef(false);

  const cleanup = useCallback(() => {
    beatTimersRef.current.forEach((id) => clearTimeout(id));
    beatTimersRef.current = [];
    if (finishTimerRef.current !== null) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    isPressedRef.current = false;
  }, []);

  const start = useCallback(() => {
    cleanup();
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioCtx = new Ctor();
    audioCtxRef.current = audioCtx;
    eventsRef.current = [];
    setBars([]);
    setCurrentBeat(0);

    const startAt = audioCtx.currentTime + 0.15;
    const secPerBeat = 60 / bpm;
    const totalBeats = (BARS + 1) * BEATS_PER_BAR;

    for (let i = 0; i < totalBeats; i++) {
      const t = startAt + i * secPerBeat;
      const isDownbeat = i % BEATS_PER_BAR === 0;
      scheduleClick(audioCtx, t, isDownbeat);
    }

    const recordStart = startAt + BEATS_PER_BAR * secPerBeat;
    const recordEnd = recordStart + BARS * BEATS_PER_BAR * secPerBeat;
    recordStartRef.current = recordStart;
    recordEndRef.current = recordEnd;

    setPhase("countdown");

    for (let i = 0; i < totalBeats; i++) {
      const t = startAt + i * secPerBeat;
      const delayMs = Math.max(0, (t - audioCtx.currentTime) * 1000);
      const id = window.setTimeout(() => {
        setCurrentBeat(i);
        if (i === BEATS_PER_BAR) {
          setPhase("recording");
          if (isPressedRef.current) {
            eventsRef.current.push({ time: recordStart, type: "down" });
          }
        }
      }, delayMs);
      beatTimersRef.current.push(id);
    }

    const finishDelayMs = (recordEnd - audioCtx.currentTime) * 1000 + 150;
    finishTimerRef.current = window.setTimeout(() => {
      const secPer16th = secPerBeat / 4;
      const slots = quantize(eventsRef.current, recordStart, secPer16th);
      const result = slotsToTokens(slots);
      setBars(result);
      setPhase("result");
      cleanup();
    }, finishDelayMs);
  }, [bpm, cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    setPhase("idle");
    setCurrentBeat(0);
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setPhase("idle");
    setCurrentBeat(0);
    setBars([]);
  }, [cleanup]);

  useEffect(() => {
    if (phase !== "countdown" && phase !== "recording") return;

    const handleDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (e.repeat) return;
      if (isPressedRef.current) return;
      isPressedRef.current = true;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const t = ctx.currentTime;
      if (phase === "recording" && t >= recordStartRef.current && t <= recordEndRef.current) {
        eventsRef.current.push({ time: t, type: "down" });
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (!isPressedRef.current) return;
      isPressedRef.current = false;
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const t = ctx.currentTime;
      if (phase === "recording" && t >= recordStartRef.current && t <= recordEndRef.current) {
        eventsRef.current.push({ time: t, type: "up" });
      }
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [phase]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const noteListText = bars
    .map((b) => {
      const items = b.tokens.map((t) => {
        const map = t.kind === "note" ? NOTE_LABELS : REST_LABELS;
        return map[t.length].name;
      });
      return `${b.bar}小節目: ${items.length ? items.join(" / ") : "（無音）"}`;
    })
    .join("\n");

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(noteListText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }, [noteListText]);

  const beatInBar = currentBeat % BEATS_PER_BAR;
  const barIndex = Math.floor(currentBeat / BEATS_PER_BAR);

  return (
    <main className="flex-1 mx-auto max-w-3xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900">
          ボーカルリズム入力
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          歌いたいリズムをスペースキーで打ち込むだけ。MuseScore 転記用の音符列が出ます。
        </p>
      </div>

      {phase === "idle" && (
        <section className="mt-10 rounded-2xl bg-white border border-zinc-200 p-8 shadow-sm">
          <div className="flex flex-col items-center gap-6">
            <label className="flex items-center gap-3 text-zinc-700">
              <span className="font-bold">BPM</span>
              <input
                type="number"
                min={40}
                max={240}
                value={bpm}
                onChange={(e) =>
                  setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 120)))
                }
                className="w-24 rounded-xl border border-zinc-300 px-3 py-2 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </label>
            <button
              onClick={start}
              className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 px-8 py-4 text-lg font-bold text-white shadow-md transition hover:scale-105"
            >
              録音スタート
            </button>
            <div className="text-xs text-zinc-500 text-center space-y-1">
              <p>1小節カウントダウン → 4小節分の録音</p>
              <p>
                <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px]">
                  Space
                </kbd>
                {" "}を押している間=音符、離している間=休符
              </p>
              <p>16分音符単位にスナップされます</p>
            </div>
          </div>
        </section>
      )}

      {(phase === "countdown" || phase === "recording") && (
        <section className="mt-10 rounded-2xl bg-white border border-zinc-200 p-8 shadow-sm">
          <div className="text-center">
            <div
              className={`text-sm font-bold ${
                phase === "countdown" ? "text-amber-600" : "text-rose-600"
              }`}
            >
              {phase === "countdown" ? "カウントダウン中" : "録音中"}
            </div>
            <div className="mt-4 text-7xl font-black text-zinc-900">
              {phase === "countdown" ? `${beatInBar + 1}` : `${barIndex} / ${BARS}`}
            </div>
            <div className="mt-2 text-zinc-500">
              {phase === "countdown"
                ? `カウント拍 (${beatInBar + 1}/${BEATS_PER_BAR})`
                : `小節 ・ ${beatInBar + 1}/${BEATS_PER_BAR} 拍`}
            </div>
            <div className="mt-8 flex justify-center gap-3">
              {Array.from({ length: BEATS_PER_BAR }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full transition ${
                    i === beatInBar
                      ? phase === "countdown"
                        ? "bg-amber-500 scale-125"
                        : "bg-rose-500 scale-125"
                      : "bg-zinc-200"
                  }`}
                />
              ))}
            </div>
            <div className="mt-10 text-zinc-700">
              <kbd className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 px-8 py-4 text-2xl font-bold shadow-sm">
                Space
              </kbd>
              <p className="mt-3 text-sm">
                押している間=音符、離している間=休符
              </p>
            </div>
            <button
              onClick={cancel}
              className="mt-8 text-sm text-zinc-400 hover:text-zinc-700 hover:underline"
            >
              中止する
            </button>
          </div>
        </section>
      )}

      {phase === "result" && (
        <section className="mt-10 space-y-6">
          <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900">リズム譜</h2>
            <div className="mt-4 grid gap-3">
              {bars.map((b) => (
                <div
                  key={b.bar}
                  className="flex items-start gap-3 rounded-xl bg-zinc-50 px-3 py-3 border border-zinc-200"
                >
                  <span className="shrink-0 text-xs font-bold text-zinc-400 w-8 pt-2">
                    {b.bar}
                  </span>
                  <div className="flex flex-wrap items-end gap-1.5">
                    {b.tokens.length === 0 && (
                      <span className="text-xs text-zinc-400">（無音）</span>
                    )}
                    {b.tokens.map((t, idx) => {
                      const map = t.kind === "note" ? NOTE_LABELS : REST_LABELS;
                      const lbl = map[t.length];
                      return (
                        <span
                          key={idx}
                          className={`inline-flex flex-col items-center justify-end rounded-lg px-2 py-1.5 min-w-[48px] ${
                            t.kind === "note"
                              ? "bg-rose-100 text-rose-900 border border-rose-200"
                              : "bg-zinc-200 text-zinc-700 border border-zinc-300"
                          }`}
                        >
                          <span className="text-2xl leading-none">{lbl.symbol}</span>
                          <span className="text-[10px] mt-1 leading-none">
                            {lbl.name}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-zinc-900">
                音符列（MuseScore 転記用）
              </h2>
              <button
                onClick={copyText}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-700"
              >
                {copied ? "✓ コピー済" : "コピー"}
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm text-zinc-800 border border-zinc-200 font-mono">
              {noteListText}
            </pre>
            <p className="mt-3 text-xs text-zinc-500">
              MuseScore で同じリズムを上から順に入力してください。音程は別途お好みで。
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={reset}
              className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 px-8 py-4 text-lg font-bold text-white shadow-md transition hover:scale-105"
            >
              もう一度
            </button>
          </div>
        </section>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-zinc-700 hover:underline"
        >
          ← binkraft tools へ戻る
        </Link>
      </div>
    </main>
  );
}
