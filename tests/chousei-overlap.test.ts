import { describe, it, expect } from "vitest";
import {
  minutesToHHMM,
  hhmmToMinutes,
  slotCount,
  slotAvailability,
  fullConsensusWindows,
  bestWindows,
  bestPartialWindow,
  rankDays,
  slotsToIntervals,
  intervalsToSelected,
} from "../app/chousei/lib/overlap";
import type { EventConfig, ParticipantResponse, DayAvailability } from "../app/chousei/lib/types";

const D = "2026-06-10";
const D2 = "2026-06-11";

function cfg(slot: number, dates: string[] = [D], req?: number): EventConfig {
  return { candidateDates: dates, dayStart: 540, dayEnd: 1380, slotMinutes: slot, requiredMinutes: req };
}
const iv = (a: string, b: string) => ({ start: hhmmToMinutes(a), end: hhmmToMinutes(b) });
const avail = (...ivs: { start: number; end: number }[]): DayAvailability => ({ unavailable: false, intervals: ivs });
const X: DayAvailability = { unavailable: true, intervals: [] };
const resp = (name: string, byDate: Record<string, DayAvailability>): ParticipantResponse => ({ name, byDate });

describe("時刻⇔分の変換", () => {
  it("minutesToHHMM", () => {
    expect(minutesToHHMM(540)).toBe("09:00");
    expect(minutesToHHMM(1380)).toBe("23:00");
    expect(minutesToHHMM(0)).toBe("00:00");
  });
  it("hhmmToMinutes", () => {
    expect(hhmmToMinutes("09:00")).toBe(540);
    expect(hhmmToMinutes("23:30")).toBe(1410);
  });
});

describe("slotCount", () => {
  it("09:00-23:00 / 60分 = 14スロット", () => expect(slotCount(cfg(60))).toBe(14));
  it("09:00-23:00 / 30分 = 28スロット", () => expect(slotCount(cfg(30))).toBe(28));
});

describe("スロット⇔時間帯の変換", () => {
  it("連続選択 → 1つの時間帯にまとまる + 往復一致", () => {
    const c = cfg(30);
    const n = slotCount(c);
    const sel = Array.from({ length: n }, (_, i) => {
      const s = 540 + 30 * i;
      return s >= 1080 && s < 1320; // 18:00-22:00
    });
    const intervals = slotsToIntervals(sel, c);
    expect(intervals).toEqual([{ start: 1080, end: 1320 }]);
    expect(intervalsToSelected(intervals, c)).toEqual(sel);
  });
  it("飛び地は別々の時間帯になる", () => {
    const c = cfg(30);
    const n = slotCount(c);
    const sel = Array.from({ length: n }, (_, i) => {
      const s = 540 + 30 * i;
      return (s >= 1080 && s < 1140) || (s >= 1200 && s < 1260); // 18-19, 20-21
    });
    expect(slotsToIntervals(sel, c)).toEqual([
      { start: 1080, end: 1140 },
      { start: 1200, end: 1260 },
    ]);
  });
});

describe("slotAvailability", () => {
  it("空き時間のスロットだけ人が入る。終日×は入らない", () => {
    const c = cfg(60);
    const rs = [
      resp("Alice", { [D]: avail(iv("18:00", "22:00")) }),
      resp("Carol", { [D]: X }),
    ];
    const slots = slotAvailability(rs, D, c);
    // slot index 9 = 18:00-19:00
    expect(slots[9]).toContain("Alice");
    expect(slots[9]).not.toContain("Carol");
    // slot index 13 = 22:00-23:00 (Aliceの範囲外)
    expect(slots[13]).toEqual([]);
  });
});

describe("fullConsensusWindows (全員OK)", () => {
  it("全員が重なる時間帯を返す", () => {
    const c = cfg(60);
    const rs = [
      resp("Alice", { [D]: avail(iv("18:00", "22:00")) }),
      resp("Bob", { [D]: avail(iv("19:00", "22:00")) }),
    ];
    const w = fullConsensusWindows(rs, D, c);
    expect(w).toHaveLength(1);
    expect(minutesToHHMM(w[0].start)).toBe("19:00");
    expect(minutesToHHMM(w[0].end)).toBe("22:00");
    expect(w[0].count).toBe(2);
    expect(w[0].isFullConsensus).toBe(true);
  });
  it("1人でも終日×なら全員OKは無い", () => {
    const c = cfg(60);
    const rs = [
      resp("Alice", { [D]: avail(iv("18:00", "22:00")) }),
      resp("Bob", { [D]: avail(iv("19:00", "22:00")) }),
      resp("Carol", { [D]: X }),
    ];
    expect(fullConsensusWindows(rs, D, c)).toEqual([]);
  });
  it("重なりが所要時間に満たないと全員OKは無い", () => {
    const c = cfg(60, [D], 180); // 3時間以上
    const rs = [
      resp("Alice", { [D]: avail(iv("18:00", "20:00")) }),
      resp("Bob", { [D]: avail(iv("19:00", "20:00")) }),
    ];
    expect(fullConsensusWindows(rs, D, c)).toEqual([]);
  });
});

