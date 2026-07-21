"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * チーゲーム — 語尾「チー」縛りワードバトル
 *
 * 遊び方: プレイヤーが順番に「チー」で終わる言葉を言う。
 * 詰まる・時間切れ・被り・しばり違反でライフを失い、ライフ0で脱落。最後の1人が優勝。
 * 判定はアプリではなく「その場の全員のツッコミ」で行う (パーティゲームの本質)。
 * スマホは真ん中に置く or 回して使う。
 *
 * v2 (実戦投入前の改善):
 * - ライフ制 (サドンデス/2/3): 少人数でも一瞬で終わらない
 * - 「1つ戻す」: 飲み会での誤タップ・判定ひっくり返しに対応
 * - 音ON/OFF: 静かな場所用 (localStorage に記憶)
 * - しばりお題 30→50種 / 順番シャッフル / 結果画面に順位表
 */

type Phase = "setup" | "play" | "result";

type Player = {
  name: string;
  lives: number;
};

/** しばりお題。tag は表示用の分類 */
const SHIBARI_DECK: { text: string; tag: string }[] = [
  // ジャンル
  { text: "食べ物っぽい言葉だけ", tag: "ジャンル" },
  { text: "動物っぽい言葉だけ", tag: "ジャンル" },
  { text: "人の名前・あだ名っぽく", tag: "ジャンル" },
  { text: "地名っぽい言葉だけ", tag: "ジャンル" },
  { text: "駅名っぽく", tag: "ジャンル" },
  { text: "お菓子っぽい言葉で", tag: "ジャンル" },
  { text: "乗り物っぽい言葉で", tag: "ジャンル" },
  { text: "キャラの必殺技っぽく", tag: "ジャンル" },
  { text: "魔法の呪文っぽく", tag: "ジャンル" },
  { text: "戦国武将の名前っぽく", tag: "ジャンル" },
  { text: "アイドルのあだ名っぽく", tag: "ジャンル" },
  { text: "スポーツの技っぽく", tag: "ジャンル" },
  { text: "会社の商品名っぽく", tag: "ジャンル" },
  { text: "色の名前を入れる", tag: "ジャンル" },
  { text: "昭和っぽい言葉で", tag: "ジャンル" },
  { text: "学校にありそうな言葉で", tag: "ジャンル" },
  { text: "居酒屋にありそうな言葉で", tag: "ジャンル" },
  // ルール
  { text: "実在する言葉のみ (造語禁止)", tag: "ルール" },
  { text: "造語OK・ただし意味の解説必須", tag: "ルール" },
  { text: "4文字以内で", tag: "ルール" },
  { text: "6文字以上で", tag: "ルール" },
  { text: "濁点を1つ以上入れる", tag: "ルール" },
  { text: "「ッチー」で終わらせる", tag: "ルール" },
  { text: "カタカナ語禁止", tag: "ルール" },
  { text: "直前の人の言葉と関連させる", tag: "ルール" },
  { text: "英単語を1つ混ぜる", tag: "ルール" },
  { text: "数字を入れる", tag: "ルール" },
  // 演技
  { text: "悲しそうに言う", tag: "演技" },
  { text: "満面の笑みで言う", tag: "演技" },
  { text: "ささやき声で言う", tag: "演技" },
  { text: "できるだけ大声で言う", tag: "演技" },
  { text: "赤ちゃん言葉っぽく言う", tag: "演技" },
  { text: "関西弁のノリで言う", tag: "演技" },
  { text: "ラップ調で言う", tag: "演技" },
  { text: "外国人っぽい発音で言う", tag: "演技" },
  { text: "丁寧語に混ぜて言う (例: 〜でございまスチー)", tag: "演技" },
  { text: "決めポーズ付きで言う", tag: "演技" },
  { text: "立ち上がって言う", tag: "演技" },
  { text: "目を閉じて言う", tag: "演技" },
  { text: "誰かを指差しながら言う", tag: "演技" },
  { text: "早口で3回繰り返す", tag: "演技" },
  { text: "泣きそうな声で言う", tag: "演技" },
  { text: "怒りながら言う", tag: "演技" },
  { text: "照れながら言う", tag: "演技" },
  { text: "ヒーローの決め台詞っぽく言う", tag: "演技" },
  { text: "悪役っぽく言う", tag: "演技" },
  { text: "お母さんが言いそうなトーンで", tag: "演技" },
  { text: "社長のプレゼンっぽく言う", tag: "演技" },
  { text: "実況アナウンサーっぽく言う", tag: "演技" },
  { text: "ジャンプしながら言う", tag: "演技" },
  // フリー
  { text: "しばりなし (自由!)", tag: "フリー" },
];

