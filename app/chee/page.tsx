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
 *
 * v3 (中高生の口コミ拡散に寄せた強化):
 * - お題 50→74種 (演技USPを増量) + お題タイプ選択 (演技多め/ゆるめ)
 * - 自分たちのお題を追加 (教室・内輪ネタ / localStorage 保存)
 * - 結果シェア (Web Share API) / タイマーのプログレスバー / 端末バイブ
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
  { text: "給食・購買にありそうな言葉で", tag: "ジャンル" },
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
  { text: "先生の説教っぽく言う", tag: "演技" },
  { text: "校内放送っぽく言う", tag: "演技" },
  { text: "テスト前の言い訳っぽく言う", tag: "演技" },
  { text: "実況アナウンサーっぽく言う", tag: "演技" },
  { text: "ジャンプしながら言う", tag: "演技" },
  { text: "アニメの主人公っぽく言う", tag: "演技" },
  { text: "ナレーション風に言う", tag: "演技" },
  { text: "ロボットっぽく言う", tag: "演技" },
  { text: "モノマネを1つ入れて言う", tag: "演技" },
  { text: "占い師っぽく言う", tag: "演技" },
  { text: "通販番組っぽく紹介する", tag: "演技" },
  { text: "ゲーム実況っぽく言う", tag: "演技" },
  { text: "ため息まじりに言う", tag: "演技" },
  { text: "びっくりしながら言う", tag: "演技" },
  { text: "とにかくドヤ顔で言う", tag: "演技" },
  { text: "言い終わりに変なポーズを足す", tag: "演技" },
  { text: "歌うように言う", tag: "演技" },
  // ジャンル(追加)
  { text: "ゲームのキャラっぽく", tag: "ジャンル" },
  { text: "アニメのタイトルっぽく", tag: "ジャンル" },
  { text: "部活っぽい言葉で", tag: "ジャンル" },
  { text: "文房具っぽい言葉で", tag: "ジャンル" },
  { text: "コンビニにありそうな言葉で", tag: "ジャンル" },
  { text: "教科名っぽく", tag: "ジャンル" },
  { text: "YouTuberっぽい名前で", tag: "ジャンル" },
  // ルール(追加)
  { text: "前の人の最後の音で始める", tag: "ルール" },
  { text: "同じ言葉を2回続けて言う", tag: "ルール" },
  { text: "ひらがな3文字ちょうどで", tag: "ルール" },
  { text: "小さい「ッ」を入れる", tag: "ルール" },
  { text: "3秒以内に即答する", tag: "ルール" },
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

/** お題デッキのタイプ。演技=USP を選べるようにする */
const DECK_MODES = [
  { key: "all", label: "おまかせ" },
  { key: "act", label: "演技多め" },
  { key: "easy", label: "ゆるめ" },
] as const;

