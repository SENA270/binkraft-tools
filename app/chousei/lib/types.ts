// 調整さん改良版ツールの型。時刻はすべて「00:00からの分」(0-1440)で扱う。

/** 空き時間帯 [start, end)。分単位。 */
export type Interval = { start: number; end: number };

/** ある参加者の、ある日の回答。 */
export type DayAvailability = {
  unavailable: boolean; // × 終日不可
  intervals: Interval[]; // 空き時間帯(unavailable=false のとき有効)
};

/** ある参加者の全回答。byDate のキーは "YYYY-MM-DD"。 */
export type ParticipantResponse = {
  name: string;
  byDate: Record<string, DayAvailability>;
};

/** イベント設定(主催者が作る)。 */
export type EventConfig = {
  candidateDates: string[]; // "YYYY-MM-DD" の配列
  dayStart: number; // 入力レンジ下限(分)。例 540 = 09:00
  dayEnd: number; // 入力レンジ上限(分)。例 1380 = 23:00
  slotMinutes: number; // 粒度(15/30/60)
  requiredMinutes?: number; // 「N分連続で空いてる窓だけ出す」。未指定なら slotMinutes
};

/** 算出された「みんなが出れる時間窓」。 */
export type OverlapWindow = {
  date: string;
  start: number; // 分
  end: number; // 分
  count: number; // この窓に出れる人数
  total: number; // 回答者総数
  attendees: string[]; // 全スロットで空いている人
  absentees: string[]; // 出れない人(total - attendees)
  isFullConsensus: boolean; // count === total
};
