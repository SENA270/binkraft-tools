import { describe, it, expect } from "vitest";
import { subtractBusy, freeIntervalsForDay } from "../app/chousei/lib/freebusy";

const DAY = { start: 540, end: 1380 }; // 09:00–23:00

describe("subtractBusy", () => {
  it("予定なし → 終日まるごと空き", () => {
    expect(subtractBusy(DAY, [])).toEqual([{ start: 540, end: 1380 }]);
  });

  it("真ん中の予定を差し引く", () => {
    expect(subtractBusy(DAY, [{ start: 600, end: 660 }])).toEqual([
      { start: 540, end: 600 },
      { start: 660, end: 1380 },
    ]);
  });

  it("重なり・隣接する予定はマージしてから差し引く", () => {
    expect(
      subtractBusy(DAY, [
        { start: 600, end: 660 },
        { start: 650, end: 720 },
      ])
    ).toEqual([
      { start: 540, end: 600 },
      { start: 720, end: 1380 },
    ]);
  });

  it("終日埋まっていれば空きなし", () => {
    expect(subtractBusy(DAY, [{ start: 400, end: 1500 }])).toEqual([]);
  });

  it("範囲外の予定は無視", () => {
    expect(subtractBusy(DAY, [{ start: 0, end: 300 }])).toEqual([{ start: 540, end: 1380 }]);
  });
});

describe("freeIntervalsForDay", () => {
  it("slot 境界にスナップする(切り上げ/切り下げ)", () => {
    // 605–655 の予定 → 空きは [540,605][655,1380]。30分slotで [540,600][660,1380] に丸める。
    const free = freeIntervalsForDay([{ start: 605, end: 655 }], 540, 1380, 30, 30);
    expect(free).toEqual([
      { start: 540, end: 600 },
      { start: 660, end: 1380 },
    ]);
  });

  it("minMinutes 未満の細切れは捨てる", () => {
    // [555,1380] が予定 → 空き [540,555] は15分。slot30/min30 で消える。
    const free = freeIntervalsForDay([{ start: 555, end: 1380 }], 540, 1380, 30, 30);
    expect(free).toEqual([]);
  });

  it("ちょうど min と同じ長さは残す", () => {
    const free = freeIntervalsForDay([{ start: 570, end: 1380 }], 540, 1380, 30, 30);
    expect(free).toEqual([{ start: 540, end: 570 }]);
  });

  it("予定なしなら終日(slotに乗る範囲)", () => {
    expect(freeIntervalsForDay([], 540, 1380, 30, 60)).toEqual([{ start: 540, end: 1380 }]);
  });
});
