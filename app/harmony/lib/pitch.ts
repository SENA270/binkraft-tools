// 音程検出（McLeod-Wallace の MPM / NSDF 法）
//
// なぜ自己相関そのままではないか:
//   素の自己相関は τ が大きいほど値が下がるので、1オクターブ下を本命と誤認しやすい。
//   NSDF は各 τ でエネルギー正規化するため、オクターブ違いの誤検出が出にくい。
//
// 呼び出し側は 16kHz にリサンプルした mono を渡す前提（計算量を1/3以下に落とすため）。

/** 人の声の想定範囲。これを外れた検出結果は捨てる */
export const MIN_F0_HZ = 65; // C2 付近（低い男声）
export const MAX_F0_HZ = 1100; // C6 付近（高い女声・裏声）

export function rms(frame: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}

/**
 * NSDF: n'(τ) = 2 * Σ x[j]x[j+τ] / Σ (x[j]² + x[j+τ]²)
 * 戻り値の index が τ（ラグ）。
 */
export function nsdf(frame: Float32Array, maxLag: number): Float32Array {
  const w = frame.length;
  const out = new Float32Array(maxLag + 1);
  for (let tau = 0; tau <= maxLag; tau++) {
    let acf = 0;
    let energy = 0;
    const n = w - tau;
    for (let j = 0; j < n; j++) {
      const a = frame[j];
      const b = frame[j + tau];
      acf += a * b;
      energy += a * a + b * b;
    }
    out[tau] = energy > 0 ? (2 * acf) / energy : 0;
  }
  return out;
}

/** 放物線補間でピークのサブサンプル位置を求める（半音未満の精度を出すため） */
function refinePeak(d: Float32Array, i: number): number {
  if (i <= 0 || i >= d.length - 1) return i;
  const a = d[i - 1];
  const b = d[i];
  const c = d[i + 1];
  const denom = 2 * (2 * b - a - c);
  if (denom === 0) return i;
  return i + (c - a) / denom;
}

export type PitchOptions = {
  /** 無音とみなす RMS のしきい値 */
  rmsThreshold?: number;
  /** 最大ピークに対する採用比率（小さいほど高い音を拾いやすく、誤検出も増える） */
  peakRatio?: number;
  minHz?: number;
  maxHz?: number;
};

/**
 * 1フレームから基本周波数を返す。無音・非周期（子音やノイズ）なら null。
 */
export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  opts: PitchOptions = {},
): number | null {
  const {
    rmsThreshold = 0.01,
    peakRatio = 0.9,
    minHz = MIN_F0_HZ,
    maxHz = MAX_F0_HZ,
  } = opts;

  if (rms(frame) < rmsThreshold) return null;

  // minLag は探索を打ち切る位置には使わない（使うと高い音の周期を見落とす）。
  // 声より高い音は、最後の f0 範囲チェックで捨てる。
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(frame.length - 2, Math.ceil(sampleRate / minHz));
  if (maxLag <= minLag) return null;

  const d = nsdf(frame, maxLag);

  // 最初の「負 → 正」のゼロ交差より後だけを見る。
  // τ=0 の自明なピーク（必ず 1.0）を本命に選ばないため。
  //
  // ここを minLag まで飛ばしてはいけない。飛ばすと、声より高い音（口笛など）の
  // 本来のピークを見落として周期の整数倍地点を拾い、実際より低い音を報告してしまう。
  // 一度素直に探してから、最後に範囲外として捨てる。
  let start = 1;
  let seenNegative = false;
  for (let tau = 1; tau <= maxLag; tau++) {
    if (!seenNegative) {
      if (d[tau] < 0) seenNegative = true;
      continue;
    }
    if (d[tau] > 0) {
      start = Math.max(2, tau);
      break;
    }
  }
  if (!seenNegative) return null; // 一度も負にならない = 周期が見つからない

  // 極大点を集める
  const peaks: number[] = [];
  for (let tau = start + 1; tau < maxLag; tau++) {
    if (d[tau] > d[tau - 1] && d[tau] >= d[tau + 1]) peaks.push(tau);
  }
  if (peaks.length === 0) return null;

  let best = peaks[0];
  for (const p of peaks) if (d[p] > d[best]) best = p;

  const threshold = peakRatio * d[best];
  if (d[best] <= 0) return null;

  // しきい値を超える「最初の」ピークを採る（= 最も短い周期 = オクターブ下を避ける）
  let chosen = best;
  for (const p of peaks) {
    if (d[p] >= threshold) {
      chosen = p;
      break;
    }
  }

  const lag = refinePeak(d, chosen);
  if (lag <= 0) return null;
  const f0 = sampleRate / lag;
  if (f0 < minHz || f0 > maxHz) return null;
  return f0;
}
