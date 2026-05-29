"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EventConfig } from "./lib/types";
import { generateId, saveEvent } from "./lib/storage";

const SLOT_OPTIONS = [
  { label: "15分", value: 15 },
  { label: "30分", value: 30 },
  { label: "1時間", value: 60 },
];

const REQUIRED_OPTIONS = [
  { label: "指定なし", value: 0 },
  { label: "1時間以上", value: 60 },
  { label: "1時間半以上", value: 90 },
  { label: "2時間以上", value: 120 },
  { label: "3時間以上", value: 180 },
];

// 00:00〜24:00 の時刻選択肢(分)
const HOURS = Array.from({ length: 25 }, (_, h) => h);

export default function ChouseiCreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(23);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [requiredMinutes, setRequiredMinutes] = useState(0);
  const [creating, setCreating] = useState(false);

  const addDate = () => {
    if (!dateInput) return;
    if (dates.includes(dateInput)) return;
    setDates((prev) => [...prev, dateInput].sort());
    setDateInput("");
  };

  const removeDate = (d: string) => setDates((prev) => prev.filter((x) => x !== d));

  const valid = title.trim() !== "" && dates.length > 0 && endHour > startHour;

  const create = async () => {
    if (!valid || creating) return;
    setCreating(true);
    const id = generateId();
    const config: EventConfig = {
      candidateDates: dates,
      dayStart: startHour * 60,
      dayEnd: endHour * 60,
      slotMinutes,
      requiredMinutes: requiredMinutes || undefined,
    };
    await saveEvent({ id, title: title.trim(), config, createdAt: Date.now() });
    router.push(`/chousei/${id}`);
  };

  return (
    <main className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-zinc-400 hover:underline">
          ← ツール一覧
        </Link>

        <h1 className="mt-4 text-3xl font-black text-zinc-900">日程の被り調整</h1>
        <p className="mt-2 text-zinc-500">
          候補日に「何時〜何時なら空いてる」を入れてもらうだけ。全員の被ってる時間帯を自動で出します。
        </p>

        {/* タイトル */}
        <div className="mt-8">
          <label className="text-sm font-bold text-zinc-700">イベント名</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 6月の打ち上げ"
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
          />
        </div>

        {/* 候補日 */}
        <div className="mt-6">
          <label className="text-sm font-bold text-zinc-700">候補日</label>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            />
            <button
              onClick={addDate}
              className="rounded-lg bg-indigo-100 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-200 transition"
            >
              + 追加
            </button>
          </div>
          {dates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {dates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm text-indigo-800"
                >
                  {formatDateLabel(d)}
                  <button
                    onClick={() => removeDate(d)}
                    className="text-indigo-400 hover:text-indigo-700"
                    aria-label="削除"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 時間レンジ */}
        <div className="mt-6">
          <label className="text-sm font-bold text-zinc-700">入力できる時間の範囲</label>
          <div className="mt-2 flex items-center gap-2">
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            >
              {HOURS.slice(0, 24).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
            <span className="text-zinc-400">〜</span>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            >
              {HOURS.filter((h) => h > startHour).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 粒度・所要時間 */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-zinc-700">時間の刻み</label>
            <select
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            >
              {SLOT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-zinc-700">最低の長さ</label>
            <select
              value={requiredMinutes}
              onChange={(e) => setRequiredMinutes(Number(e.target.value))}
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            >
              {REQUIRED_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={create}
          disabled={!valid || creating}
          className="mt-8 w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-40"
        >
          {creating ? "作成中..." : "イベントを作成"}
        </button>
        {!valid && (
          <p className="mt-2 text-center text-xs text-zinc-400">
            イベント名と候補日(1つ以上)を入力してください
          </p>
        )}
      </div>
    </main>
  );
}

function formatDateLabel(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${wd})`;
}
