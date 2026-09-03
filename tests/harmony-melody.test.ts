import { describe, it, expect } from "vitest";
import {
  freqToMidi,
  midiToFreq,
  medianFilter,
  framesToNotes,
  trackPitches,
} from "../app/harmony/lib/melody";
import { renderHarmony, renderLengthSec, mixTracks } from "../app/harmony/lib/synth";
import { encodeWav } from "../app/harmony/lib/wav";

describe("周波数とMIDIの変換", () => {
  it.each([
    [440, 69],
    [261.6256, 60],
    [220, 57],
  ])("%fHz は MIDI %i", (hz, midi) => {
    expect(freqToMidi(hz)).toBeCloseTo(midi, 3);
  });

  it("往復して元に戻る", () => {
    for (const m of [40, 55, 60, 72, 84]) {
      expect(freqToMidi(midiToFreq(m))).toBeCloseTo(m, 6);
    }
  });

  it("1オクターブ上は周波数2倍", () => {
    expect(midiToFreq(72) / midiToFreq(60)).toBeCloseTo(2, 6);
  });
});

describe("medianFilter", () => {
  it("一瞬のオクターブ跳ねを消す", () => {
    const input = [60, 60, 72, 60, 60];
    expect(medianFilter(input, 5)).toEqual([60, 60, 60, 60, 60]);
  });

  it("本当に変わったところは残す", () => {
    const input = [60, 60, 60, 64, 64, 64, 64];
    const out = medianFilter(input, 3);
    expect(out[0]).toBe(60);
    expect(out[6]).toBe(64);
  });

  it("窓の過半数が無音なら無音のまま（歌の切れ目を埋めない）", () => {
    expect(medianFilter([null, null, 60, null, null], 5)).toEqual([
      null, null, null, null, null,
    ]);
  });

  it("端でも落ちない", () => {
    expect(medianFilter([60], 5)).toEqual([null]);
    expect(medianFilter([], 5)).toEqual([]);
  });
});

describe("framesToNotes", () => {
  const hop = 0.01; // 10ms

  it("半音に丸めて同じ音の連続をまとめる", () => {
    const frames = [60.1, 59.9, 60.2, 60.0, 62.1, 61.9, 62.0];
    const notes = framesToNotes(frames, hop, { minDurSec: 0.02 });
    expect(notes.map((n) => n.midi)).toEqual([60, 62]);
    expect(notes[0].start).toBeCloseTo(0);
    expect(notes[0].end).toBeCloseTo(0.04);
    expect(notes[1].start).toBeCloseTo(0.04);
  });

  it("短すぎる音は捨てる（子音や息を拾わない）", () => {
    const frames = [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 67, 62, 62, 62, 62, 62, 62, 62, 62, 62];
    const notes = framesToNotes(frames, hop, { minDurSec: 0.05, maxGapSec: 0 });
    expect(notes.map((n) => n.midi)).toEqual([60, 62]); // 67 は1フレームだけなので消える
  });

  it("無音で区切られる", () => {
    const frames = [60, 60, 60, 60, 60, null, null, 60, 60, 60, 60, 60];
    const notes = framesToNotes(frames, hop, { minDurSec: 0.02, maxGapSec: 0 });
    expect(notes.length).toBe(2);
    expect(notes[0].midi).toBe(60);
    expect(notes[1].midi).toBe(60);
  });

  it("同じ音の細切れは maxGapSec 以内なら繋ぐ", () => {
    const frames = [60, 60, 60, null, 60, 60, 60];
    const notes = framesToNotes(frames, hop, { minDurSec: 0.02, maxGapSec: 0.05 });
    expect(notes.length).toBe(1);
    expect(notes[0].end).toBeCloseTo(0.07);
  });

  it("全部無音なら空", () => {
    expect(framesToNotes([null, null, null], hop)).toEqual([]);
  });
});

describe("trackPitches", () => {
  it("2音つないだ波形から2つの音を取り出す", () => {
    const sr = 16000;
    const secPer = 0.4;
    const len = Math.floor(sr * secPer * 2);
    const samples = new Float32Array(len);
    const half = Math.floor(len / 2);
    for (let i = 0; i < len; i++) {
      const hz = i < half ? 220 : 261.6256; // A3 → C4
      samples[i] = 0.4 * Math.sin((2 * Math.PI * hz * i) / sr);
    }
    const { midiFrames, hopSec } = trackPitches(samples, sr);
    const notes = framesToNotes(midiFrames, hopSec, { minDurSec: 0.08 });
    expect(notes.map((n) => n.midi)).toEqual([57, 60]);
  });

  it("無音だけなら音符ゼロ", () => {
    const { midiFrames, hopSec } = trackPitches(new Float32Array(16000), 16000);
    expect(framesToNotes(midiFrames, hopSec)).toEqual([]);
  });
});

