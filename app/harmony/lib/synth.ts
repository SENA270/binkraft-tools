// ハモリを音にする
//
// オシレータをその場でスケジュールするのではなく Float32Array に描き切る。
// こうすると「再生した音」と「書き出したファイル」が同一になる（別実装だとズレる）。

import { midiToFreq, type NoteEvent } from "./melody";

export type RenderOptions = {
  /** 1 = 原速、0.5 = 半分の速さ。音の高さは変えない（覚えるためにゆっくり流す用） */
  timeScale?: number;
  /** 立ち上がり・切れ際の秒数。0 にするとプツッと鳴る */
  fadeSec?: number;
  gain?: number;
};

export function renderLengthSec(
  notes: NoteEvent[],
  timeScale = 1,
): number {
  if (notes.length === 0) return 0;
  return Math.max(...notes.map((n) => n.end)) / timeScale;
}

/**
 * 正弦波 + 1オクターブ上を少し混ぜた音色。
 * 純粋な正弦波はスマホのスピーカーでほぼ聞こえないため倍音を足している。
 */
export function renderHarmony(
  notes: NoteEvent[],
  sampleRate: number,
  opts: RenderOptions = {},
): Float32Array {
  const { timeScale = 1, fadeSec = 0.012, gain = 0.28 } = opts;
  const totalSec = renderLengthSec(notes, timeScale);
  const out = new Float32Array(Math.ceil(totalSec * sampleRate) + 1);

  for (const note of notes) {
    const start = note.start / timeScale;
    const end = note.end / timeScale;
    const i0 = Math.floor(start * sampleRate);
    const i1 = Math.min(out.length, Math.ceil(end * sampleRate));
    const dur = (i1 - i0) / sampleRate;
    if (dur <= 0) continue;

    const freq = midiToFreq(note.midi);
    const fade = Math.min(fadeSec, dur / 2);
    const w = (2 * Math.PI * freq) / sampleRate;

    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / sampleRate;
      let env = 1;
      if (t < fade) env = t / fade;
      else if (dur - t < fade) env = Math.max(0, (dur - t) / fade);
      const phase = w * (i - i0);
      const s = Math.sin(phase) + 0.35 * Math.sin(2 * phase);
      out[i] += s * env * gain;
    }
  }

  return out;
}

/** 複数トラックを足す。長さは最長に合わせる。クリップしないよう頭を抑える */
export function mixTracks(
  tracks: { samples: Float32Array; gain?: number }[],
): Float32Array {
  const len = tracks.reduce((m, t) => Math.max(m, t.samples.length), 0);
  const out = new Float32Array(len);
  for (const t of tracks) {
    const g = t.gain ?? 1;
    for (let i = 0; i < t.samples.length; i++) out[i] += t.samples[i] * g;
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0.99) {
    const k = 0.99 / peak;
    for (let i = 0; i < len; i++) out[i] *= k;
  }
  return out;
}
