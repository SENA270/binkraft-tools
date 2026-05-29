"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EventConfig } from "./lib/types";
import { generateId, saveEvent } from "./lib/storage";

const SLOT_MINUTES = 30; // 30分刻み固定
const MAX_DATES = 62; // 候補日の上限(範囲指定の暴発防止)

const HOURS = Array.from({ length: 25 }, (_, h) => h); // 00:00〜24:00

export default function ChouseiCreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(23);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");

  const addRange = () => {
    if (!rangeStart) return;
    const range = datesInRange(rangeStart, rangeEnd || rangeStart);
    if (range.length === 0) {
      setNote("終了日は開始日以降にしてください");
      return;
    }
    setDates((prev) => {
      const merged = Array.from(new Set([...prev, ...range])).sort();
      if (merged.length > MAX_DATES) {
        setNote(`候補日は最大${MAX_DATES}日までです`);
        return merged.slice(0, MAX_DATES);
      }
      setNote("");
      return merged;
    });
    setRangeStart("");
    setRangeEnd("");
  };

  const removeDate = (d: string) => setDates((prev) => prev.filter((x) => x !== d));
  const clearDates = () => setDates([]);

  const valid = title.trim() !== "" && dates.length > 0 && endHour > startHour;

  const create = async () => {
    if (!valid || creating) return;
    setCreating(true);
    const id = generateId();
    const config: EventConfig = {
      candidateDates: dates,
      dayStart: startHour * 60,
      dayEnd: endHour * 60,
      slotMinutes: SLOT_MINUTES,
    };
    await saveEvent({ id, title: title.trim(), config, createdAt: Date.now() });
    router.push(`/chousei/${id}`);
  };

  return (
    <main className="flex h-[100dvh] flex-col bg-gradient-to-b from-indigo-50 to-white">
      <div
        className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden px-4 pt-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <Link href="/" className="shrink-0 text-sm text-zinc-400 hover:underline">
          ← ツール一覧
        </Link>
        <h1 className="mt-1 shrink-0 text-2xl font-black text-zinc-900">日程の被り調整</h1>
        <p className="mt-1 shrink-0 text-xs text-zinc-500">
          候補日に「何時〜何時なら空いてる」を入れてもらうだけ。被ってる時間帯を自動で出します。
        </p>

        {/* 中身: 必要なときだけここだけ内部スクロール(画面自体は固定) */}
        <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-0.5">
          <div>
            <label className="text-sm font-bold text-zinc-700">イベント名</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 6月の打ち上げ"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-700">候補日（範囲で追加）</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900"
              />
              <span className="text-zinc-400">〜</span>
              <input
                type="date"
                value={rangeEnd}
                min={rangeStart || undefined}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900"
              />
            </div>
            <button
              onClick={addRange}
              className="mt-1.5 w-full rounded-lg bg-indigo-100 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-200 transition"
            >
              + この範囲を候補日に追加
            </button>
            <p className="mt-1 text-[11px] text-zinc-400">終了日を空にすると1日だけ追加できます。</p>
            {note && <p className="mt-1 text-[11px] text-rose-500">{note}</p>}

            {dates.length > 0 && (
              <>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500">{dates.length}日 選択中</span>
                  <button onClick={clearDates} className="text-xs text-zinc-400 hover:text-zinc-600">
                    すべて消す
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {dates.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-800"
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
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-zinc-700">入力できる時間の範囲</label>
            <div className="mt-1 flex items-center gap-2">
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900"
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
                className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900"
              >
                {HOURS.filter((h) => h > startHour).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 作成ボタン: 画面下に固定(下バーの上) */}
        <div className="shrink-0 pt-3">
          <button
            onClick={create}
            disabled={!valid || creating}
            className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:opacity-40"
          >
            {creating ? "作成中..." : "イベントを作成"}
          </button>
          {!valid && (
            <p className="mt-1 text-center text-[11px] text-zinc-400">
              イベント名と候補日(1つ以上)を入力してください
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

/** start〜end(YYYY-MM-DD)の各日を返す。end<start は空。 */
function datesInRange(start: string, end: string): string[] {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];
  const out: string[] = [];
  for (let cur = s; cur <= e && out.length <= MAX_DATES; cur = new Date(cur.getTime() + 86400000)) {
    out.push(formatYMD(cur));
  }
  return out;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDateLabel(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${wd})`;
}
