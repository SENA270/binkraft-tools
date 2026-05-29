"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { ParticipantResponse } from "../lib/types";
import {
  getEvent,
  getResponses,
  upsertResponse,
  loadMyName,
  saveMyName,
  type StoredEvent,
} from "../lib/storage";
import {
  rankDays,
  slotAvailability,
  slotCount,
  minutesToHHMM,
  slotsToIntervals,
  intervalsToSelected,
} from "../lib/overlap";

type DaySelection = { unavailable: boolean; slots: boolean[] };

export default function ChouseiEventPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [event, setEvent] = useState<StoredEvent | null>(null);
  const [responses, setResponses] = useState<ParticipantResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"input" | "result">("input");

  const [name, setName] = useState("");
  const [selection, setSelection] = useState<Record<string, DaySelection>>({});
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const ev = await getEvent(id);
      const resp = await getResponses(id);
      setEvent(ev);
      setResponses(resp);
      if (ev) {
        const myName = loadMyName();
        setName(myName);
        const mine = resp.find((r) => r.name === myName);
        setSelection(buildSelection(ev, mine));
        if (resp.length > 0 && mine) setTab("result");
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <Centered>読み込み中...</Centered>;
  }

  if (!event) {
    return (
      <Centered>
        <p className="font-bold text-zinc-700">イベントが見つかりませんでした</p>
        <p className="mt-2 text-sm text-zinc-500">
          このリンクは別の端末で作成された可能性があります。
          <br />
          ※現在は同じ端末でのみ動作する試作版です(共有保存は次の対応)。
        </p>
        <Link href="/chousei" className="mt-4 inline-block text-sm font-bold text-indigo-600 hover:underline">
          新しく作る →
        </Link>
      </Centered>
    );
  }

  const config = event.config;
  const n = slotCount(config);

  const setDay = (date: string, next: Partial<DaySelection>) =>
    setSelection((prev) => ({ ...prev, [date]: { ...prev[date], ...next } }));

  const toggleSlot = (date: string, i: number) => {
    setSelection((prev) => {
      const day = prev[date];
      const slots = day.slots.slice();
      slots[i] = !slots[i];
      return { ...prev, [date]: { ...day, slots } };
    });
  };

  const applyPreset = (date: string, from: number, to: number, mode: "set" | "or" | "clear") => {
    setSelection((prev) => {
      const day = prev[date];
      const slots = mode === "clear" ? new Array(n).fill(false) : day.slots.slice();
      if (mode !== "clear") {
        for (let i = 0; i < n; i++) {
          const start = config.dayStart + i * config.slotMinutes;
          if (start >= from && start < to) slots[i] = true;
        }
      }
      return { ...prev, [date]: { ...day, slots } };
    });
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const byDate: ParticipantResponse["byDate"] = {};
    for (const date of config.candidateDates) {
      const day = selection[date];
      byDate[date] = day.unavailable
        ? { unavailable: true, intervals: [] }
        : { unavailable: false, intervals: slotsToIntervals(day.slots, config) };
    }
    await upsertResponse(id, { name: trimmed, byDate });
    saveMyName(trimmed);
    const resp = await getResponses(id);
    setResponses(resp);
    setSaved(true);
    setTab("result");
    setTimeout(() => setSaved(false), 2500);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <main className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/chousei" className="text-sm text-zinc-400 hover:underline">
          ← 新規作成
        </Link>

        <h1 className="mt-4 text-2xl font-black text-zinc-900">{event.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          候補 {config.candidateDates.length}日 / {minutesToHHMM(config.dayStart)}〜
          {minutesToHHMM(config.dayEnd)}
        </p>

        <button
          onClick={copyUrl}
          className="mt-3 rounded-lg bg-white border border-indigo-200 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition"
        >
          {copied ? "コピーしました" : "このページのURLをコピーして共有"}
        </button>

        {/* タブ */}
        <div className="mt-6 flex rounded-xl bg-zinc-100 p-1 text-sm font-bold">
          <button
            onClick={() => setTab("input")}
            className={`flex-1 rounded-lg py-2 transition ${tab === "input" ? "bg-white text-indigo-700 shadow" : "text-zinc-500"}`}
          >
            自分の予定を入力
          </button>
          <button
            onClick={() => setTab("result")}
            className={`flex-1 rounded-lg py-2 transition ${tab === "result" ? "bg-white text-indigo-700 shadow" : "text-zinc-500"}`}
          >
            みんなの結果 ({responses.length})
          </button>
        </div>

        {tab === "input" ? (
          <div className="mt-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="あなたの名前"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            />

            <div className="mt-4 space-y-4">
              {config.candidateDates.map((date) => {
                const day = selection[date];
                return (
                  <div key={date} className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800">{formatDateLabel(date)}</span>
                      <button
                        onClick={() => setDay(date, { unavailable: !day.unavailable })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          day.unavailable
                            ? "bg-rose-500 text-white"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        × 終日ダメ
                      </button>
                    </div>

                    {!day.unavailable && (
                      <>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <PresetBtn onClick={() => applyPreset(date, 0, 24 * 60, "set")}>
                            全部OK
                          </PresetBtn>
                          <PresetBtn onClick={() => applyPreset(date, 12 * 60, 18 * 60, "or")}>
                            午後
                          </PresetBtn>
                          <PresetBtn onClick={() => applyPreset(date, 18 * 60, 24 * 60, "or")}>
                            夜
                          </PresetBtn>
                          <PresetBtn onClick={() => applyPreset(date, 0, 0, "clear")}>
                            クリア
                          </PresetBtn>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                          {Array.from({ length: n }, (_, i) => {
                            const start = config.dayStart + i * config.slotMinutes;
                            const on = day.slots[i];
                            return (
                              <button
                                key={i}
                                onClick={() => toggleSlot(date, i)}
                                className={`rounded-md py-1.5 text-xs font-medium transition ${
                                  on
                                    ? "bg-indigo-600 text-white"
                                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                                }`}
                              >
                                {minutesToHHMM(start)}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={submit}
              disabled={!name.trim()}
              className="mt-6 w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-40"
            >
              {saved ? "保存しました" : "回答を送信"}
            </button>
          </div>
        ) : (
          <Results event={event} responses={responses} />
        )}
      </div>
    </main>
  );
}

function Results({ event, responses }: { event: StoredEvent; responses: ParticipantResponse[] }) {
  const config = event.config;
  const total = responses.length;
  if (total === 0) {
    return <p className="mt-8 text-center text-sm text-zinc-400">まだ回答がありません</p>;
  }
  const ranked = rankDays(responses, config);
  const n = slotCount(config);

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-500">
        回答 {total}人: {responses.map((r) => r.name).join("、")}
      </p>

      <div className="mt-4 space-y-3">
        {ranked.map(({ date, windows }) => {
          const counts = slotAvailability(responses, date, config).map((s) => s.length);
          const best = windows[0];
          return (
            <div key={date} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-zinc-800">{formatDateLabel(date)}</span>
                {best ? (
                  best.isFullConsensus ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                      全員OK
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                      最多 {best.count}/{total}人
                    </span>
                  )
                ) : (
                  <span className="text-xs text-zinc-400">空き時間なし</span>
                )}
              </div>

              {/* ヒートマップ */}
              <div className="mt-3 flex gap-px overflow-hidden rounded">
                {Array.from({ length: n }, (_, i) => {
                  const c = counts[i];
                  const alpha = total > 0 ? c / total : 0;
                  const start = config.dayStart + i * config.slotMinutes;
                  return (
                    <div
                      key={i}
                      title={`${minutesToHHMM(start)} — ${c}/${total}人`}
                      className="h-6 flex-1"
                      style={{
                        backgroundColor:
                          c === 0 ? "#f4f4f5" : `rgba(79,70,229,${0.2 + alpha * 0.8})`,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                <span>{minutesToHHMM(config.dayStart)}</span>
                <span>{minutesToHHMM(config.dayEnd)}</span>
              </div>

              {/* 窓 */}
              <div className="mt-3 space-y-1.5">
                {windows.length === 0 && (
                  <p className="text-sm text-zinc-400">条件に合う時間帯がありません</p>
                )}
                {windows.map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-800">
                      {minutesToHHMM(w.start)}〜{minutesToHHMM(w.end)}
                    </span>
                    <span className="text-zinc-500">
                      {w.isFullConsensus
                        ? `全員(${w.count}人)`
                        : `${w.count}人 / 欠: ${w.absentees.join("、")}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PresetBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
    >
      {children}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-20 text-center">{children}</div>
    </main>
  );
}

function buildSelection(
  ev: StoredEvent,
  mine: ParticipantResponse | undefined
): Record<string, DaySelection> {
  const n = slotCount(ev.config);
  const result: Record<string, DaySelection> = {};
  for (const date of ev.config.candidateDates) {
    const day = mine?.byDate[date];
    if (day && day.unavailable) {
      result[date] = { unavailable: true, slots: new Array(n).fill(false) };
    } else if (day) {
      result[date] = { unavailable: false, slots: intervalsToSelected(day.intervals, ev.config) };
    } else {
      result[date] = { unavailable: false, slots: new Array(n).fill(false) };
    }
  }
  return result;
}

function formatDateLabel(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${wd})`;
}
