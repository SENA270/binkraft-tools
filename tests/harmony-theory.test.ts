import { describe, it, expect } from "vitest";
import { shiftInScale, harmonize, noteName, INTERVALS } from "../app/harmony/lib/harmonize";
import { detectKey, keyLabel, pitchClassDurations } from "../app/harmony/lib/key";
import type { NoteEvent } from "../app/harmony/lib/melody";

const C_MAJOR = { tonic: 0, mode: "major" as const };
const A_MINOR = { tonic: 9, mode: "minor" as const };

const n = (midi: number, start = 0, end = 1): NoteEvent => ({ midi, start, end });

describe("shiftInScale — 3度上", () => {
  // ここが本題。一律 +4半音だと レ→ファ♯、ミ→ソ♯ になって外れる。
  it.each([
    [60, 64, "ド → ミ（長3度・+4）"],
    [62, 65, "レ → ファ（短3度・+3）"],
    [64, 67, "ミ → ソ（短3度・+3）"],
    [65, 69, "ファ → ラ（長3度・+4）"],
    [67, 71, "ソ → シ（長3度・+4）"],
    [69, 72, "ラ → ド（短3度・+3）"],
    [71, 74, "シ → レ（短3度・+3）"],
  ])("Cメジャー: %i → %i (%s)", (from, to) => {
    expect(shiftInScale(from, C_MAJOR, 2)).toBe(to);
  });

  it("一律+4半音の実装では通らない（長短が混ざることの確認）", () => {
    const shifts = [60, 62, 64, 65, 67, 69, 71].map(
      (m) => shiftInScale(m, C_MAJOR, 2) - m,
    );
    expect(shifts).toEqual([4, 3, 3, 4, 4, 3, 3]);
    expect(new Set(shifts).size).toBe(2); // 全部同じ幅ではない
  });
});

describe("shiftInScale — 3度下", () => {
  it.each([
    [60, 57], // ド → ラ
    [62, 59], // レ → シ
    [64, 60], // ミ → ド
    [65, 62], // ファ → レ
    [67, 64], // ソ → ミ
  ])("Cメジャー: %i → %i", (from, to) => {
    expect(shiftInScale(from, C_MAJOR, -2)).toBe(to);
  });

  it("オクターブをまたいで下がる", () => {
    expect(shiftInScale(48, C_MAJOR, -2)).toBe(45); // C3 → A2
  });
});

describe("shiftInScale — 6度上", () => {
  it.each([
    [60, 69], // ド → ラ（長6度）
    [62, 71], // レ → シ
    [64, 72], // ミ → ド（短6度）
  ])("Cメジャー: %i → %i", (from, to) => {
    expect(shiftInScale(from, C_MAJOR, 5)).toBe(to);
  });
});

describe("shiftInScale — マイナーキー", () => {
  it.each([
    [69, 72], // ラ → ド（短3度）
    [71, 74], // シ → レ（短3度）
    [72, 76], // ド → ミ（長3度）
    [74, 77], // レ → ファ（短3度）
  ])("Aマイナー: %i → %i", (from, to) => {
    expect(shiftInScale(from, A_MINOR, 2)).toBe(to);
  });

  it("同じ音でもキーが違えばハモリが変わる", () => {
    // ソ の3度上は Cメジャーでは シ(71)、Cマイナーでは シ♭(70)
    expect(shiftInScale(67, C_MAJOR, 2)).toBe(71);
    expect(shiftInScale(67, { tonic: 0, mode: "minor" }, 2)).toBe(70);
  });
});

describe("shiftInScale — 音階外の音", () => {
  it("ファ♯（Cメジャーに無い）でも落ちずに近い音階音として扱う", () => {
    const got = shiftInScale(66, C_MAJOR, 2);
    expect(Number.isFinite(got)).toBe(true);
    expect(got).toBeGreaterThan(66);
  });
});

describe("harmonize", () => {
  it("音の長さは変えず高さだけ動かす", () => {
    const melody = [n(60, 0, 0.5), n(62, 0.5, 1.0), n(64, 1.0, 2.0)];
    const h = harmonize(melody, C_MAJOR, "up3");
    expect(h.map((x) => x.midi)).toEqual([64, 65, 67]);
    expect(h.map((x) => [x.start, x.end])).toEqual([
      [0, 0.5],
      [0.5, 1.0],
      [1.0, 2.0],
    ]);
  });

  it("元の配列を書き換えない", () => {
    const melody = [n(60)];
    harmonize(melody, C_MAJOR, "up3");
    expect(melody[0].midi).toBe(60);
  });

  it("知らない音程を渡したら例外", () => {
    // @ts-expect-error 意図的に不正な値
    expect(() => harmonize([n(60)], C_MAJOR, "up9")).toThrow();
  });

  it("用意した音程は全部動く", () => {
    for (const spec of INTERVALS) {
      expect(harmonize([n(60)], C_MAJOR, spec.id)[0].midi).not.toBe(60);
    }
  });
});

describe("noteName", () => {
  it.each([
    [60, "ド", "C4"],
    [61, "ド♯", "C#4"],
    [69, "ラ", "A4"],
    [48, "ド", "C3"],
    [72, "ド", "C5"],
  ])("%i → %s / %s", (midi, solfege, letter) => {
    expect(noteName(midi)).toEqual({ solfege, letter });
  });
});

describe("detectKey", () => {
  it("音がなければ null", () => {
    expect(detectKey([])).toBeNull();
  });

  it("長さで重み付けする（回数ではない）", () => {
    const hist = pitchClassDurations([n(60, 0, 3), n(62, 3, 3.5)]);
    expect(hist[0]).toBeCloseTo(3);
    expect(hist[2]).toBeCloseTo(0.5);
  });

  it("ドを主体にしたCメジャーの旋律を Cメジャーと判定", () => {
    const melody = [
      n(60, 0, 1), n(62, 1, 1.5), n(64, 1.5, 2.5), n(65, 2.5, 3),
      n(67, 3, 4), n(69, 4, 4.5), n(71, 4.5, 5), n(72, 5, 6.5),
    ];
    const k = detectKey(melody)!;
    expect(keyLabel(k)).toBe("C メジャー");
  });

  it("同じ音の集合でもラ中心なら Aマイナーと判定", () => {
    const melody = [
      n(69, 0, 2), n(71, 2, 2.4), n(72, 2.4, 3), n(74, 3, 3.4),
      n(76, 3.4, 4.4), n(77, 4.4, 4.8), n(79, 4.8, 5.2), n(81, 5.2, 7),
    ];
    const k = detectKey(melody)!;
    expect(k.mode).toBe("minor");
    expect(k.tonic).toBe(9);
  });

  it("margin は1位と2位の差（小さいときは自動判定を信じない指標）", () => {
    const k = detectKey([n(60, 0, 1), n(64, 1, 2), n(67, 2, 3)])!;
    expect(k.margin).toBeGreaterThanOrEqual(0);
    expect(k.score).toBeLessThanOrEqual(1);
  });
});
