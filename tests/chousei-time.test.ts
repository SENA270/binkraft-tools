import { describe, it, expect } from "vitest";
import { jstIso, busyToDayMinutes, intervalsOverlap } from "../app/chousei/lib/time";

describe("jstIso", () => {
  it("0分(JST 00:00) → 前日15:00 UTC", () => {
    expect(jstIso("2026-06-10", 0)).toBe("2026-06-09T15:00:00.000Z");
  });

  it("540分(JST 09:00) → 同日 00:00 UTC", () => {
    expect(jstIso("2026-06-10", 540)).toBe("2026-06-10T00:00:00.000Z");
  });

  it("780分(JST 13:00) → 同日 04:00 UTC", () => {
    expect(jstIso("2026-06-10", 780)).toBe("2026-06-10T04:00:00.000Z");
  });

  it("1440分(JST 翌00:00) → 翌日 15:00 UTC", () => {
    expect(jstIso("2026-06-10", 1440)).toBe("2026-06-10T15:00:00.000Z");
  });
});

describe("busyToDayMinutes", () => {
  it("当日 10:00-12:00 JST → 600〜720分", () => {
    const r = busyToDayMinutes("2026-06-10", "2026-06-10T01:00:00.000Z", "2026-06-10T03:00:00.000Z");
    expect(r).toEqual({ start: 600, end: 720 });
  });

  it("当日範囲外(前日)は null", () => {
    expect(busyToDayMinutes("2026-06-10", "2026-06-08T00:00:00.000Z", "2026-06-08T01:00:00.000Z")).toBeNull();
  });

  it("前日跨ぎを当日にクリップ", () => {
    // JST 6/10 の前夜23:00-翌02:00 → 当日分は 0〜120分
    const r = busyToDayMinutes("2026-06-10", "2026-06-09T14:00:00.000Z", "2026-06-09T17:00:00.000Z");
    expect(r).toEqual({ start: 0, end: 120 });
  });
});

describe("intervalsOverlap", () => {
  it("重なる", () => {
    expect(intervalsOverlap({ start: 540, end: 600 }, { start: 570, end: 700 })).toBe(true);
  });

  it("一方が他方を内包", () => {
    expect(intervalsOverlap({ start: 540, end: 700 }, { start: 600, end: 650 })).toBe(true);
  });

  it("接触は重ならない扱い", () => {
    expect(intervalsOverlap({ start: 540, end: 600 }, { start: 600, end: 660 })).toBe(false);
  });

  it("離れている", () => {
    expect(intervalsOverlap({ start: 540, end: 600 }, { start: 700, end: 800 })).toBe(false);
  });
});
