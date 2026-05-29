// 被り算出エンジン(純関数・フレームワーク非依存)。
// このツールの「核心=信頼性」なので、入出力を単純な値だけにしてテスト可能に保つ。
//
// 方針: 1日を slotMinutes 刻みのスロット列に離散化し、各スロットで「空いている人の集合」を持つ。
// 連続した窓を抽出するときは、窓内の全スロットで共通して空いている人(=集合の積)を出席者とする。

import type {
  EventConfig,
  Interval,
  OverlapWindow,
  ParticipantResponse,
} from "./types";

/** "HH:MM" → 分。 */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 分 → "HH:MM"(24h)。 */
export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** イベントの1日のスロット数。 */
export function slotCount(config: EventConfig): number {
  return Math.max(0, Math.ceil((config.dayEnd - config.dayStart) / config.slotMinutes));
}

/** スロット index i がカバーする時間帯 [start, end)。 */
function slotRange(config: EventConfig, i: number): Interval {
  const start = config.dayStart + i * config.slotMinutes;
  const end = Math.min(start + config.slotMinutes, config.dayEnd);
  return { start, end };
}

/** ある時間帯集合が、スロット i を完全に覆っているか(部分的でなく丸ごと空いている時だけ可とする)。 */
function intervalsCoverSlot(intervals: Interval[], slot: Interval): boolean {
  return intervals.some((iv) => iv.start <= slot.start && iv.end >= slot.end);
}

/**
 * ある日の各スロットについて「空いている人名の集合」を返す。
 * × の日・回答なしの人はそのスロットに含めない。
 */
export function slotAvailability(
  responses: ParticipantResponse[],
  date: string,
  config: EventConfig
): string[][] {
  const n = slotCount(config);
  const result: string[][] = Array.from({ length: n }, () => []);
  for (const r of responses) {
    const day = r.byDate[date];
    if (!day || day.unavailable) continue;
    for (let i = 0; i < n; i++) {
      if (intervalsCoverSlot(day.intervals, slotRange(config, i))) {
        result[i].push(r.name);
      }
    }
  }
  return result;
}

/** 配列の積集合(順序は a 基準)。 */
function intersect(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/**
 * 指定したスロットごとの出席者集合から、「count 人以上が連続して出れる窓」を抽出する。
 * - minCount 未満のスロットで窓を切る。
 * - requiredMinutes 以上の長さの窓だけ返す。
 * - 出席者は窓内全スロットの積集合(全スロットで空いている人だけ)。
 */
function extractWindows(
  slots: string[][],
  date: string,
  config: EventConfig,
  total: number,
  minCount: number,
  allNames: string[]
): OverlapWindow[] {
  const required = config.requiredMinutes ?? config.slotMinutes;
  const windows: OverlapWindow[] = [];
  let runStart = -1;
  let runPeople: string[] | null = null;

  const closeRun = (endIdx: number) => {
    if (runStart < 0 || runPeople === null) return;
    const start = slotRange(config, runStart).start;
    const end = slotRange(config, endIdx - 1).end;
    if (end - start >= required && runPeople.length >= minCount) {
      const attendees = runPeople;
      // 出れない人 = 回答者全員 − 出席者(終日×の人もここに含まれる)
      const absentees = allNames.filter((x) => !attendees.includes(x));
      windows.push({
        date,
        start,
        end,
        count: attendees.length,
        total,
        attendees,
        absentees,
        isFullConsensus: attendees.length === total && total > 0,
      });
    }
    runStart = -1;
    runPeople = null;
  };

  for (let i = 0; i < slots.length; i++) {
    if (slots[i].length >= minCount) {
      if (runStart < 0) {
        runStart = i;
        runPeople = slots[i].slice();
      } else {
        runPeople = intersect(runPeople as string[], slots[i]);
        // 積集合が minCount を割ったら、そこまでで窓を切って再開
        if ((runPeople as string[]).length < minCount) {
          closeRun(i);
          runStart = i;
          runPeople = slots[i].slice();
        }
      }
    } else {
      closeRun(i);
    }
  }
  closeRun(slots.length);
  return windows;
}

/**
 * ある日の「全員OKの窓」を返す(無ければ空配列)。
 * total = 回答者総数。全員 = total 人。
 */
export function fullConsensusWindows(
  responses: ParticipantResponse[],
  date: string,
  config: EventConfig
): OverlapWindow[] {
  const total = responses.length;
  if (total === 0) return [];
  const names = responses.map((r) => r.name);
  const slots = slotAvailability(responses, date, config);
  return extractWindows(slots, date, config, total, total, names);
}

/**
 * ある日の「いちばん多くの人が出れる窓」を返す。
 * 全員OKがあればそれ。無ければ所要時間を満たす範囲で最大人数の窓(「N人なら〜」)。
 * 最多人数の窓が所要時間に満たない場合は人数を1つずつ下げて次善の窓を探す。
 */
export function bestWindows(
  responses: ParticipantResponse[],
  date: string,
  config: EventConfig
): OverlapWindow[] {
  const total = responses.length;
  if (total === 0) return [];
  const names = responses.map((r) => r.name);
  const slots = slotAvailability(responses, date, config);
  const maxCount = slots.reduce((mx, s) => Math.max(mx, s.length), 0);
  for (let c = maxCount; c >= 1; c--) {
    const w = extractWindows(slots, date, config, total, c, names);
    if (w.length) return w;
  }
  return [];
}

/** 選択スロット(boolean配列)→ 時間帯[]。隣接スロットはまとめる。 */
export function slotsToIntervals(selected: boolean[], config: EventConfig): Interval[] {
  const out: Interval[] = [];
  let runStart = -1;
  for (let i = 0; i <= selected.length; i++) {
    const on = i < selected.length && selected[i];
    if (on && runStart < 0) runStart = i;
    if (!on && runStart >= 0) {
      out.push({ start: slotRange(config, runStart).start, end: slotRange(config, i - 1).end });
      runStart = -1;
    }
  }
  return out;
}

/** 時間帯[] → 選択スロット(boolean配列)。完全に覆われたスロットだけ true。 */
export function intervalsToSelected(intervals: Interval[], config: EventConfig): boolean[] {
  const n = slotCount(config);
  return Array.from({ length: n }, (_, i) => intervalsCoverSlot(intervals, slotRange(config, i)));
}

/** 全候補日について best 窓を出し、全員OK→人数の多い順に並べる。 */
export function rankDays(
  responses: ParticipantResponse[],
  config: EventConfig
): { date: string; windows: OverlapWindow[] }[] {
  return config.candidateDates
    .map((date) => ({ date, windows: bestWindows(responses, date, config) }))
    .sort((a, b) => {
      const ca = a.windows[0]?.count ?? 0;
      const cb = b.windows[0]?.count ?? 0;
      return cb - ca;
    });
}
