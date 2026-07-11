"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// 1問インターバルタイマー: 解答30秒 → 答え合わせ30秒 を自動で回し続ける
// 基本情報技術者 A問題（四択・約90秒/問ペースの試験を30秒周回で鍛える）用

const DEFAULT_SOLVE = 30;
const DEFAULT_CHECK = 30;
const PRESETS = [15, 20, 30, 45, 60];

const LS_SOLVE = "study-interval-solve-sec";
const LS_CHECK = "study-interval-check-sec";
const LS_TODAY = "study-interval-today-count";
const LS_DATE = "study-interval-date";

function padZero(n: number) {
  return n.toString().padStart(2, "0");
}

function formatSec(seconds: number, total: number) {
  if (total < 60) return seconds.toString();
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${padZero(s)}`;
}

function formatHM(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m > 0) return `${m}分${s > 0 ? `${s}秒` : ""}`;
  return `${s}秒`;
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

/** freqs を 0.25秒間隔で順に鳴らす */
function playTones(freqs: number[]) {
  try {
    const ctx = new AudioContext();
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch {
    // Audio not supported
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // not supported
  }
}

function FullscreenButton() {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      aria-label={isFs ? "フルスクリーン解除" : "フルスクリーン"}
    >
      {isFs ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 14 8 14 8 18" />
          <polyline points="20 10 16 10 16 6" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      )}
    </button>
  );
}

export default function StudyIntervalPage() {
  const [phase, setPhase] = useState<"solve" | "check">("solve");
  const [solveSec, setSolveSec] = useState(DEFAULT_SOLVE);
  const [checkSec, setCheckSec] = useState(DEFAULT_CHECK);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SOLVE);
  const [running, setRunning] = useState(false);
  const [questionNum, setQuestionNum] = useState(1);
  const [sessionCount, setSessionCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // localStorage 読み込み
  useEffect(() => {
    const s = parseInt(localStorage.getItem(LS_SOLVE) || "", 10);
    const c = parseInt(localStorage.getItem(LS_CHECK) || "", 10);
    if (s > 0) {
      setSolveSec(s);
      setTimeLeft(s);
    }
    if (c > 0) setCheckSec(c);

    const today = getTodayKey();
    if (localStorage.getItem(LS_DATE) === today) {
      const t = parseInt(localStorage.getItem(LS_TODAY) || "0", 10);
      if (t > 0) setTodayCount(t);
    } else {
      localStorage.setItem(LS_DATE, today);
      localStorage.setItem(LS_TODAY, "0");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_SOLVE, solveSec.toString());
  }, [solveSec]);
  useEffect(() => {
    localStorage.setItem(LS_CHECK, checkSec.toString());
  }, [checkSec]);
  useEffect(() => {
    localStorage.setItem(LS_TODAY, todayCount.toString());
    localStorage.setItem(LS_DATE, getTodayKey());
  }, [todayCount]);

  /** フェーズを進める (自然終了・スキップ共通)。sound=false は手動スキップ用 */
  const advancePhase = useCallback(
    (sound: boolean) => {
      if (phase === "solve") {
        if (sound) {
          playTones([880]);
          vibrate(200);
        }
        setPhase("check");
        setTimeLeft(checkSec);
      } else {
        if (sound) {
          playTones([660, 880]);
          vibrate([150, 100, 150]);
        }
        setQuestionNum((n) => n + 1);
        setSessionCount((n) => n + 1);
        setTodayCount((n) => n + 1);
        setPhase("solve");
        setTimeLeft(solveSec);
      }
    },
    [phase, checkSec, solveSec]
  );

  // タイマー本体: 0 になったら鳴らして自動で次フェーズへ (止まらず回し続ける)
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSessionSeconds((t) => t + 1);
        setTimeLeft((prev) => {
          if (prev <= 1) {
            advancePhase(true);
            return prev; // advancePhase 側で次の timeLeft をセット済み
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, advancePhase]);

  // 画面スリープ防止 (対応ブラウザのみ)
  useEffect(() => {
    if (!running) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    const acquire = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock?.request("screen");
      } catch {
        // 未対応・拒否時は諦める
      }
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [running]);

  // キーボード: Space=開始/停止, →/Enter=スキップ
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setRunning((r) => !r);
      } else if (e.code === "ArrowRight" || e.code === "Enter") {
        e.preventDefault();
        advancePhase(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advancePhase]);

  const handleReset = () => {
    setRunning(false);
    setPhase("solve");
    setTimeLeft(solveSec);
    setQuestionNum(1);
    setSessionCount(0);
    setSessionSeconds(0);
  };

  const changeSolve = (v: number) => {
    const sec = Math.min(600, Math.max(5, v));
    setSolveSec(sec);
    if (!running && phase === "solve") setTimeLeft(sec);
  };
  const changeCheck = (v: number) => {
    const sec = Math.min(600, Math.max(5, v));
    setCheckSec(sec);
    if (!running && phase === "check") setTimeLeft(sec);
  };

  const isSolve = phase === "solve";
  const duration = isSolve ? solveSec : checkSec;
  const progress = 1 - timeLeft / duration;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  const bgColor = isSolve
    ? "linear-gradient(135deg, #0a1628 0%, #0f1d33 50%, #1e3a5f 100%)"
    : "linear-gradient(135deg, #2d1c07 0%, #46300e 50%, #6b4a1a 100%)";
  const accentText = isSolve ? "text-blue-300" : "text-amber-300";
  const accentStroke = isSolve ? "#60a5fa" : "#fbbf24";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative transition-all duration-700 py-10"
      style={{ background: bgColor }}
    >
      <FullscreenButton />

      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center text-sm tracking-wider text-white/40 whitespace-nowrap">
        1問インターバル — 解く {solveSec}秒 / 答え合わせ {checkSec}秒
      </div>

      {/* フェーズ表示 */}
      <div className={`mb-4 text-xl md:text-2xl font-bold tracking-widest ${accentText}`}>
        問{questionNum}　{isSolve ? "解答中" : "答え合わせ"}
      </div>

      {/* 円形タイマー */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="150"
            cy="150"
            r="140"
            fill="none"
            stroke={accentStroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-7xl md:text-8xl font-mono font-bold text-white tracking-wider">
            {formatSec(timeLeft, duration)}
          </span>
          <span className="mt-2 text-white/40 text-sm">
            次: {isSolve ? `答え合わせ ${checkSec}秒` : `問${questionNum + 1} 解答 ${solveSec}秒`}
          </span>
        </div>
      </div>

      {/* コントロール */}
      <div className="flex gap-3 mb-6 flex-wrap justify-center">
        <button
          onClick={() => setRunning((r) => !r)}
          className={`px-8 py-3 rounded-full text-lg font-bold transition-colors text-white ${
            isSolve ? "bg-blue-500 hover:bg-blue-400" : "bg-amber-500 hover:bg-amber-400"
          }`}
        >
          {running ? "ポーズ" : "スタート"}
        </button>
        <button
          onClick={() => advancePhase(false)}
          className="px-8 py-3 rounded-full text-lg font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          {isSolve ? "解けた → 答え合わせ" : "次の問題へ"}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-full text-lg font-bold bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
        >
          リセット
        </button>
      </div>

      {/* 秒数設定 */}
      <button
        onClick={() => setShowSettings((s) => !s)}
        className="mb-4 text-white/40 hover:text-white/70 text-sm underline underline-offset-4 transition-colors"
      >
        {showSettings ? "設定を閉じる" : "秒数を変える"}
      </button>
      {showSettings && (
        <div className="mb-6 flex flex-col gap-4 items-center bg-white/5 rounded-2xl px-6 py-5">
          {(
            [
              { label: "解答", value: solveSec, change: changeSolve },
              { label: "答え合わせ", value: checkSec, change: changeCheck },
            ] as const
          ).map(({ label, value, change }) => (
            <div key={label} className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-white/60 text-sm w-20 text-right">{label}</span>
              <button
                onClick={() => change(value - 5)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold"
              >
                −
              </button>
              <span className="text-white font-mono font-bold text-lg w-14 text-center">{value}秒</span>
              <button
                onClick={() => change(value + 5)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold"
              >
                ＋
              </button>
              <div className="flex gap-1">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => change(p)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                      value === p ? "bg-white/30 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 実績 */}
      <div className="grid grid-cols-3 gap-6 md:gap-10 text-center">
        <div>
          <div className={`text-3xl md:text-4xl font-bold ${accentText}`}>{sessionCount}</div>
          <div className="text-white/50 text-xs md:text-sm mt-1">このセッション</div>
        </div>
        <div>
          <div className={`text-3xl md:text-4xl font-bold ${accentText}`}>{todayCount}</div>
          <div className="text-white/50 text-xs md:text-sm mt-1">今日の問題数</div>
        </div>
        <div>
          <div className={`text-3xl md:text-4xl font-bold ${accentText}`}>{formatHM(sessionSeconds)}</div>
          <div className="text-white/50 text-xs md:text-sm mt-1">経過時間</div>
        </div>
      </div>

      <div className="mt-8 text-white/25 text-xs hidden md:block">
        スペース: スタート/ポーズ　　→ または Enter: スキップ
      </div>
    </div>
  );
}
