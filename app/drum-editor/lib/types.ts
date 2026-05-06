/** GM Drum note numbers (27-87) */
export const GM_DRUM_MAP: Record<number, string> = {
  27: "High Q",
  28: "Slap",
  29: "Scratch Push",
  30: "Scratch Pull",
  31: "Sticks",
  32: "Square Click",
  33: "Metronome Click",
  34: "Metronome Bell",
  35: "Acoustic Bass Drum",
  36: "Bass Drum 1 (Kick)",
  37: "Side Stick",
  38: "Acoustic Snare",
  39: "Hand Clap",
  40: "Electric Snare",
  41: "Low Floor Tom",
  42: "Closed Hi-Hat",
  43: "High Floor Tom",
  44: "Pedal Hi-Hat",
  45: "Low Tom",
  46: "Open Hi-Hat",
  47: "Low-Mid Tom",
  48: "Hi-Mid Tom",
  49: "Crash Cymbal 1",
  50: "High Tom",
  51: "Ride Cymbal 1",
  52: "Chinese Cymbal",
  53: "Ride Bell",
  54: "Tambourine",
  55: "Splash Cymbal",
  56: "Cowbell",
  57: "Crash Cymbal 2",
  58: "Vibraslap",
  59: "Ride Cymbal 2",
  60: "Hi Bongo",
  61: "Low Bongo",
  62: "Mute Hi Conga",
  63: "Open Hi Conga",
  64: "Low Conga",
  65: "High Timbale",
  66: "Low Timbale",
  67: "High Agogo",
  68: "Low Agogo",
  69: "Cabasa",
  70: "Maracas",
  71: "Short Whistle",
  72: "Long Whistle",
  73: "Short Guiro",
  74: "Long Guiro",
  75: "Claves",
  76: "Hi Wood Block",
  77: "Low Wood Block",
  78: "Mute Cuica",
  79: "Open Cuica",
  80: "Mute Triangle",
  81: "Open Triangle",
  82: "Shaker",
  83: "Jingle Bell",
  84: "Bell Tree",
  85: "Castanets",
  86: "Mute Surdo",
  87: "Open Surdo",
};

/** Japanese names for display */
export const GM_DRUM_NAMES_JA: Record<number, string> = {
  27: "ハイQ",
  28: "スラップ",
  29: "スクラッチプッシュ",
  30: "スクラッチプル",
  31: "スティックス",
  32: "スクエアクリック",
  33: "メトロノームクリック",
  34: "メトロノームベル",
  35: "アコースティックバスドラム",
  36: "バスドラム (キック)",
  37: "サイドスティック",
  38: "スネア",
  39: "ハンドクラップ",
  40: "エレクトリックスネア",
  41: "ローフロアタム",
  42: "クローズドハイハット",
  43: "ハイフロアタム",
  44: "ペダルハイハット",
  45: "ロータム",
  46: "オープンハイハット",
  47: "ローミッドタム",
  48: "ハイミッドタム",
  49: "クラッシュシンバル1",
  50: "ハイタム",
  51: "ライドシンバル1",
  52: "チャイニーズシンバル",
  53: "ライドベル",
  54: "タンバリン",
  55: "スプラッシュシンバル",
  56: "カウベル",
  57: "クラッシュシンバル2",
  58: "ビブラスラップ",
  59: "ライドシンバル2",
  60: "ハイボンゴ",
  61: "ローボンゴ",
  62: "ミュートハイコンガ",
  63: "オープンハイコンガ",
  64: "ローコンガ",
  65: "ハイティンバレス",
  66: "ローティンバレス",
  67: "ハイアゴゴ",
  68: "ローアゴゴ",
  69: "カバサ",
  70: "マラカス",
  71: "ショートホイッスル",
  72: "ロングホイッスル",
  73: "ショートギロ",
  74: "ロングギロ",
  75: "クラベス",
  76: "ハイウッドブロック",
  77: "ローウッドブロック",
  78: "ミュートクイーカ",
  79: "オープンクイーカ",
  80: "ミュートトライアングル",
  81: "オープントライアングル",
  82: "シェイカー",
  83: "ジングルベル",
  84: "ベルツリー",
  85: "カスタネット",
  86: "ミュートスルド",
  87: "オープンスルド",
};

/** Instrument category for visual grouping */
export const DRUM_CATEGORIES: Record<string, number[]> = {
  "Cymbals": [49, 51, 52, 53, 55, 57, 59],
  "Hi-Hats": [42, 44, 46],
  "Snares": [38, 40, 37, 39],
  "Toms": [50, 48, 47, 45, 43, 41],
  "Kicks": [36, 35],
  "Latin": [54, 56, 58, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 75, 82, 83, 84, 85, 86, 87],
  "Effects": [71, 72, 73, 74, 76, 77, 78, 79, 80, 81],
  "Electronic": [27, 28, 29, 30, 31, 32, 33, 34],
};

/** Category label in Japanese */
export const DRUM_CATEGORY_NAMES_JA: Record<string, string> = {
  "Cymbals": "シンバル",
  "Hi-Hats": "ハイハット",
  "Snares": "スネア",
  "Toms": "タム",
  "Kicks": "キック",
  "Latin": "ラテンパーカッション",
  "Effects": "エフェクト",
  "Electronic": "エレクトロニック",
};

/** Get category for a given note number */
export function getDrumCategory(note: number): string | undefined {
  for (const [cat, notes] of Object.entries(DRUM_CATEGORIES)) {
    if (notes.includes(note)) return cat;
  }
  return undefined;
}

/** Default instruments when no MIDI file is loaded (common kit ~16 instruments) */
export const DEFAULT_INSTRUMENTS = [
  49, 57, // Crash 1, Crash 2
  51, 53, // Ride, Ride Bell
  46, 42, 44, // Open HH, Closed HH, Pedal HH
  38, 40, 37, 39, // Snare, E-Snare, Side Stick, Clap
  50, 48, 47, 45, 43, 41, // Toms high to low
  36, 35, // Kick
];

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
