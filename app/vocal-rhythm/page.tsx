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

const NOTE_NAME: Record<number, string> = {
  16: "全",
  12: "付点2分",
  8: "2分",
  6: "付点4分",
  4: "4分",
  3: "付点8分",
  2: "8分",
  1: "16分",
};

const REST_NAME: Record<number, string> = {
  16: "全休",
  12: "付点2分休",
  8: "2分休",
  6: "付点4分休",
  4: "4分休",
  3: "付点8分休",
  2: "8分休",
  1: "16分休",
};

function NoteGlyph({ length }: { length: number }) {
  const dotted = length === 12 || length === 6 || length === 3;
  const base = length === 12 ? 8 : length === 6 ? 4 : length === 3 ? 2 : length;
  const isHollow = base === 16 || base === 8;
  const noStem = base === 16;
  let flags = 0;
  if (base === 2) flags = 1;
  if (base === 1) flags = 2;

  return (
    <svg viewBox="0 0 28 40" className="h-10 w-7" aria-hidden>
      {isHollow ? (
        <ellipse
          cx="7"
          cy="32"
          rx="5"
          ry="3.5"
          fill="white"
          stroke="currentColor"
          strokeWidth="2"
        />
      ) : (
        <ellipse cx="7" cy="32" rx="5" ry="3.5" fill="currentColor" />
      )}
      {!noStem && (
        <line
          x1="12"
          y1="32"
          x2="12"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {flags >= 1 && (
        <path
          d="M 12 6 Q 22 10 20 18"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {flags >= 2 && (
        <path
          d="M 12 13 Q 22 17 20 25"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {dotted && <circle cx="16" cy="32" r="1.6" fill="currentColor" />}
    </svg>
  );
}

function RestGlyph({ length }: { length: number }) {
  const dotted = length === 12 || length === 6 || length === 3;
  const base = length === 12 ? 8 : length === 6 ? 4 : length === 3 ? 2 : length;

  return (
    <svg viewBox="0 0 28 40" className="h-10 w-7" aria-hidden>
      {base === 16 && (
        <rect x="7" y="16" width="14" height="5" fill="currentColor" />
      )}
      {base === 8 && (
        <rect x="7" y="22" width="14" height="5" fill="currentColor" />
      )}
      {base === 4 && (
        <path
          d="M 9 8 L 17 14 L 9 22 L 17 28 L 11 34 L 18 36"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {base === 2 && (
        <>
          <line
            x1="8"
            y1="32"
            x2="18"
            y2="10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse
            cx="16"
            cy="14"
            rx="3"
            ry="2.5"
            fill="currentColor"
            transform="rotate(-25 16 14)"
          />
        </>
      )}
      {base === 1 && (
        <>
          <line
            x1="7"
            y1="34"
            x2="20"
            y2="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse
            cx="18"
            cy="10"
            rx="3"
            ry="2.5"
            fill="currentColor"
            transform="rotate(-25 18 10)"
          />
          <ellipse
            cx="12"
            cy="22"
            rx="3"
            ry="2.5"
            fill="currentColor"
            transform="rotate(-25 12 22)"
          />
        </>
      )}
      {dotted && (
        <circle
          cx={base >= 8 ? 24 : 22}
          cy={base >= 8 ? 24 : 16}
          r="1.6"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

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

function scheduleNote(audioCtx: AudioContext, time: number, duration: number) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.value = 600;
  const attack = 0.008;
  const release = 0.03;
  const sustainEnd = Math.max(attack, duration - release);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.2, time + attack);
  gain.gain.setValueAtTime(0.2, time + sustainEnd);
  gain.gain.linearRampToValueAtTime(0, time + duration);
  osc.start(time);
  osc.stop(time + duration + 0.05);
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
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const eventsRef = useRef<RawEvent[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordEndRef = useRef<number>(0);
  const beatTimersRef = useRef<number[]>([]);
  const finishTimerRef = useRef<number | null>(null);
  const isPressedRef = useRef(false);

  const playbackCtxRef = useRef<AudioContext | null>(null);
  const playbackTimerRef = useRef<number | null>(null);

  const cleanupRecording = useCallback(() => {
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

  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current !== null) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const cleanupAll = useCallback(() => {
    cleanupRecording();
    stopPlayback();
  }, [cleanupRecording, stopPlayback]);

  const start = useCallback(() => {
    cleanupAll();
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
      cleanupRecording();
    }, finishDelayMs);
  }, [bpm, cleanupAll, cleanupRecording]);

  const cancel = useCallback(() => {
    cleanupAll();
    setPhase("idle");
    setCurrentBeat(0);
  }, [cleanupAll]);

  const reset = useCallback(() => {
    cleanupAll();
    setPhase("idle");
    setCurrentBeat(0);
    setBars([]);
  }, [cleanupAll]);

  const playback = useCallback(() => {
    stopPlayback();
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    playbackCtxRef.current = ctx;
    setIsPlaying(true);

    const startAt = ctx.currentTime + 0.1;
    const secPerBeat = 60 / bpm;
    const secPer16th = secPerBeat / 4;

    for (let i = 0; i < BARS * BEATS_PER_BAR; i++) {
      scheduleClick(ctx, startAt + i * secPerBeat, i % BEATS_PER_BAR === 0);
    }

    bars.forEach((bar, barIdx) => {
      let cursor = barIdx * SIXTEENTHS_PER_BAR;
      bar.tokens.forEach((t) => {
        if (t.kind === "note") {
          const noteStart = startAt + cursor * secPer16th;
          const duration = t.length * secPer16th;
          scheduleNote(ctx, noteStart, duration);
        }
        cursor += t.length;
      });
    });

    const totalSec = BARS * BEATS_PER_BAR * secPerBeat;
    playbackTimerRef.current = window.setTimeout(
      () => stopPlayback(),
      (totalSec + 0.5) * 1000,
    );
  }, [bars, bpm, stopPlayback]);

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
    return () => cleanupAll();
  }, [cleanupAll]);

  const noteListText = bars
    .map((b) => {
      const items = b.tokens.map((t) => {
        const map = t.kind === "note" ? NOTE_NAME : REST_NAME;
        return map[t.length];
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
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-zinc-900">リズム譜</h2>
              <button
                onClick={isPlaying ? stopPlayback : playback}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition ${
                  isPlaying
                    ? "bg-zinc-700 hover:bg-zinc-800"
                    : "bg-rose-500 hover:bg-rose-600"
                }`}
              >
                {isPlaying ? "■ 停止" : "▶ 再生"}
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {bars.map((b) => (
                <div
                  key={b.bar}
                  className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-3 border border-zinc-200"
                >
                  <span className="shrink-0 text-xs font-bold text-zinc-400 w-6 text-center">
                    {b.bar}
                  </span>
                  <div
                    className="flex-1 grid gap-px"
                    style={{
                      gridTemplateColumns: `repeat(${SIXTEENTHS_PER_BAR}, minmax(0, 1fr))`,
                    }}
                  >
                    {b.tokens.length === 0 ? (
                      <div
                        style={{ gridColumn: `span ${SIXTEENTHS_PER_BAR}` }}
                        className="flex items-center justify-center rounded bg-zinc-100 py-3 text-xs text-zinc-400"
                      >
                        （無音）
                      </div>
                    ) : (
                      b.tokens.map((t, idx) => {
                        const name =
                          t.kind === "note" ? NOTE_NAME[t.length] : REST_NAME[t.length];
                        return (
                          <div
                            key={idx}
                            style={{ gridColumn: `span ${t.length}` }}
                            className={`flex flex-col items-center justify-end rounded px-1 py-1 ${
                              t.kind === "note"
                                ? "bg-rose-100 text-rose-900 border border-rose-200"
                                : "bg-zinc-200 text-zinc-700 border border-zinc-300"
                            }`}
                          >
                            {t.kind === "note" ? (
                              <NoteGlyph length={t.length} />
                            ) : (
                              <RestGlyph length={t.length} />
                            )}
                            <span className="text-[9px] mt-1 leading-none whitespace-nowrap">
                              {name}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              縦線=拍。各小節は同じ幅で表示しています。
            </p>
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
