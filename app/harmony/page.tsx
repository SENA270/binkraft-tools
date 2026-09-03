"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { framesToNotes, trackPitches, type NoteEvent } from "./lib/melody";
import {
  detectKey,
  keyLabel,
  PITCH_CLASS_NAMES,
  type Key,
  type KeyResult,
  type Mode,
} from "./lib/key";
import { harmonize, INTERVALS, noteName, type IntervalId } from "./lib/harmonize";
import { mixTracks, renderHarmony, renderLengthSec } from "./lib/synth";
import { encodeWav } from "./lib/wav";

type Phase = "idle" | "recording" | "analyzing" | "result";
type PlayMode = "harmony" | "both";

const MAX_RECORD_SEC = 30;
const ANALYSIS_RATE = 16000;
const SPEEDS = [1, 0.75, 0.5];

type AudioCtxCtor = new () => AudioContext;
type OfflineCtor = new (
  channels: number,
  length: number,
  sampleRate: number,
) => OfflineAudioContext;

function newAudioContext(): AudioContext {
  const w = window as unknown as {
    AudioContext?: AudioCtxCtor;
    webkitAudioContext?: AudioCtxCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error("このブラウザは音声処理に対応していません");
  return new Ctor();
}

function newOfflineContext(
  channels: number,
  length: number,
  sampleRate: number,
): OfflineAudioContext {
  const w = window as unknown as {
    OfflineAudioContext?: OfflineCtor;
    webkitOfflineAudioContext?: OfflineCtor;
  };
  const Ctor = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
  if (!Ctor) throw new Error("このブラウザは音声処理に対応していません");
  return new Ctor(channels, length, sampleRate);
}

/** 全チャンネルを足してモノラルにする */
function downmix(buffer: AudioBuffer): Float32Array {
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) out[i] += data[i];
  }
  if (buffer.numberOfChannels > 1) {
    for (let i = 0; i < out.length; i++) out[i] /= buffer.numberOfChannels;
  }
  return out;
}

/** 音程検出用に 16kHz へ落とす。ブラウザのリサンプラを使うので折り返しも処理される */
async function resampleForAnalysis(buffer: AudioBuffer): Promise<Float32Array> {
  const length = Math.max(1, Math.ceil(buffer.duration * ANALYSIS_RATE));
  const off = newOfflineContext(1, length, ANALYSIS_RATE);
  const src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  return rendered.getChannelData(0);
}

function formatSec(sec: number): string {
  return `${Math.floor(sec)}.${Math.floor((sec % 1) * 10)}秒`;
}

