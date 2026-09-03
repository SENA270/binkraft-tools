// 検出した音程の列を「音符」にまとめる
import { detectPitch, type PitchOptions } from "./pitch";

export type NoteEvent = {
  /** MIDIノート番号（60 = 中央のド） */
  midi: number;
  /** 秒 */
  start: number;
  end: number;
};

export function freqToMidi(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** 奇数長の窓で中央値を取る。オクターブ跳ねや一瞬の誤検出を潰すため */
export function medianFilter(
  values: (number | null)[],
  window: number,
): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((_, i) => {
    const slice: number[] = [];
    for (let j = i - half; j <= i + half; j++) {
      const v = values[j];
      if (j >= 0 && j < values.length && v !== null) slice.push(v);
    }
    // 窓の過半数が無音なら無音のまま（歌の切れ目を埋めてしまわない）
    if (slice.length <= half) return null;
    slice.sort((a, b) => a - b);
    return slice[Math.floor(slice.length / 2)];
  });
}

export type TrackOptions = PitchOptions & {
  frameSize?: number;
  hopSize?: number;
  medianWindow?: number;
};

export type TrackResult = {
  /** フレームごとの MIDI 値（小数）。無音は null */
  midiFrames: (number | null)[];
  hopSec: number;
};

/** 波形全体を走査してフレームごとの音程を出す */
export function trackPitches(
  samples: Float32Array,
  sampleRate: number,
  opts: TrackOptions = {},
): TrackResult {
  const { frameSize = 1024, hopSize = 256, medianWindow = 5, ...pitchOpts } = opts;

  const raw: (number | null)[] = [];
  for (let off = 0; off + frameSize <= samples.length; off += hopSize) {
    const f0 = detectPitch(samples.subarray(off, off + frameSize), sampleRate, pitchOpts);
    raw.push(f0 === null ? null : freqToMidi(f0));
  }

  return {
    midiFrames: medianFilter(raw, medianWindow),
    hopSec: hopSize / sampleRate,
  };
}

export type AsyncTrackHooks = {
  /** 0〜1 の進み具合 */
  onProgress?: (ratio: number) => void;
  /** 何フレームごとに画面へ制御を返すか */
  yieldEvery?: number;
  /** 各区切りで制御を返す手段。既定は setTimeout(0) */
  yieldTo?: () => Promise<void>;
};

/**
 * trackPitches と同じ計算を、途中で画面に制御を返しながら行う。
 * 長い音声だと数秒かかり、同期のままだと解析中の表示すら描画されないため。
 *
 * 結果が同期版と一致することはテストで固定している（実装が枝分かれしないように）。
 */
export async function trackPitchesAsync(
  samples: Float32Array,
  sampleRate: number,
  opts: TrackOptions = {},
  hooks: AsyncTrackHooks = {},
): Promise<TrackResult> {
  const { frameSize = 1024, hopSize = 256, medianWindow = 5, ...pitchOpts } = opts;
  const {
    onProgress,
    yieldEvery = 150,
    yieldTo = () => new Promise<void>((r) => setTimeout(r, 0)),
  } = hooks;

  const totalFrames = Math.max(
    1,
    Math.floor((samples.length - frameSize) / hopSize) + 1,
  );

  const raw: (number | null)[] = [];
  let count = 0;
  for (let off = 0; off + frameSize <= samples.length; off += hopSize) {
    const f0 = detectPitch(samples.subarray(off, off + frameSize), sampleRate, pitchOpts);
    raw.push(f0 === null ? null : freqToMidi(f0));
    count++;
    if (count % yieldEvery === 0) {
      onProgress?.(Math.min(1, count / totalFrames));
      await yieldTo();
    }
  }
  onProgress?.(1);

  return {
    midiFrames: medianFilter(raw, medianWindow),
    hopSec: hopSize / sampleRate,
  };
}

export type NotesOptions = {
  /** これより短い音符は捨てる（子音や息の音を拾わないため） */
  minDurSec?: number;
  /** 同じ音がこれ以下の隙間で分かれていたら繋ぐ */
  maxGapSec?: number;
};

/** フレーム列 → 音符列。半音に丸めてから同じ音の連続をまとめる */
export function framesToNotes(
  midiFrames: (number | null)[],
  hopSec: number,
  opts: NotesOptions = {},
): NoteEvent[] {
  const { minDurSec = 0.09, maxGapSec = 0.06 } = opts;

  const rounded = midiFrames.map((m) => (m === null ? null : Math.round(m)));

  const runs: NoteEvent[] = [];
  let current: NoteEvent | null = null;
  for (let i = 0; i < rounded.length; i++) {
    const m = rounded[i];
    if (m === null) {
      current = null;
      continue;
    }
    if (current && current.midi === m) {
      current.end = (i + 1) * hopSec;
    } else {
      current = { midi: m, start: i * hopSec, end: (i + 1) * hopSec };
      runs.push(current);
    }
  }

  // 同じ音の細切れを繋ぐ（丸めの境界でバタつくため）
  const joined: NoteEvent[] = [];
  for (const n of runs) {
    const prev = joined[joined.length - 1];
    if (prev && prev.midi === n.midi && n.start - prev.end <= maxGapSec) {
      prev.end = n.end;
    } else {
      joined.push({ ...n });
    }
  }

  return joined.filter((n) => n.end - n.start >= minDurSec);
}
