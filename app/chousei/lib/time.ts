// 日付/時刻の純関数。JST 起点で扱う(サーバ・クライアント共用可)。
import type { Interval } from "./types";

/** "YYYY-MM-DD" + 分(0..1440) → 絶対 ISO(UTC で表現、起点は JST の 00:00)。 */
export function jstIso(date: string, minutes: number): string {
  const base = new Date(`${date}T00:00:00+09:00`).getTime();
  return new Date(base + minutes * 60000).toISOString();
}

/** 絶対 ISO 区間を、指定日(JST)の 00:00 からの分にクリップ変換。重なりなしは null。 */
export function busyToDayMinutes(date: string, startIso: string, endIso: string): Interval | null {
  const dayStartMs = new Date(`${date}T00:00:00+09:00`).getTime();
  const dayEndMs = dayStartMs + 1440 * 60000;
  const cs = Math.max(new Date(startIso).getTime(), dayStartMs);
  const ce = Math.min(new Date(endIso).getTime(), dayEndMs);
  if (ce <= cs) return null;
  return { start: Math.round((cs - dayStartMs) / 60000), end: Math.round((ce - dayStartMs) / 60000) };
}

/** [a.start, a.end) と [b.start, b.end) が重なるか(接触は重ならない扱い)。 */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}
