// キー（調）の判定 — Krumhansl-Schmuckler 法
//
// 各音の「鳴っていた長さ」を12音のヒストグラムにして、
// 長調12通り・短調12通りの標準プロファイルと相関を取り、一番近いものを選ぶ。
// 音の並び順ではなく出現量で決めるので、短いフレーズでも一応の答えが出る。

import type { NoteEvent } from "./melody";

export type Mode = "major" | "minor";
export type Key = { tonic: number; mode: Mode };
export type KeyResult = Key & {
  /** 相関係数（-1〜1）。低いときは自動判定を信じない */
  score: number;
  /** 2位との差。小さいほど「どちらとも言える」= 手動で選ばせるべき */
  margin: number;
};

// Krumhansl-Kessler のプロファイル
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

export const PITCH_CLASS_NAMES = [
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

/** 12音それぞれが鳴っていた合計秒数 */
export function pitchClassDurations(notes: NoteEvent[]): number[] {
  const hist = new Array(12).fill(0);
  for (const n of notes) {
    const pc = ((n.midi % 12) + 12) % 12;
    hist[pc] += n.end - n.start;
  }
  return hist;
}

function correlation(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) return 0;
  return num / Math.sqrt(da * db);
}

function rotate(profile: number[], by: number): number[] {
  return profile.map((_, i) => profile[(i - by + 12) % 12]);
}

export function detectKey(notes: NoteEvent[]): KeyResult | null {
  const hist = pitchClassDurations(notes);
  if (hist.every((v) => v === 0)) return null;

  const scored: KeyResult[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    scored.push({
      tonic,
      mode: "major",
      score: correlation(hist, rotate(MAJOR_PROFILE, tonic)),
      margin: 0,
    });
    scored.push({
      tonic,
      mode: "minor",
      score: correlation(hist, rotate(MINOR_PROFILE, tonic)),
      margin: 0,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return { ...scored[0], margin: scored[0].score - scored[1].score };
}

export function keyLabel(key: Key): string {
  return `${PITCH_CLASS_NAMES[key.tonic]} ${key.mode === "major" ? "メジャー" : "マイナー"}`;
}