const HINT_EXAMPLES = [
  "ライチー",
  "リッチー",
  "みっちー",
  "ぐっちー",
  "セクシーコマンドチー",
  "モチモチのモチー",
  "ハイパーエナジーチー",
  "課長の田口チー",
];

const TIMER_OPTIONS = [
  { label: "なし", value: 0 },
  { label: "5秒", value: 5 },
  { label: "7秒", value: 7 },
  { label: "10秒", value: 10 },
];

const SHIBARI_FREQ_OPTIONS = [
  { label: "毎ターン", value: 1 },
  { label: "3ターンごと", value: 3 },
  { label: "1周ごと", value: -1 },
  { label: "なし", value: 0 },
];

const LIVES_OPTIONS = [
  { label: "サドンデス", value: 1 },
  { label: "ライフ2", value: 2 },
  { label: "ライフ3", value: 3 },
];

/** 「1つ戻す」用のスナップショット */
type Snapshot = {
  players: Player[];
  turnIdx: number;
  turnCount: number;
  deckPos: number;
  outOrder: string[];
  phase: Phase;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CheeGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerCount, setPlayerCount] = useState(3);
  const [names, setNames] = useState<string[]>([]);
  const [timerSec, setTimerSec] = useState(7);
  const [shibariFreq, setShibariFreq] = useState(1);
  const [livesSetting, setLivesSetting] = useState(1);
  const [shuffleOrder, setShuffleOrder] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [turnIdx, setTurnIdx] = useState(0); // players 配列上の index
  const [turnCount, setTurnCount] = useState(0);
  const [deck, setDeck] = useState(() => shuffle(SHIBARI_DECK));
  const [deckPos, setDeckPos] = useState(0);
  const [outOrder, setOutOrder] = useState<string[]>([]); // 脱落した順に名前を積む
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // 音設定を復元 (SSRでは localStorage が無いので effect で)
  useEffect(() => {
    try {
      if (localStorage.getItem("chee-sound") === "0") setSoundOn(false);
    } catch {
      // localStorage 不可でも続行
    }
  }, []);

  const toggleSound = () => {
    setSoundOn((v) => {
      const next = !v;
      try {
        localStorage.setItem("chee-sound", next ? "1" : "0");
      } catch {
        // 保存できなくても切り替え自体は有効
      }
      return next;
    });
  };

  // iOS 対策: ユーザー操作起点で AudioContext を確保してビープを鳴らす
  const beep = useCallback(
    (freq: number, durMs: number) => {
      if (!soundOn) return;
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durMs / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + durMs / 1000);
      } catch {
        // 音が鳴らせない環境でもゲームは続行
      }
    },
    [soundOn]
  );

  const alivePlayers = players.filter((p) => p.lives > 0);
  const aliveCount = alivePlayers.length;
  const currentShibari = shibariFreq === 0 ? null : deck[deckPos % deck.length];

  // ターンタイマー
  useEffect(() => {
    if (phase !== "play" || timerSec === 0 || timedOut) return;
    if (timeLeft <= 0) return;
    const t = setTimeout(() => {
      const next = timeLeft - 1;
      setTimeLeft(next);
      if (next <= 3 && next > 0) beep(880, 90);
      if (next === 0) {
        beep(220, 600);
        setTimedOut(true);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, timerSec, timedOut, beep]);

  const startGame = () => {
    let ps: Player[] = Array.from({ length: playerCount }, (_, i) => ({
      name: (names[i] || "").trim() || `プレイヤー${i + 1}`,
      lives: livesSetting,
    }));
    if (shuffleOrder) ps = shuffle(ps);
    setPlayers(ps);
    setTurnIdx(0);
    setTurnCount(0);
    setDeck(shuffle(SHIBARI_DECK));
    setDeckPos(0);
    setOutOrder([]);
    setHistory([]);
    setTimeLeft(timerSec);
    setTimedOut(false);
    setPhase("play");
    beep(660, 120); // 操作起点で AudioContext を起こしておく
  };

  const nextAliveIdx = (from: number, ps: Player[]) => {
    let i = from;
    do {
      i = (i + 1) % ps.length;
    } while (ps[i].lives <= 0);
    return i;
  };

  const pushHistory = () => {
    setHistory((h) => {
      const snap: Snapshot = { players, turnIdx, turnCount, deckPos, outOrder, phase };
      const next = [...h, snap];
      return next.length > 30 ? next.slice(-30) : next;
    });
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setPlayers(last.players);
    setTurnIdx(last.turnIdx);
    setTurnCount(last.turnCount);
    setDeckPos(last.deckPos);
    setOutOrder(last.outOrder);
    setPhase(last.phase);
    setTimeLeft(timerSec);
    setTimedOut(false);
    beep(440, 100);
  };

  const advanceShibari = (newTurnCount: number, wrapped: boolean) => {
    if (shibariFreq === 0) return;
    if (shibariFreq === -1) {
      if (wrapped) setDeckPos((p) => p + 1);
      return;
    }
    if (newTurnCount % shibariFreq === 0) setDeckPos((p) => p + 1);
  };

  const goNextTurn = (ps: Player[]) => {
    const ni = nextAliveIdx(turnIdx, ps);
    const wrapped = ni <= turnIdx;
    const nt = turnCount + 1;
    setTurnCount(nt);
    setTurnIdx(ni);
    advanceShibari(nt, wrapped);
    setTimeLeft(timerSec);
    setTimedOut(false);
  };

  const handleSafe = () => {
    pushHistory();
    goNextTurn(players);
    beep(660, 100);
  };

  const handleOut = () => {
    pushHistory();
    const cur = players[turnIdx];
    const ps = players.map((p, i) => (i === turnIdx ? { ...p, lives: p.lives - 1 } : p));
    const nowDead = ps[turnIdx].lives <= 0;
    const remain = ps.filter((p) => p.lives > 0).length;
    setPlayers(ps);
    if (nowDead) setOutOrder((o) => [...o, cur.name]);
    beep(330, 250);
    if (nowDead && remain <= 1) {
      setPhase("result");
      return;
    }
    goNextTurn(ps);
  };

  const rerollShibari = () => {
    setDeckPos((p) => p + 1);
    beep(550, 80);
  };

  const winner = alivePlayers[0];
  // 順位: 優勝者 → 後に脱落した人ほど上位
  const ranking = winner ? [winner.name, ...[...outOrder].reverse()] : [...outOrder].reverse();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
            ← ツール一覧
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              aria-label={soundOn ? "効果音をオフにする" : "効果音をオンにする"}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {soundOn ? "🔊 音あり" : "🔇 音なし"}
            </button>
            <button
              onClick={() => setShowRules(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              遊び方
            </button>
          </div>
        </div>

        <h1 className="text-center mb-1">
          <span className="text-3xl font-black tracking-wide bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            チーゲーム
          </span>
        </h1>
        <p className="text-center text-xs text-slate-400 mb-6">
          語尾「チー」縛りワードバトル 🀄
        </p>

        {/* ===== 設定 ===== */}
        {phase === "setup" && (
          <div className="space-y-5">
            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-3 text-slate-300">プレイヤー ({playerCount}人)</h2>
              <div className="flex gap-2 mb-3">
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setPlayerCount(n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                      playerCount === n
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: playerCount }, (_, i) => (
                  <input
                    key={i}
                    value={names[i] || ""}
                    onChange={(e) => {
                      const next = [...names];
                      next[i] = e.target.value;
                      setNames(next);
                    }}
                    placeholder={`プレイヤー${i + 1} (名前は任意)`}
                    className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={shuffleOrder}
                  onChange={(e) => setShuffleOrder(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                順番をランダムにする
              </label>
            </section>

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-3 text-slate-300">ライフ (何回アウトで脱落?)</h2>
              <div className="flex gap-2">
                {LIVES_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setLivesSetting(o.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      livesSetting === o.value
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                少人数ならライフ2〜3が長く遊べておすすめ
              </p>
            </section>

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-3 text-slate-300">制限時間 / ターン</h2>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setTimerSec(o.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                      timerSec === o.value
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-3 text-slate-300">しばりお題の切り替え</h2>
              <div className="flex gap-2">
                {SHIBARI_FREQ_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setShibariFreq(o.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      shibariFreq === o.value
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </section>

            <button
              onClick={startGame}
              className="w-full py-4 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 active:scale-[0.98] transition shadow-lg shadow-emerald-500/20"
            >
              ゲームスタート 🀄
            </button>
          </div>
        )}

        {/* ===== プレイ中 ===== */}
        {phase === "play" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>ターン {turnCount + 1} ・ 残り {aliveCount}人</span>
              <button
                onClick={undo}
                disabled={history.length === 0}
                className={`px-3 py-1 rounded-full border text-[11px] ${
                  history.length === 0
                    ? "border-slate-800 text-slate-700"
                    : "border-slate-600 text-slate-300 active:bg-slate-800"
                }`}
              >
                ↩ 1つ戻す
              </button>
            </div>

            {/* 現在のプレイヤー */}
            <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 mb-1">いまの番</p>
              <p className="text-3xl font-black text-emerald-300 mb-1">
                {players[turnIdx]?.name}
              </p>
              {livesSetting > 1 && (
                <p className="text-sm mb-2" aria-label="残りライフ">
                  {"❤️".repeat(Math.max(players[turnIdx]?.lives ?? 0, 0))}
                </p>
              )}
              {timerSec > 0 && (
                <p
                  className={`text-5xl font-black tabular-nums ${
                    timedOut
                      ? "text-red-400"
                      : timeLeft <= 3
                        ? "text-amber-300"
                        : "text-slate-200"
                  }`}
                >
                  {timedOut ? "時間切れ!" : timeLeft}
                </p>
              )}
              <p className="mt-3 text-sm text-slate-400">
                「◯◯◯<span className="text-emerald-300 font-bold">チー</span>」と言え!
              </p>
            </section>

            {/* しばりお題 */}
            {currentShibari && (
              <section className="bg-gradient-to-r from-emerald-950 to-teal-950 rounded-2xl p-4 border border-emerald-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-200">
                    しばり: {currentShibari.tag}
                  </span>
                  <button
                    onClick={rerollShibari}
                    className="text-[10px] text-emerald-300 underline underline-offset-2"
                  >
                    別のお題にする
                  </button>
                </div>
                <p className="text-lg font-bold text-emerald-100">{currentShibari.text}</p>
              </section>
            )}

            {/* 判定ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleOut}
                className="py-5 rounded-2xl text-lg font-black bg-red-500/90 text-white active:scale-[0.97] transition"
              >
                アウト 💀
              </button>
              <button
                onClick={handleSafe}
                className="py-5 rounded-2xl text-lg font-black bg-emerald-500 text-slate-950 active:scale-[0.97] transition"
              >
                セーフ →
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-500">
              判定はその場の全員のツッコミで。詰まり・被り・しばり違反はアウト
            </p>

            {/* 生存者リスト */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {players.map((p, i) => (
                <span
                  key={i}
                  className={`text-[11px] px-2 py-1 rounded-full ${
                    p.lives <= 0
                      ? "bg-slate-900 text-slate-600 line-through"
                      : i === turnIdx
                        ? "bg-emerald-500 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {p.name}
                  {livesSetting > 1 && p.lives > 0 ? ` ${"❤️".repeat(p.lives)}` : ""}
                </span>
              ))}
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={() => setShowHints(true)}
                className="text-xs text-slate-500 underline underline-offset-2"
              >
                困った時のチー例
              </button>
              <button
                onClick={() => setPhase("setup")}
                className="text-xs text-slate-500 underline underline-offset-2"
              >
                設定に戻る
              </button>
            </div>
          </div>
        )}

        {/* ===== 結果 ===== */}
        {phase === "result" && (
          <div className="space-y-5 text-center">
            <section className="bg-gradient-to-b from-emerald-950 to-slate-900 rounded-2xl p-8 border border-emerald-800">
              <p className="text-5xl mb-3">🏆</p>
              <p className="text-xs text-emerald-300 mb-1">優勝 — 本日のチーマスター</p>
              <p className="text-3xl font-black text-emerald-200">{winner?.name || "—"}</p>
              <p className="mt-3 text-xs text-slate-400">全 {turnCount + 1} ターンの死闘でした</p>
            </section>

            {ranking.length > 1 && (
              <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-left">
                <h2 className="text-xs font-bold text-slate-400 mb-2 text-center">最終順位</h2>
                <ol className="space-y-1">
                  {ranking.map((name, i) => (
                    <li key={`${name}-${i}`} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-center">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}位`}
                      </span>
                      <span className={i === 0 ? "font-bold text-emerald-200" : "text-slate-300"}>
                        {name}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPhase("setup")}
                className="py-3 rounded-2xl text-sm font-bold bg-slate-800 text-slate-300 active:scale-[0.97] transition"
              >
                設定を変える
              </button>
              <button
                onClick={startGame}
                className="py-3 rounded-2xl text-sm font-bold bg-emerald-500 text-slate-950 active:scale-[0.97] transition"
              >
                同じメンバーでもう一回
              </button>
            </div>
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              ↩ 判定まちがえた (1つ戻す)
            </button>
          </div>
        )}
      </div>

      {/* ===== 遊び方モーダル ===== */}
      {showRules && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-5"
          onClick={() => setShowRules(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl p-5 max-w-sm w-full border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black mb-3 text-emerald-300">遊び方</h2>
            <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
              <li>順番に「<b>チー</b>」で終わる言葉を言う (例: ライチー)</li>
              <li>詰まったら・時間切れ・前に出た言葉と被ったら<b>アウト</b></li>
              <li>「しばりお題」がある時はそれも守る</li>
              <li>セーフかアウトかは<b>その場の全員のツッコミ</b>で決める</li>
              <li>アウトでライフが減り、ライフ0で脱落。最後の1人が優勝 🏆</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              スマホは真ん中に置くか、順番に回してね。押し間違えたら「↩ 1つ戻す」
            </p>
            <button
              onClick={() => setShowRules(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
            >
              OK!
            </button>
          </div>
        </div>
      )}

      {/* ===== チー例モーダル ===== */}
      {showHints && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-5"
          onClick={() => setShowHints(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl p-5 max-w-sm w-full border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black mb-3 text-emerald-300">チー例 (見たら負けな気もする)</h2>
            <div className="flex flex-wrap gap-2">
              {HINT_EXAMPLES.map((h) => (
                <span key={h} className="text-sm px-3 py-1.5 rounded-full bg-slate-800 text-slate-300">
                  {h}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowHints(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