export default function HarmonyPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [voice, setVoice] = useState<{ samples: Float32Array; sampleRate: number } | null>(
    null,
  );
  const [melody, setMelody] = useState<NoteEvent[]>([]);
  const [autoKey, setAutoKey] = useState<KeyResult | null>(null);
  const [manualKey, setManualKey] = useState<Key | null>(null);

  const [interval, setIntervalId] = useState<IntervalId>("up3");
  const [speed, setSpeed] = useState(1);
  const [playMode, setPlayMode] = useState<PlayMode>("harmony");
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = newAudioContext();
    return ctxRef.current;
  }, []);

  const key: Key | null = manualKey ?? (autoKey ? { tonic: autoKey.tonic, mode: autoKey.mode } : null);

  const harmonyNotes = useMemo(
    () => (key && melody.length ? harmonize(melody, key, interval) : []),
    [key, melody, interval],
  );

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.onended = null;
        sourceRef.current.stop();
      } catch {
        // すでに止まっている
      }
      sourceRef.current = null;
    }
    setPlaying(false);
  }, []);

  // 設定を変えたら鳴っている音を止める（古い設定の音が残らないように）
  useEffect(() => {
    stopPlayback();
  }, [interval, speed, playMode, key?.tonic, key?.mode, stopPlayback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const analyze = useCallback(
    async (data: Blob) => {
      setPhase("analyzing");
      setError(null);
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const decoded = await ctx.decodeAudioData(await data.arrayBuffer());

        const analysisSamples = await resampleForAnalysis(decoded);
        const { midiFrames, hopSec } = trackPitches(analysisSamples, ANALYSIS_RATE);
        const notes = framesToNotes(midiFrames, hopSec);

        if (notes.length < 2) {
          setError(
            "歌の音程が取れませんでした。マイクに近づいて、伸ばし気味に「あー」で歌ってみてください（ハミングでもOK）。",
          );
          setPhase("idle");
          return;
        }

        setVoice({ samples: downmix(decoded), sampleRate: decoded.sampleRate });
        setMelody(notes);
        setAutoKey(detectKey(notes));
        setManualKey(null);
        setPhase("result");
      } catch (e) {
        setError(
          e instanceof Error
            ? `音声を読み込めませんでした: ${e.message}`
            : "音声を読み込めませんでした",
        );
        setPhase("idle");
      }
    },
    [getCtx],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof MediaRecorder === "undefined") {
      setError("このブラウザは録音に対応していません。音声ファイルを選ぶ方法をお試しください。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setError("録音できませんでした。もう一度お試しください。");
          setPhase("idle");
          return;
        }
        void analyze(blob);
      };
      rec.start();
      setPhase("recording");
      setElapsed(0);
      const started = Date.now();
      timerRef.current = window.setInterval(() => {
        const sec = (Date.now() - started) / 1000;
        setElapsed(sec);
        if (sec >= MAX_RECORD_SEC) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          recorderRef.current?.stop();
        }
      }, 100);
    } catch {
      setError(
        "マイクを使えませんでした。ブラウザのマイク許可を確認してください（アドレスバーの鍵アイコン）。",
      );
    }
  }, [analyze]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.stop();
  }, []);

  /** 再生・書き出しで使う波形を作る。両方これを通すのでファイルと再生音が必ず一致する */
  const buildSamples = useCallback(
    (mode: PlayMode, rate: number, timeScale: number): Float32Array => {
      const harmony = renderHarmony(harmonyNotes, rate, { timeScale });
      if (mode === "harmony" || !voice) return harmony;
      return mixTracks([{ samples: voice.samples, gain: 0.85 }, { samples: harmony }]);
    },
    [harmonyNotes, voice],
  );

  const play = useCallback(() => {
    if (!harmonyNotes.length) return;
    stopPlayback();
    const ctx = getCtx();
    void ctx.resume();
    // 一緒に鳴らすときは声の速さを変えられないので原速に固定する
    const scale = playMode === "both" ? 1 : speed;
    const samples = buildSamples(playMode, ctx.sampleRate, scale);
    if (samples.length === 0) return;

    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    src.connect(ctx.destination);
    src.onended = () => {
      sourceRef.current = null;
      setPlaying(false);
    };
    src.start();
    sourceRef.current = src;
    setPlaying(true);
  }, [buildSamples, getCtx, harmonyNotes.length, loop, playMode, speed, stopPlayback]);

  const download = useCallback(
    (mode: PlayMode) => {
      if (!harmonyNotes.length) return;
      const rate = 44100;
      const scale = mode === "both" ? 1 : speed;
      const samples = buildSamples(mode, rate, scale);
      const blob = new Blob([encodeWav(samples, rate)], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const speedTag = mode === "harmony" && scale !== 1 ? `-${Math.round(scale * 100)}` : "";
      a.href = url;
      a.download = `hamori-${interval}${mode === "both" ? "-with-voice" : ""}${speedTag}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [buildSamples, harmonyNotes.length, interval, speed],
  );

  const reset = useCallback(() => {
    stopPlayback();
    setPhase("idle");
    setVoice(null);
    setMelody([]);
    setAutoKey(null);
    setManualKey(null);
    setError(null);
    setElapsed(0);
  }, [stopPlayback]);

  const keyUncertain = autoKey !== null && (autoKey.score < 0.6 || autoKey.margin < 0.05);
  const totalSec = melody.length ? Math.max(...melody.map((n) => n.end)) : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
          ハモリメーカー
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          歌うだけで、ハモリのパートを作ります。<br className="sm:hidden" />
          キーに合わせて長短を切り替えるので、一律に音をずらしたときの
          <span className="font-bold text-zinc-800">「なんか外れてる」</span>が起きません。
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          {error}
        </div>
      )}

      {(phase === "idle" || phase === "recording" || phase === "analyzing") && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {phase === "analyzing" ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-600" />
              <p className="mt-4 text-sm text-zinc-600">音程を解析しています…</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4">
                {phase === "recording" ? (
                  <>
                    <div className="flex items-center gap-2 text-sm font-bold text-rose-600">
                      <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
                      録音中 {formatSec(elapsed)} / {MAX_RECORD_SEC}秒
                    </div>
                    <button
                      onClick={stopRecording}
                      className="rounded-2xl bg-zinc-900 px-8 py-4 text-lg font-bold text-white shadow-md transition hover:bg-zinc-700"
                    >
                      録音をとめる
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startRecording}
                      className="rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 px-10 py-4 text-lg font-bold text-white shadow-md transition hover:scale-105"
                    >
                      歌って録音する
                    </button>
                    <label className="cursor-pointer text-sm text-indigo-700 underline hover:text-indigo-900">
                      音声ファイルを選ぶ
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void analyze(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="mt-8 border-t border-zinc-100 pt-6">
                <p className="mb-2 text-xs font-bold text-zinc-500">きれいに取るコツ</p>
                <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-600">
                  <li>・伴奏は入れずに、歌だけを録る（伴奏があると音程を拾えません）</li>
                  <li>・歌詞ではなく「あー」やハミングのほうが正確に出ます</li>
                  <li>・8〜16秒くらいの短いフレーズが扱いやすいです</li>
                </ul>
              </div>
            </>
          )}
        </section>
      )}

      {phase === "result" && key && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-zinc-800">キー（調）</h2>
              <span className="text-xs text-zinc-500">
                {melody.length}音 / {formatSec(totalSec)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-lg font-black text-indigo-800">
                {keyLabel(key)}
              </span>
              {manualKey === null && autoKey && (
                <span className="text-xs text-zinc-500">自動判定</span>
              )}
              {manualKey !== null && (
                <button
                  onClick={() => setManualKey(null)}
                  className="text-xs text-indigo-700 underline"
                >
                  自動判定に戻す
                </button>
              )}
            </div>

            {keyUncertain && manualKey === null && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                このフレーズは短いか音数が少ないため、キーの判定に自信がありません。
                ハモリが気持ち悪ければ、下から手で選んでください。
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <select
                value={key.tonic}
                onChange={(e) =>
                  setManualKey({ tonic: Number(e.target.value), mode: key.mode })
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                aria-label="主音"
              >
                {PITCH_CLASS_NAMES.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={key.mode}
                onChange={(e) =>
                  setManualKey({ tonic: key.tonic, mode: e.target.value as Mode })
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                aria-label="長調か短調"
              >
                <option value="major">メジャー（明るい）</option>
                <option value="minor">マイナー（暗い）</option>
              </select>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-800">どのハモリにする？</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {INTERVALS.map((spec) => (
                <button
                  key={spec.id}
                  onClick={() => setIntervalId(spec.id)}
                  className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                    interval === spec.id
                      ? "border-indigo-600 bg-indigo-600 text-white shadow"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  {spec.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              上ハモが高すぎて歌えないときは 3度下、薄いと感じたら 6度上が合いやすいです。
            </p>
          </section>

          <NoteRoll melody={melody} harmony={harmonyNotes} />

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-800">聞く</h2>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  ["harmony", "ハモリだけ"],
                  ["both", "歌と一緒に"],
                ] as [PlayMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setPlayMode(mode)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                    playMode === mode
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500">速さ</span>
                {playMode === "both" && (
                  <span className="text-xs text-zinc-400">一緒に鳴らすときは原速のみ</span>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    disabled={playMode === "both"}
                    onClick={() => setSpeed(s)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      speed === s && playMode !== "both"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                        : "border-zinc-300 bg-white text-zinc-600"
                    }`}
                  >
                    {s === 1 ? "原速" : `${Math.round(s * 100)}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="flex items-center justify-end gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                繰り返して流す
              </label>
              <button
                onClick={playing ? stopPlayback : play}
                className="mt-2 w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-4 text-lg font-bold text-white shadow-md transition hover:scale-[1.02]"
              >
                {playing ? "とめる" : "再生"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-zinc-800">送る</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              WAVで保存されます。そのまま LINE や Discord に添付して送れます。
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => download("harmony")}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-800 transition hover:border-zinc-400"
              >
                ハモリだけを保存
                {speed !== 1 && <span className="font-normal">（{Math.round(speed * 100)}%）</span>}
              </button>
              <button
                onClick={() => download("both")}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-800 transition hover:border-zinc-400"
              >
                歌と一緒に保存
              </button>
            </div>
          </section>

          <div className="flex justify-center pt-2">
            <button
              onClick={reset}
              className="rounded-2xl bg-zinc-900 px-8 py-3 text-sm font-bold text-white shadow transition hover:bg-zinc-700"
            >
              録り直す
            </button>
          </div>
        </div>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-sm text-zinc-400 transition hover:text-zinc-700 hover:underline"
        >
          ← binkraft tools へ戻る
        </Link>
      </div>
    </main>
  );
}

/** 時間を横、音の高さを縦にした帯。どこでどの音を歌うかを目で追えるようにする */
function NoteRoll({ melody, harmony }: { melody: NoteEvent[]; harmony: NoteEvent[] }) {
  const all = [...melody, ...harmony];
  if (all.length === 0) return null;

  const minMidi = Math.min(...all.map((n) => n.midi)) - 1;
  const maxMidi = Math.max(...all.map((n) => n.midi)) + 1;
  const endSec = Math.max(...all.map((n) => n.end));
  const rows = maxMidi - minMidi + 1;

  const ROW_H = 11;
  const WIDTH = 1000;
  const height = rows * ROW_H;

  const x = (sec: number) => (sec / endSec) * WIDTH;
  const y = (midi: number) => (maxMidi - midi) * ROW_H;

  const rect = (n: NoteEvent, fill: string) => (
    <rect
      key={`${n.midi}-${n.start}`}
      x={x(n.start)}
      y={y(n.midi) + 1}
      width={Math.max(2, x(n.end) - x(n.start) - 1)}
      height={ROW_H - 2}
      rx={2}
      fill={fill}
    />
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-800">歌う音</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-600">
            <span className="inline-block h-2.5 w-4 rounded bg-zinc-400" />元の歌
          </span>
          <span className="flex items-center gap-1.5 text-zinc-600">
            <span className="inline-block h-2.5 w-4 rounded bg-indigo-500" />ハモリ
          </span>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="h-auto w-full min-w-[280px]"
          style={{ maxHeight: 260 }}
          role="img"
          aria-label="ハモリの音の並び"
        >
          {Array.from({ length: rows }, (_, i) => {
            const midi = maxMidi - i;
            // 白鍵と黒鍵で背景を分けて、高さの目印にする
            const black = [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
            return (
              <rect
                key={midi}
                x={0}
                y={i * ROW_H}
                width={WIDTH}
                height={ROW_H}
                fill={black ? "#f4f4f5" : "#ffffff"}
              />
            );
          })}
          {melody.map((n) => rect(n, "#a1a1aa"))}
          {harmony.map((n) => rect(n, "#6366f1"))}
        </svg>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-zinc-500">ハモリの音名（順番）</p>
        <div className="flex flex-wrap gap-1.5">
          {harmony.map((n, i) => {
            const name = noteName(n.midi);
            return (
              <span
                key={i}
                className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-900"
                title={`${melody[i] ? noteName(melody[i].midi).letter : ""} → ${name.letter}`}
              >
                {name.solfege}
                <span className="ml-1 font-normal text-indigo-500">{name.letter}</span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