type DeckMode = (typeof DECK_MODES)[number]["key"];

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
  const [deckMode, setDeckMode] = useState<DeckMode>("all");
  const [customShibari, setCustomShibari] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [shareToast, setShareToast] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // 音設定を復元 (SSRでは localStorage が無いので effect で)
  useEffect(() => {
    try {
      if (localStorage.getItem("chee-sound") === "0") setSoundOn(false);
      const raw = localStorage.getItem("chee-custom");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomShibari(parsed.filter((x) => typeof x === "string"));
      }
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

  const persistCustom = (list: string[]) => {
    try {
      localStorage.setItem("chee-custom", JSON.stringify(list));
    } catch {
      // 保存できなくてもゲーム自体は続行
    }
  };

  const addCustom = () => {
    const t = customInput.trim();
    if (!t) return;
    setCustomShibari((list) => {
      if (list.includes(t) || list.length >= 20) return list;
      const next = [...list, t];
      persistCustom(next);
      return next;
    });
    setCustomInput("");
  };

  const removeCustom = (t: string) => {
    setCustomShibari((list) => {
      const next = list.filter((x) => x !== t);
      persistCustom(next);
      return next;
    });
  };

  // 端末バイブ (対応端末のみ・非対応でも無視)
  const buzz = (pattern: number | number[]) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // 非対応端末は無視
    }
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
        try {
          navigator.vibrate?.(200);
        } catch {
          // 非対応端末は無視
        }
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
    // 市場リサーチ(2026-07-20)の知見: 序盤は簡単に。1枚目は必ず「しばりなし」でルール学習させ、
    // 2枚目以降のしばり(演技系=このゲームのUSP)で盛り上げる
    // お題タイプに応じてデッキを構成 (演技=USP を選べる) + 自分たちのお題を合流
    const free = SHIBARI_DECK.find((c) => c.tag === "フリー");
    let pool = SHIBARI_DECK.filter((c) => c.tag !== "フリー");
    if (deckMode === "act") pool = pool.filter((c) => c.tag === "演技");
    else if (deckMode === "easy") pool = pool.filter((c) => c.tag !== "演技");
    const customCards = customShibari.map((t) => ({ text: t, tag: "オリジナル" }));
    const rest = shuffle([...pool, ...customCards]);
    setDeck(free ? [free, ...rest] : rest);
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
    buzz(nowDead ? [70, 50, 120] : 60);
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

  const shareText = winner
    ? `チーゲームで優勝！本日のチーマスターは「${winner.name}」👑\n語尾「チー」縛りの大喜利ワードバトル、スマホ1台で遊べるチー`
    : "語尾「チー」縛りの大喜利ワードバトル、スマホ1台で遊べるチー";

  const shareResult = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "チーゲーム", text: shareText, url });
        return;
      }
    } catch {
      return; // 共有シートをキャンセルした等
    }
    try {
      await navigator.clipboard.writeText(url ? `${shareText}\n${url}` : shareText);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      // クリップボードも使えない環境は何もしない
    }
  };

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
          語尾「チー」縛り×演技しばりの大喜利ワードバトル 🀄
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

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-3 text-slate-300">お題のタイプ</h2>
              <div className="flex gap-2">
                {DECK_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setDeckMode(m.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      deckMode === m.key
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                「演技多め」がこのゲームの本領。恥ずかしがり屋が多いグループは「ゆるめ」で
              </p>
            </section>

            <section className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <h2 className="text-sm font-bold mb-1 text-slate-300">自分たちのお題を追加</h2>
              <p className="text-[10px] text-slate-500 mb-3">
                教室ネタ・内輪ネタでもっと盛り上がる (この端末に保存されます)
              </p>
              <div className="flex gap-2">
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustom();
                  }}
                  placeholder="例: 部活の先輩っぽく言う"
                  maxLength={30}
                  className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={addCustom}
                  className="px-4 rounded-lg bg-emerald-500 text-slate-950 text-sm font-bold active:scale-95 transition"
                >
                  追加
                </button>
              </div>
              {customShibari.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {customShibari.map((t) => (
                    <button
                      key={t}
                      onClick={() => removeCustom(t)}
                      className="text-[11px] px-2 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-red-900/40"
                      aria-label={`お題「${t}」を削除`}
                    >
                      {t} ✕
                    </button>
                  ))}
                </div>
              )}
            </section>

            <button
              onClick={startGame}
              className="w-full py-4 rounded-2xl text-lg font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 active:scale-[0.98] transition shadow-lg shadow-emerald-500/20"
            >
              ゲームスタート 🀄
            </button>

            {/* 共有リンクで初めて来た人向けの着地コンテンツ (ゲームの下・邪魔しない位置) */}
            <section className="pt-6 border-t border-slate-800 space-y-5 text-sm text-slate-400 leading-relaxed">
              <div>
                <h2 className="text-slate-200 font-bold mb-2">チーゲームとは (30秒で分かる)</h2>
                <p>
                  順番に「<b className="text-emerald-300">チー</b>」で終わる言葉を言うだけのパーティゲームです
                  (例: ライチー、みっちー)。詰まったら・被ったらアウト。
                  途中から「ラップ調で言う」「悪役っぽく言う」などの<b className="text-slate-200">しばりお題</b>が出て、
                  語彙力より演技力と開き直りが試されます。準備なし・スマホ1台・無料です。
                </p>
              </div>
              <div>
                <h2 className="text-slate-200 font-bold mb-2">こんな時に</h2>
                <ul className="list-disc list-inside space-y-1">
                  <li>休み時間に教室で (3人〜が一番盛り上がります)</li>
                  <li>放課後・部活の待ち時間・修学旅行の夜に</li>
                  <li>2人の暇つぶしに (ライフ2〜3設定で長く遊べます)</li>
                  <li>通話しながらでも (進行役が1人でスマホを持てばOK)</li>
                  <li>しりとり・山手線ゲームに飽きた人の新しい定番に (大人の集まりでも)</li>
                </ul>
              </div>
              <div>
                <h2 className="text-slate-200 font-bold mb-2">しばりお題の例 (50種以上)</h2>
                <p>
                  食べ物っぽい言葉だけ / 駅名っぽく / 戦国武将の名前っぽく / 魔法の呪文っぽく /
                  ささやき声で言う / 実況アナウンサーっぽく / 悪役っぽく言う / ラップ調で言う /
                  「ッチー」で終わらせる / 造語OK・ただし意味の解説必須 …ほか50種以上をランダムで出題します。
                </p>
              </div>
              <div>
                <h2 className="text-slate-200 font-bold mb-2">よくある質問</h2>
                <p className="mb-1">
                  <b className="text-slate-300">Q. アプリのインストールは必要？</b><br />
                  不要です。このページを開くだけで遊べます。料金もかかりません。
                </p>
                <p className="mb-1">
                  <b className="text-slate-300">Q. 正解の判定はどうするの？</b><br />
                  アプリは判定しません。セーフかアウトかは、その場の全員のツッコミで決めるのがこのゲームの醍醐味です。
                </p>
                <p>
                  <b className="text-slate-300">Q. 何人から遊べる？</b><br />
                  2人から8人まで。おすすめは3〜6人です。
                </p>
              </div>
              <div>
                <h2 className="text-slate-200 font-bold mb-2">チーゲームの由来</h2>
                <p>
                  作者がラーメン屋で、何を言うにも語尾に「チー」をつけて喋るおじさんに出会ったのが始まりです。
                  あまりにも耳に残ったので、ゲームにしました。おじさん、ありがとうございまスチー。
                </p>
              </div>
            </section>
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
              {timerSec > 0 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                      timedOut ? "bg-red-500" : timeLeft <= 3 ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                    style={{ width: `${(Math.max(timeLeft, 0) / timerSec) * 100}%` }}
                  />
                </div>
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

            <button
              onClick={shareResult}
              className="w-full py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 active:scale-[0.98] transition"
            >
              🏆 結果をシェアする
            </button>

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

      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-100 shadow-lg">
          結果をコピーしました！貼り付けて送ってね
        </div>
      )}
    </main>
  );
}
