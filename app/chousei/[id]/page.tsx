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
import { rankDays, slotAvailability, slotCount, minutesToHHMM } from "../lib/overlap";

type TimeRange = { start: string; end: string }; // 分を文字列で保持("" = 未選択)
type DaySelection = { unavailable: boolean; ranges: TimeRange[] };

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
  const [canShare, setCanShare] = useState(false);
  const [bulkRanges, setBulkRanges] = useState<TimeRange[]>([{ start: "", end: "" }]);
  const [bulkNote, setBulkNote] = useState("");
  // まとめて設定の反映先曜日。index は getDay()(0=日..6=土)。既定は全曜日ON(=従来動作)。
  const [bulkDays, setBulkDays] = useState<boolean[]>(() => Array(7).fill(true));

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

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  if (loading) return <Centered>読み込み中...</Centered>;

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
  // 入力できる時刻の選択肢(分)。dayStart〜dayEnd を slotMinutes(=30) 刻みで。
  const timeOptions: number[] = [];
  for (let t = config.dayStart; t <= config.dayEnd; t += config.slotMinutes) timeOptions.push(t);
  // 候補日に実在する曜日だけチップを出す。
  const presentWeekdays = new Set(config.candidateDates.map(weekdayOf));

  const setDay = (date: string, next: Partial<DaySelection>) =>
    setSelection((prev) => ({ ...prev, [date]: { ...prev[date], ...next } }));

  const setRangeField = (date: string, ri: number, field: "start" | "end", value: string) =>
    setSelection((prev) => {
      const ranges = prev[date].ranges.map((r, i) => (i === ri ? { ...r, [field]: value } : r));
      return { ...prev, [date]: { ...prev[date], ranges } };
    });

  const addRange = (date: string) =>
    setSelection((prev) => ({
      ...prev,
      [date]: { ...prev[date], ranges: [...prev[date].ranges, { start: "", end: "" }] },
    }));

  const removeRange = (date: string, ri: number) =>
    setSelection((prev) => {
      const ranges = prev[date].ranges.filter((_, i) => i !== ri);
      return { ...prev, [date]: { ...prev[date], ranges: ranges.length ? ranges : [{ start: "", end: "" }] } };
    });

  const setAllOk = (date: string) =>
    setDay(date, { ranges: [{ start: String(config.dayStart), end: String(config.dayEnd) }] });
  const clearRanges = (date: string) => setDay(date, { ranges: [{ start: "", end: "" }] });

  // まとめて設定(全候補日に同じ時間帯を一括反映)
  const setBulkField = (ri: number, field: "start" | "end", value: string) =>
    setBulkRanges((prev) => prev.map((r, i) => (i === ri ? { ...r, [field]: value } : r)));
  const addBulkRange = () => setBulkRanges((prev) => [...prev, { start: "", end: "" }]);
  const removeBulkRange = (ri: number) =>
    setBulkRanges((prev) => {
      const next = prev.filter((_, i) => i !== ri);
      return next.length ? next : [{ start: "", end: "" }];
    });
  const setBulkAllOk = () => setBulkRanges([{ start: String(config.dayStart), end: String(config.dayEnd) }]);
  const clearBulk = () => setBulkRanges([{ start: "", end: "" }]);

  const toggleBulkDay = (idx: number) =>
    setBulkDays((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  const setBulkWeekdays = () => setBulkDays([false, true, true, true, true, true, false]); // 月〜金
  const setBulkWeekend = () => setBulkDays([true, false, false, false, false, false, true]); // 土・日
  const setBulkAllDays = () => setBulkDays(Array(7).fill(true));

  const applyBulkToAll = () => {
    const valid = bulkRanges.filter(
      (r) => r.start !== "" && r.end !== "" && Number(r.end) > Number(r.start)
    );
    if (valid.length === 0) {
      setBulkNote("時間帯を入れてください");
      return;
    }
    const targets = config.candidateDates.filter(
      (d) => !selection[d].unavailable && bulkDays[weekdayOf(d)]
    );
    if (targets.length === 0) {
      setBulkNote("反映する曜日を選んでください（×の日は対象外）");
      return;
    }
    setSelection((prev) => {
      const next = { ...prev };
      for (const date of targets) next[date] = { ...next[date], ranges: valid.map((r) => ({ ...r })) };
      return next;
    });
    setBulkNote(`${targets.length}日に反映しました（選んだ曜日・×の日は除く）`);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const byDate: ParticipantResponse["byDate"] = {};
    for (const date of config.candidateDates) {
      const day = selection[date];
      if (day.unavailable) {
        byDate[date] = { unavailable: true, intervals: [] };
      } else {
        const intervals = day.ranges
          .filter((r) => r.start !== "" && r.end !== "" && Number(r.end) > Number(r.start))
          .map((r) => ({ start: Number(r.start), end: Number(r.end) }));
        byDate[date] = { unavailable: false, intervals };
      }
    }
    await upsertResponse(id, { name: trimmed, byDate });
    saveMyName(trimmed);
    setResponses(await getResponses(id));
    setSaved(true);
    setTab("result");
    setTimeout(() => setSaved(false), 2500);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  // ワンタップ共有: スマホはネイティブ共有シート(LINE/メール等)、非対応(主にPC)はコピーへ。
  const shareUrl = async () => {
    const url = window.location.href;
    if (canShare) {
      try {
        await navigator.share({
          title: event ? event.title : "日程調整",
          text: event ? `「${event.title}」の日程を教えてください` : "日程を教えてください",
          url,
        });
        return;
      } catch {
        return; // ユーザーがキャンセルしただけ。コピーへは落とさない。
      }
    }
    await copyToClipboard();
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

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={shareUrl}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            {canShare ? "リンクを共有（LINE・メールなど）" : copied ? "コピーしました" : "リンクをコピーして共有"}
          </button>
          {canShare && (
            <button
              onClick={copyToClipboard}
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition"
            >
              {copied ? "コピーしました" : "URLをコピー"}
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-zinc-400">
          このリンクを参加者に送ると、みんなが予定を入力できます。
        </p>

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
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-base text-zinc-900"
            />

            {/* まとめて設定: 全候補日に同じ時間帯を一括反映 */}
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
              <p className="text-sm font-bold text-indigo-900">まとめて設定</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                同じ時間帯を全部の候補日に一括で入れられます（反映後に個別調整もOK）
              </p>
              <div className="mt-2 space-y-2">
                {bulkRanges.map((r, ri) => (
                  <div key={ri} className="flex items-center gap-2">
                    <TimeSelect
                      value={r.start}
                      options={timeOptions.slice(0, -1)}
                      placeholder="開始"
                      onChange={(v) => setBulkField(ri, "start", v)}
                    />
                    <span className="text-zinc-400">〜</span>
                    <TimeSelect
                      value={r.end}
                      options={timeOptions.slice(1)}
                      placeholder="終了"
                      onChange={(v) => setBulkField(ri, "end", v)}
                    />
                    <button
                      onClick={() => removeBulkRange(ri)}
                      className="ml-1 text-zinc-300 hover:text-rose-500"
                      aria-label="この時間帯を削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5">
                  <PresetBtn onClick={addBulkRange}>＋ 時間帯を追加</PresetBtn>
                  <PresetBtn onClick={setBulkAllOk}>全部OK</PresetBtn>
                  <PresetBtn onClick={clearBulk}>クリア</PresetBtn>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs font-bold text-zinc-600">反映する曜日（平日と土日で2回に分けて入力できます）</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {WEEKDAY_CHIPS.filter((w) => presentWeekdays.has(w.idx)).map((w) => (
                    <button
                      key={w.idx}
                      onClick={() => toggleBulkDay(w.idx)}
                      aria-pressed={bulkDays[w.idx]}
                      className={`h-8 w-8 rounded-full text-sm font-bold transition ${
                        bulkDays[w.idx]
                          ? "bg-indigo-600 text-white"
                          : "border border-zinc-200 bg-white text-zinc-400"
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <PresetBtn onClick={setBulkWeekdays}>平日</PresetBtn>
                  <PresetBtn onClick={setBulkWeekend}>土日</PresetBtn>
                  <PresetBtn onClick={setBulkAllDays}>全曜日</PresetBtn>
                </div>
              </div>

              <button
                onClick={applyBulkToAll}
                className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                選んだ曜日に反映
              </button>
              {bulkNote && <p className="mt-1 text-center text-xs text-indigo-700">{bulkNote}</p>}
            </div>

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
                          day.unavailable ? "bg-rose-500 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                        }`}
                      >
                        × 終日ダメ
                      </button>
                    </div>

                    {!day.unavailable && (
                      <div className="mt-3 space-y-2">
                        {day.ranges.map((r, ri) => (
                          <div key={ri} className="flex items-center gap-2">
                            <TimeSelect
                              value={r.start}
                              options={timeOptions.slice(0, -1)}
                              placeholder="開始"
                              onChange={(v) => setRangeField(date, ri, "start", v)}
                            />
                            <span className="text-zinc-400">〜</span>
                            <TimeSelect
                              value={r.end}
                              options={timeOptions.slice(1)}
                              placeholder="終了"
                              onChange={(v) => setRangeField(date, ri, "end", v)}
                            />
                            <button
                              onClick={() => removeRange(date, ri)}
                              className="ml-1 text-zinc-300 hover:text-rose-500"
                              aria-label="この時間帯を削除"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <PresetBtn onClick={() => addRange(date)}>＋ 時間帯を追加</PresetBtn>
                          <PresetBtn onClick={() => setAllOk(date)}>全部OK</PresetBtn>
                          <PresetBtn onClick={() => clearRanges(date)}>クリア</PresetBtn>
                        </div>
                      </div>
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

function TimeSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: number[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-base text-zinc-900"
    >
      <option value="">{placeholder}</option>
      {options.map((m) => (
        <option key={m} value={String(m)}>
          {minutesToHHMM(m)}
        </option>
      ))}
    </select>
  );
}

function Results({ event, responses }: { event: StoredEvent; responses: ParticipantResponse[] }) {
  const config = event.config;
  const total = responses.length;
  if (total === 0) return <p className="mt-8 text-center text-sm text-zinc-400">まだ回答がありません</p>;
  const ranked = rankDays(responses, config);
  const n = slotCount(config);
  // 全候補日のうち、いちばん多くの人が出れる窓(=おすすめ)。
  const topDay = ranked.find((r) => r.windows[0]);
  const topPick = topDay?.windows[0];

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-500">
        回答 {total}人: {responses.map((r) => r.name).join("、")}
      </p>

      {topPick && (
        <div
          className={`mt-4 rounded-2xl border p-4 ${
            topPick.isFullConsensus ? "border-green-200 bg-green-50" : "border-indigo-200 bg-indigo-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                topPick.isFullConsensus ? "bg-green-600 text-white" : "bg-indigo-600 text-white"
              }`}
            >
              {topPick.isFullConsensus ? "全員OK" : "いちばん集まれる"}
            </span>
            <span className="text-xs font-bold text-zinc-500">おすすめ候補</span>
          </div>
          <p className="mt-2 text-xl font-black text-zinc-900">
            {formatDateLabel(topDay!.date)} {minutesToHHMM(topPick.start)}〜{minutesToHHMM(topPick.end)}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {topPick.isFullConsensus
              ? `回答した${topPick.count}人全員が参加できます`
              : `${topPick.count}/${total}人が参加可能${topPick.absentees.length > 0 ? `（欠: ${topPick.absentees.join("、")}）` : ""}`}
          </p>
        </div>
      )}

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
                      style={{ backgroundColor: c === 0 ? "#f4f4f5" : `rgba(79,70,229,${0.2 + alpha * 0.8})` }}
                    />
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                <span>{minutesToHHMM(config.dayStart)}</span>
                <span>{minutesToHHMM(config.dayEnd)}</span>
              </div>

              <div className="mt-3 space-y-1.5">
                {windows.length === 0 && <p className="text-sm text-zinc-400">条件に合う時間帯がありません</p>}
                {windows.map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-zinc-800">
                      {minutesToHHMM(w.start)}〜{minutesToHHMM(w.end)}
                    </span>
                    <span className="text-zinc-500">
                      {w.isFullConsensus ? `全員(${w.count}人)` : `${w.count}人 / 欠: ${w.absentees.join("、")}`}
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

function buildSelection(ev: StoredEvent, mine: ParticipantResponse | undefined): Record<string, DaySelection> {
  const result: Record<string, DaySelection> = {};
  for (const date of ev.config.candidateDates) {
    const day = mine?.byDate[date];
    if (day && day.unavailable) {
      result[date] = { unavailable: true, ranges: [{ start: "", end: "" }] };
    } else if (day && day.intervals.length > 0) {
      result[date] = {
        unavailable: false,
        ranges: day.intervals.map((iv) => ({ start: String(iv.start), end: String(iv.end) })),
      };
    } else {
      result[date] = { unavailable: false, ranges: [{ start: "", end: "" }] };
    }
  }
  return result;
}

function formatDateLabel(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${wd})`;
}

// "YYYY-MM-DD" → getDay()(0=日..6=土)。
function weekdayOf(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).getDay();
}

// まとめて設定の曜日チップ(月始まり表示)。idx は getDay() に対応。
const WEEKDAY_CHIPS = [
  { idx: 1, label: "月" },
  { idx: 2, label: "火" },
  { idx: 3, label: "水" },
  { idx: 4, label: "木" },
  { idx: 5, label: "金" },
  { idx: 6, label: "土" },
  { idx: 0, label: "日" },
];
