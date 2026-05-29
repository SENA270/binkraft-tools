// Googleカレンダーの busy(予定あり) から、その日の「空き時間」を出す純関数。
// 時刻はすべて「その日の00:00からの分」で扱う(types.ts の Interval と同じ単位)。
// フレームワーク非依存・副作用なしにしてテスト可能に保つ。

import type { Interval } from "./types";

/** [start,end) の集合をソート&マージ(重複・隣接を統合)。 */
function normalize(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((iv) => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

/** window から busy を差し引いた空き時間帯を返す。 */
export function subtractBusy(window: Interval, busy: Interval[]): Interval[] {
  const merged = normalize(busy);
  const free: Interval[] = [];
  let cursor = window.start;
  for (const b of merged) {
    if (b.end <= window.start || b.start >= window.end) continue; // 範囲外
    const bs = Math.max(b.start, window.start);
    if (bs > cursor) free.push({ start: cursor, end: bs });
    cursor = Math.max(cursor, Math.min(b.end, window.end));
  }
  if (cursor < window.end) free.push({ start: cursor, end: window.end });
  return free;
}

/** start を slot 上に切り上げ、end を切り下げ(入力UIの時刻候補に合わせる)。 */
function snapToSlot(iv: Interval, base: number, slot: number): Interval {
  const start = base + Math.ceil((iv.start - base) / slot) * slot;
  const end = base + Math.floor((iv.end - base) / slot) * slot;
  return { start, end };
}

/**
 * その日の空き時間を算出する。
 * - dayStart..dayEnd の範囲に限定
 * - busy を差し引く
 * - slot 境界にスナップ(選択肢に乗るように)
 * - minMinutes 未満の細切れは捨てる(細かすぎる空きは出さない=「上限/下限」の下限側)
 */
export function freeIntervalsForDay(
  busy: Interval[],
  dayStart: number,
  dayEnd: number,
  slotMinutes: number,
  minMinutes: number
): Interval[] {
  const raw = subtractBusy({ start: dayStart, end: dayEnd }, busy);
  const min = Math.max(minMinutes, slotMinutes);
  return raw
    .map((iv) => snapToSlot(iv, dayStart, slotMinutes))
    .filter((iv) => iv.end - iv.start >= min);
}
