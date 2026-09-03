// ハモリの音を決める
//
// 「3度上」を一律 +4半音でやると外れる。ドの3度上はミ(+4)だがレの3度上はファ(+3)。
// なので半音ではなく「音階の上で2つ隣」を取る。これでキーに沿った長短が自動で決まる。

import type { NoteEvent } from "./melody";
import type { Key } from "./key";

/** 主音からの半音距離 */
const SCALES: Record<Key["mode"], number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // 自然短音階
};

export type IntervalId = "up3" | "down3" | "up6";

export const INTERVALS: { id: IntervalId; label: string; steps: number }[] = [
  { id: "up3", label: "上ハモ（3度上）", steps: 2 },
  { id: "down3", label: "下ハモ（3度下）", steps: -2 },
  { id: "up6", label: "上ハモ（6度上）", steps: 5 },
];

/**
 * 音階上を steps 個ずらした音を返す。
 * 音階に無い音（半音階の音）は最も近い音階音に寄せてから数える。
 */
export function shiftInScale(midi: number, key: Key, steps: number): number {
  const scale = SCALES[key.mode];
  const offset = ((midi - key.tonic) % 12 + 12) % 12;
  // 直下の主音の絶対位置
  const tonicBelow = midi - offset;

  let index = scale.indexOf(offset);
  if (index === -1) {
    // 音階外 → 最も近い音階音の番号を使う（同距離なら下側）
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < scale.length; i++) {
      const dist = Math.abs(scale[i] - offset);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    index = bestIdx;
  }

  const target = index + steps;
  const octave = Math.floor(target / 7);
  const within = ((target % 7) + 7) % 7;
  return tonicBelow + octave * 12 + scale[within];
}

export function harmonize(
  notes: NoteEvent[],
  key: Key,
  interval: IntervalId,
): NoteEvent[] {
  const spec = INTERVALS.find((i) => i.id === interval);
  if (!spec) throw new Error(`unknown interval: ${interval}`);
  return notes.map((n) => ({
    ...n,
    midi: shiftInScale(n.midi, key, spec.steps),
  }));
}

const SOLFEGE = [
  "ド",
  "ド♯",
  "レ",
  "レ♯",
  "ミ",
  "ファ",
  "ファ♯",
  "ソ",
  "ソ♯",
  "ラ",
  "ラ♯",
  "シ",
];
const LETTERS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** 60 → { solfege: "ド", letter: "C4" } */
export function noteName(midi: number): { solfege: string; letter: string } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { solfege: SOLFEGE[pc], letter: `${LETTERS[pc]}${octave}` };
}