describe("bestWindows / bestPartialWindow (部分被り)", () => {
  it("全員OKが無いとき、最多人数の窓を返す(欠席者つき)", () => {
    const c = cfg(60);
    const rs = [
      resp("Alice", { [D]: avail(iv("18:00", "22:00")) }),
      resp("Bob", { [D]: avail(iv("19:00", "22:00")) }),
      resp("Carol", { [D]: X }),
    ];
    const w = bestWindows(rs, D, c);
    expect(w).toHaveLength(1);
    expect(w[0].count).toBe(2);
    expect(w[0].attendees.sort()).toEqual(["Alice", "Bob"]);
    expect(w[0].absentees).toEqual(["Carol"]);
    expect(w[0].isFullConsensus).toBe(false);
  });
  it("人によって空きが食い違っても、所要時間を満たす最良の窓を拾う(回帰)", () => {
    // 全員一致は19-20の1hだけ。3h必要なら、Bob単独の19-22(3h)が最良。
    const c = cfg(60, [D], 180);
    const rs = [
      resp("Alice", { [D]: avail(iv("18:00", "20:00")) }),
      resp("Bob", { [D]: avail(iv("19:00", "22:00")) }),
    ];
    const w = bestPartialWindow(rs, D, c);
    expect(w).not.toBeNull();
    expect(minutesToHHMM(w!.start)).toBe("19:00");
    expect(minutesToHHMM(w!.end)).toBe("22:00");
    expect(w!.count).toBe(1);
    expect(w!.attendees).toEqual(["Bob"]);
    expect(w!.absentees).toEqual(["Alice"]);
  });
  it("回答ゼロ・全員×なら空", () => {
    const c = cfg(60);
    expect(bestWindows([], D, c)).toEqual([]);
    const rs = [resp("Alice", { [D]: X }), resp("Bob", { [D]: X })];
    expect(bestWindows(rs, D, c)).toEqual([]);
  });
});

describe("rankDays", () => {
  it("被りの多い日が先頭に来る", () => {
    const c = cfg(60, [D, D2]);
    const rs = [
      resp("Alice", { [D]: avail(iv("19:00", "21:00")), [D2]: avail(iv("19:00", "21:00")) }),
      resp("Bob", { [D]: avail(iv("19:00", "21:00")), [D2]: X }),
    ];
    const ranked = rankDays(rs, c);
    expect(ranked[0].date).toBe(D); // 全員OK(2人)
    expect(ranked[0].windows[0].count).toBe(2);
    expect(ranked[1].date).toBe(D2); // 1人だけ
    expect(ranked[1].windows[0].count).toBe(1);
  });
});

describe("end-to-end (入力UI相当: スロット選択→送信→集計)", () => {
  it("塗ったスロットから時間帯を作り、全員の被りを出す", () => {
    const c = cfg(30);
    const n = slotCount(c);
    const sel = (from: number, to: number) =>
      Array.from({ length: n }, (_, i) => {
        const s = 540 + 30 * i;
        return s >= from && s < to;
      });
    // Alice 18:00-21:00 / Bob 19:00-22:00 を「塗って送信」した想定
    const aliceIv = slotsToIntervals(sel(1080, 1260), c);
    const bobIv = slotsToIntervals(sel(1140, 1320), c);
    const rs = [
      resp("Alice", { [D]: { unavailable: false, intervals: aliceIv } }),
      resp("Bob", { [D]: { unavailable: false, intervals: bobIv } }),
    ];
    const ranked = rankDays(rs, c);
    const best = ranked[0].windows[0];
    expect(minutesToHHMM(best.start)).toBe("19:00");
    expect(minutesToHHMM(best.end)).toBe("21:00");
    expect(best.count).toBe(2);
    expect(best.isFullConsensus).toBe(true);
  });
});