describe("renderHarmony", () => {
  const SR = 16000;
  const notes = [{ midi: 69, start: 0, end: 0.5 }]; // A4 = 440Hz

  it("音符の長さぶん鳴る", () => {
    expect(renderLengthSec(notes)).toBeCloseTo(0.5);
    const buf = renderHarmony(notes, SR);
    expect(buf.length).toBeGreaterThanOrEqual(SR * 0.5);
  });

  it("無音ではない", () => {
    const buf = renderHarmony(notes, SR);
    const peak = Math.max(...Array.from(buf).map(Math.abs));
    expect(peak).toBeGreaterThan(0.1);
  });

  /** 安定した中央部分でゼロ交差を数えて周波数を測る */
  function measureHz(buf: Float32Array, fromSec: number, toSec: number): number {
    const from = Math.floor(SR * fromSec);
    const to = Math.floor(SR * toSec);
    let crossings = 0;
    for (let i = from + 1; i < to; i++) {
      if (buf[i - 1] < 0 && buf[i] >= 0) crossings++;
    }
    return crossings / ((to - from) / SR);
  }

  // 440Hz だけで試すと midi を無視して 440 を返す実装でも通ってしまう
  it.each([
    [60, 261.63],
    [69, 440],
    [72, 523.25],
  ])("MIDI %i を %fHz で書き出す", (midi, hz) => {
    const buf = renderHarmony([{ midi, start: 0, end: 1 }], SR, { fadeSec: 0 });
    expect(measureHz(buf, 0.2, 0.8)).toBeCloseTo(hz, -0.7);
  });

  it("timeScale=0.5 で長さが倍になる（高さは変えない）", () => {
    expect(renderLengthSec(notes, 0.5)).toBeCloseTo(1.0);
    const slow = renderHarmony(notes, SR, { timeScale: 0.5, fadeSec: 0 });
    expect(measureHz(slow, 0.3, 0.7)).toBeCloseTo(440, -0.7); // 遅くしても440Hzのまま
  });

  // 正弦波は位相0で必ず0になるので buf[0] を見るだけでは何も確かめられない。
  // 頭の数msの「振幅」が中央より小さいことを見る。
  function peakIn(buf: Float32Array, fromSec: number, toSec: number): number {
    let peak = 0;
    for (let i = Math.floor(SR * fromSec); i < Math.floor(SR * toSec); i++) {
      peak = Math.max(peak, Math.abs(buf[i]));
    }
    return peak;
  }

  it("音の立ち上がりで徐々に大きくなる（プツッと鳴らない）", () => {
    const buf = renderHarmony([{ midi: 69, start: 0, end: 0.5 }], SR, { fadeSec: 0.05 });
    const head = peakIn(buf, 0, 0.01);
    const mid = peakIn(buf, 0.2, 0.3);
    expect(mid).toBeGreaterThan(0.1);
    expect(head).toBeLessThan(mid * 0.5);
  });

  it("音の終わりで徐々に小さくなる", () => {
    const buf = renderHarmony([{ midi: 69, start: 0, end: 0.5 }], SR, { fadeSec: 0.05 });
    expect(peakIn(buf, 0.49, 0.5)).toBeLessThan(peakIn(buf, 0.2, 0.3) * 0.5);
  });

  it("音符ゼロなら空", () => {
    expect(renderHarmony([], SR).length).toBeLessThanOrEqual(1);
  });
});

describe("mixTracks", () => {
  it("足し合わせる", () => {
    const a = new Float32Array([0.1, 0.2]);
    const b = new Float32Array([0.1, 0.1]);
    const out = mixTracks([{ samples: a }, { samples: b }]);
    expect(out[0]).toBeCloseTo(0.2, 6);
    expect(out[1]).toBeCloseTo(0.3, 6);
  });

  it("長さは最長に合わせる", () => {
    const a = new Float32Array(10);
    const b = new Float32Array(25);
    expect(mixTracks([{ samples: a }, { samples: b }]).length).toBe(25);
  });

  it("1を超えたら全体を下げる（歪ませない）", () => {
    const a = new Float32Array([0.9, 0.5]);
    const b = new Float32Array([0.9, 0.5]);
    const out = mixTracks([{ samples: a }, { samples: b }]);
    // 足すと 1.8 になる。そのままでは歪むので 1.0 未満まで全体を下げる
    expect(Math.max(...Array.from(out).map(Math.abs))).toBeLessThan(1.0);
    expect(out[0]).toBeCloseTo(0.99, 4);
    expect(out[0] / out[1]).toBeCloseTo(1.8, 5); // 比は保つ
  });
});

describe("encodeWav", () => {
  const SR = 44100;

  it("RIFF/WAVE ヘッダが正しい", () => {
    const buf = encodeWav(new Float32Array(100), SR);
    const view = new DataView(buf);
    const str = (o: number, n: number) =>
      String.fromCharCode(...Array.from({ length: n }, (_, i) => view.getUint8(o + i)));
    expect(str(0, 4)).toBe("RIFF");
    expect(str(8, 4)).toBe("WAVE");
    expect(str(12, 4)).toBe("fmt ");
    expect(str(36, 4)).toBe("data");
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // モノラル
    expect(view.getUint32(24, true)).toBe(SR);
    expect(view.getUint16(34, true)).toBe(16); // 16bit
  });

  it("長さが 44 + サンプル数*2 バイト", () => {
    expect(encodeWav(new Float32Array(1000), SR).byteLength).toBe(44 + 2000);
    const view = new DataView(encodeWav(new Float32Array(1000), SR));
    expect(view.getUint32(40, true)).toBe(2000); // data チャンクの長さ
    expect(view.getUint32(4, true)).toBe(36 + 2000); // RIFF の長さ
  });

  it("値が復元できる", () => {
    const src = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const view = new DataView(encodeWav(src, SR));
    expect(view.getInt16(44, true)).toBe(0);
    // setInt16 はゼロ方向に切り捨てる（0.5*32767 = 16383.5 → 16383）
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(view.getInt16(48, true)).toBe(Math.trunc(-0.5 * 0x8000));
    expect(view.getInt16(50, true)).toBe(0x7fff);
    expect(view.getInt16(52, true)).toBe(-0x8000);
  });

  it("1を超える値でも溢れない", () => {
    const view = new DataView(encodeWav(new Float32Array([5, -5]), SR));
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x8000);
  });
});
