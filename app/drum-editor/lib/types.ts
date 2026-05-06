/** GM Drum note numbers */
export const GM_DRUM_MAP: Record<number, string> = {
  35: "Acoustic Bass Drum",
  36: "Kick",
  37: "Side Stick",
  38: "Snare",
  39: "Hand Clap",
  40: "Electric Snare",
  42: "Closed Hi-Hat",
  44: "Pedal Hi-Hat",
  46: "Open Hi-Hat",
  49: "Crash",
  51: "Ride",
  45: "Low Tom",
  47: "Mid Tom",
  48: "Hi-Mid Tom",
  50: "High Tom",
};

/** Japanese names for display */
export const GM_DRUM_NAMES_JA: Record<number, string> = {
  35: "バスドラム",
  36: "キック",
  37: "サイドスティック",
  38: "スネア",
  39: "ハンドクラップ",
  40: "エレクトリックスネア",
  42: "クローズハイハット",
  44: "ペダルハイハット",
  46: "オープンハイハット",
  49: "クラッシュ",
  51: "ライド",
  45: "ロータム",
  47: "ミッドタム",
  48: "ハイミッドタム",
  50: "ハイタム",
};

/** Default instruments when no MIDI file is loaded */
export const DEFAULT_INSTRUMENTS = [49, 51, 46, 42, 38, 50, 48, 47, 45, 36];

/** A single drum note */
export interface DrumNote {
  /** GM note number */
  note: number;
  /** Tick position (in the grid's resolution) */
  tick: number;
  /** Velocity 0-127 */
  velocity: number;
}

/** Editor state */
export interface EditorState {
  notes: DrumNote[];
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  /** Total measures */
  measures: number;
  /** Ticks per beat (quarter note) — grid resolution */
  ticksPerBeat: number;
  /** Instrument rows (GM note numbers) */
  instruments: number[];
}

/** Undo/redo snapshot */
export interface Snapshot {
  notes: DrumNote[];
  instruments: number[];
  measures: number;
}

export const DEFAULT_BPM = 120;
export const DEFAULT_MEASURES = 4;
export const DEFAULT_TICKS_PER_BEAT = 4; // 16th note resolution
