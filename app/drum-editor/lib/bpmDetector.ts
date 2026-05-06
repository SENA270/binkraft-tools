/**
 * BPM detection from audio using onset detection + interval histogram.
 * Uses Web Audio API AudioBuffer as input.
 */

const MIN_BPM = 60;
const MAX_BPM = 200;
const DEFAULT_BPM = 120;

/**
 * Mix stereo AudioBuffer down to mono Float32Array.
 */
function toMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) {
    return buffer.getChannelData(0);
  }
  const length = buffer.length;
  const mono = new Float32Array(length);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  for (let i = 0; i < length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5;
  }
  return mono;
}

/**
 * Apply a simple low-pass filter (moving average) to emphasize kick/bass.
 * Window size controls cutoff — larger = lower frequencies pass through.
 */
function lowPass(data: Float32Array, windowSize: number): Float32Array {
  const out = new Float32Array(data.length);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= windowSize) {
      sum -= data[i - windowSize];
    }
    out[i] = sum / Math.min(i + 1, windowSize);
  }
  return out;
}

/**
 * Calculate RMS energy in chunks.
 */
function energyEnvelope(
  data: Float32Array,
  chunkSize: number
): Float32Array {
  const numChunks = Math.floor(data.length / chunkSize);
  const envelope = new Float32Array(numChunks);
  for (let i = 0; i < numChunks; i++) {
    let sum = 0;
    const offset = i * chunkSize;
    for (let j = 0; j < chunkSize; j++) {
      const v = data[offset + j];
      sum += v * v;
    }
    envelope[i] = Math.sqrt(sum / chunkSize);
  }
  return envelope;
}

/**
 * Detect peaks in energy envelope where energy rises significantly.
 * Returns indices of peaks.
 */
function detectOnsets(
  envelope: Float32Array,
  threshold: number
): number[] {
  const peaks: number[] = [];
  // Spectral flux style: look for significant rises
  for (let i = 1; i < envelope.length; i++) {
    const diff = envelope[i] - envelope[i - 1];
    if (diff > threshold) {
      // Make sure we don't pick consecutive frames — require a gap
      if (peaks.length === 0 || i - peaks[peaks.length - 1] > 3) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

/**
 * From peak indices and chunk timing, find most common BPM via interval histogram.
 */
function findBpmFromPeaks(
  peaks: number[],
  chunkDurationSec: number
): number | null {
  if (peaks.length < 4) return null;

  // Calculate all intervals between nearby peaks
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const dt = (peaks[i] - peaks[i - 1]) * chunkDurationSec;
    const bpm = 60 / dt;
    // Only consider reasonable range
    if (bpm >= MIN_BPM && bpm <= MAX_BPM) {
      intervals.push(dt);
    }
  }

  if (intervals.length < 2) return null;

  // Build a BPM histogram with 1-BPM resolution
  const histogram = new Map<number, number>();
  for (const dt of intervals) {
    const bpm = Math.round(60 / dt);
    if (bpm >= MIN_BPM && bpm <= MAX_BPM) {
      histogram.set(bpm, (histogram.get(bpm) || 0) + 1);
    }
  }

  // Also check half-time and double-time groupings
  // Smooth the histogram: merge adjacent BPM values (within +/-1)
  let bestBpm = DEFAULT_BPM;
  let bestCount = 0;
  for (const [bpm, count] of histogram) {
    // Sum count with neighbors for robustness
    const neighborCount =
      count +
      (histogram.get(bpm - 1) || 0) +
      (histogram.get(bpm + 1) || 0);
    if (neighborCount > bestCount) {
      bestCount = neighborCount;
      bestBpm = bpm;
    }
  }

  return bestBpm;
}

/**
 * Detect BPM from an AudioBuffer.
 * Returns detected BPM (integer), or 120 as fallback.
 */
export async function detectBpm(audioBuffer: AudioBuffer): Promise<number> {
  try {
    const sampleRate = audioBuffer.sampleRate;
    const mono = toMono(audioBuffer);

    // Low-pass filter to focus on kick frequencies
    // Window of ~10ms at given sample rate
    const lpWindowSize = Math.round(sampleRate * 0.01);
    const filtered = lowPass(mono, lpWindowSize);

    // Energy envelope with ~10ms chunks (good resolution for beat detection)
    const chunkSize = 1024;
    const chunkDurationSec = chunkSize / sampleRate;
    const envelope = energyEnvelope(filtered, chunkSize);

    // Adaptive threshold: use a fraction of the mean energy
    let meanEnergy = 0;
    for (let i = 0; i < envelope.length; i++) {
      meanEnergy += envelope[i];
    }
    meanEnergy /= envelope.length;

    // Try multiple thresholds and pick the one that gives most consistent results
    const thresholds = [0.3, 0.5, 0.7, 1.0];
    let bestResult: number | null = null;
    let bestPeakCount = 0;

    for (const mult of thresholds) {
      const threshold = meanEnergy * mult;
      const peaks = detectOnsets(envelope, threshold);
      const bpm = findBpmFromPeaks(peaks, chunkDurationSec);

      if (bpm !== null && peaks.length > bestPeakCount) {
        // Prefer threshold that gives more peaks (more data = more confident)
        // but only if it produced a valid BPM
        bestPeakCount = peaks.length;
        bestResult = bpm;
      }
    }

    if (bestResult !== null) {
      return Math.max(MIN_BPM, Math.min(MAX_BPM, bestResult));
    }

    return DEFAULT_BPM;
  } catch {
    return DEFAULT_BPM;
  }
}

/**
 * Calculate the number of measures from audio duration, BPM, and time signature.
 */
export function calculateMeasures(
  audioDurationSec: number,
  bpm: number,
  beatsPerMeasure: number
): number {
  const secondsPerMeasure = beatsPerMeasure * (60 / bpm);
  return Math.ceil(audioDurationSec / secondsPerMeasure);
}
