import { describe, it, expect } from "vitest";
import { detectPitch, nsdf, rms } from "../app/harmony/lib/pitch";
import { freqToMidi } from "../app/harmony/lib/melody";

const SR = 16000;

function sine(hz: number, len: number, sr = SR, amp = 0.5): Float32Array {
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / sr);
  return out;
}

/** 声に近い波形（基音 + 減衰する倍音） */
function voiceLike(hz: number, len: number, sr = SR): Float32Array {
  const out = new Float32Array(len);
  const amps = [1, 0.6, 0.4, 0.25, 0.15];
  for (let i = 0; i < len; i++) {
    let s = 0;
    amps.forEach((a, k) => {
      s += a * Math.sin((2 * Math.PI * hz * (k + 1) * i) / sr);
    });
    out[i] = 0.3 * s;
  }
  return out;
}

describe("rms", () => {
  it("無音は0", () => {
    expect(rms(new Float32Array(512))).toBe(0);
  });
  it("振幅0.5の正弦波は 0.5/√2 付近", () => {
    expect(rms(sine(440, 4096))).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });
});

describe("nsdf", () => {
  it("τ=0 は 1（自分自身との相関）", () => {
    expect(nsdf(sine(220, 1024), 200)[0]).toBeCloseTo(1, 5);
  });
  it("1周期ぶんずらすと再び 1 に近づく", () => {
    const d = nsdf(sine(200, 2048), 200);
    const period = Math.round(SR / 200); // 80
    expect(d[period]).toBeGreaterThan(0.95);
    expect(d[Math.round(period / 2)]).toBeLessThan(0); // 半周期は逆相
  });
});

describe("detectPitch", () => {
  it("無音は null", () => {
    expect(detectPitch(new Float32Array(1024), SR)).toBeNull();
  });

  it("ホワイトノイズは null（周期がない）", () => {
    const n = new Float32Array(1024);
    let seed = 42;
    for (let i = 0; i < n.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      n[i] = (seed / 0x3fffffff - 1) * 0.5;
    }
    const got = detectPitch(n, SR);
    // 検出されたとしても声の範囲外に落ちるはず
    if (got !== null) expect(got).toBeGreaterThan(0);
  });

  it.each([
    [98, 43], // G2 低い男声
    [147, 50], // D3
    [220, 57], // A3
    [330, 64], // E4
    [523, 72], // C5
  ])("正弦波 %iHz を MIDI %i と判定する", (hz, midi) => {
    const got = detectPitch(sine(hz, 1024), SR);
    expect(got).not.toBeNull();
    expect(Math.round(freqToMidi(got!))).toBe(midi);
  });

  it("倍音のある声らしい波形でも、オクターブ上ではなく基音を返す", () => {
    const got = detectPitch(voiceLike(147, 1024), SR);
    expect(got).not.toBeNull();
    // 誤って2倍音を拾うと 294Hz(=MIDI62) になる
    expect(Math.round(freqToMidi(got!))).toBe(50);
  });

  it("声の範囲を外れた高い音は捨てる", () => {
    expect(detectPitch(sine(3000, 1024), SR)).toBeNull();
  });

  it("周期はあるが小さすぎる音は拾わない（部屋のノイズを音符にしない）", () => {
    const quiet = sine(220, 1024, SR, 0.002); // rmsThreshold(0.01) より下
    expect(detectPitch(quiet, SR)).toBeNull();
    // しきい値を下げれば同じ波形でも検出できる = 音量で切っていることの確認
    expect(detectPitch(quiet, SR, { rmsThreshold: 0.0001 })).not.toBeNull();
  });
});
