"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const EXAM_DATE = new Date("2026-04-28T09:00:00+09:00");
const LONG_BREAK_EVERY = 4; // 4ポモドーロごとに長休憩

const LS_KEY_TOTAL = "study-timer-total-seconds";
const LS_KEY_TODAY = "study-timer-today";
const LS_KEY_DATE = "study-timer-date";
const LS_KEY_POMO = "study-timer-pomo-count";
const LS_KEY_SETTINGS = "study-timer-settings";

type Settings = {
  focusMin: number;
  breakMin: number;
  longBreakMin: number;
  autoContinue: boolean;
  soundOn: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  breakMin: 5,
  longBreakMin: 20,
  autoContinue: false,
  soundOn: true,
};

const PRESETS: { label: string; focusMin: number; breakMin: number }[] = [
  { label: "25分 / 5分", focusMin: 25, breakMin: 5 },
  { label: "50分 / 10分", focusMin: 50, breakMin: 10 },
];

type Mode = "focus" | "break" | "longBreak";

function padZero(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${padZero(m)}:${padZero(s)}`;
}

function formatHM(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function getCountdown(): string | null {
  const now = new Date();
  const diff = EXAM_DATE.getTime() - now.getTime();
  // 期限を過ぎたら表示しない（「試験当日！」が永久に出続けるバグの修正）
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `試験まであと ${days}日 ${hours}時間 ${minutes}分`;
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.stop(ctx.currentTime + 0.8);
    // Second beep
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1000;
      osc2.type = "sine";
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    }, 300);
  } catch {
    // Audio not supported
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

/**
 * 時間の貯金瓶: 今日の学習時間が「しずく」となって瓶に貯まっていく。
 * 1時間で1本満タン → 満タンの瓶の数が横に並ぶ（どんどん貯まる感の演出）。
 */
function TimeJar({ todaySeconds, dripping, accent }: { todaySeconds: number; dripping: boolean; accent: string }) {
  const fullJars = Math.floor(todaySeconds / 3600);
  const fill = (todaySeconds % 3600) / 3600; // 現在の瓶の水位 0..1
  // 瓶の内側: y=34(口の下)〜y=126(底) の高さ92pxを水位で埋める
  const innerTop = 34;
  const innerBottom = 126;
  const waterH = (innerBottom - innerTop) * fill;
  const waterY = innerBottom - waterH;

  return (
    <div className="flex flex-col items-center mb-6 select-none">
      <div className="relative">
        {/* しずく（集中して動いている間だけ落ちる） */}
        {dripping && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-2 h-full pointer-events-none">
            <span className="jar-drop" style={{ background: accent, animationDelay: "0s" }} />
            <span className="jar-drop" style={{ background: accent, animationDelay: "0.9s" }} />
            <span className="jar-drop" style={{ background: accent, animationDelay: "1.7s" }} />
          </div>
        )}
        <svg width="104" height="130" viewBox="0 0 104 136">
          {/* 水（貯まった時間） */}
          <clipPath id="jarClip">
            <path d="M30 18 h44 v10 q22 8 22 30 v56 q0 16 -16 16 h-56 q-16 0 -16 -16 v-56 q0 -22 22 -30 z" />
          </clipPath>
          <g clipPath="url(#jarClip)">
            <rect x="0" y={waterY} width="104" height={136 - waterY} fill={accent} opacity="0.55">
              {dripping && (
                <animate attributeName="opacity" values="0.55;0.7;0.55" dur="2s" repeatCount="indefinite" />
              )}
            </rect>
            {/* 水面のハイライト */}
            {fill > 0.01 && (
              <rect x="0" y={waterY} width="104" height="3" fill="white" opacity="0.35" />
            )}
          </g>
          {/* 瓶の輪郭 */}
          <path
            d="M30 18 h44 v10 q22 8 22 30 v56 q0 16 -16 16 h-56 q-16 0 -16 -16 v-56 q0 -22 22 -30 z"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="3"
          />
          {/* 瓶の口 */}
          <rect x="26" y="8" width="52" height="10" rx="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
        </svg>
      </div>
      <div className="mt-2 text-white/70 text-sm font-bold">
        今日の貯金 {formatHM(todaySeconds)}
      </div>
      {/* 満タンになった瓶（1時間 = 1本） */}
      {fullJars > 0 && (
        <div className="mt-1 flex items-center gap-1">
          {Array.from({ length: Math.min(fullJars, 12) }).map((_, i) => (
            <svg key={i} width="14" height="18" viewBox="0 0 104 136">
              <path
                d="M30 18 h44 v10 q22 8 22 30 v56 q0 16 -16 16 h-56 q-16 0 -16 -16 v-56 q0 -22 22 -30 z"
                fill={accent}
                opacity="0.8"
              />
            </svg>
          ))}
          <span className="ml-1 text-white/50 text-xs">×1時間</span>
        </div>
      )}
      <style>{`
        .jar-drop {
          position: absolute;
          left: 0;
          top: 0;
          width: 7px;
          height: 10px;
          border-radius: 50% 50% 60% 60%;
          opacity: 0;
          animation: jarDropFall 2.6s ease-in infinite;
        }
        @keyframes jarDropFall {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 0.9; }
          60% { transform: translateY(52px); opacity: 0.9; }
          70% { transform: translateY(60px); opacity: 0; }
          100% { transform: translateY(60px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function StudyTimerPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<Mode>("focus");
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focusMin * 60);
  const [running, setRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // スマホでタブがバックグラウンドに回ると setInterval が止まって時間がズレるため、
  // 「いつ終わるか(endAt)」を基準に毎tick残り時間を再計算する（復帰時に自己修正される）
  const endAtRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const durationOf = useCallback(
    (m: Mode) =>
      (m === "focus" ? settings.focusMin : m === "break" ? settings.breakMin : settings.longBreakMin) * 60,
    [settings]
  );

  // Load from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem(LS_KEY_SETTINGS);
    let s = DEFAULT_SETTINGS;
    if (savedSettings) {
      try {
        s = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
        setSettings(s);
      } catch {
        // 破損時はデフォルト
      }
    }
    setTimeLeft(s.focusMin * 60);

    const saved = localStorage.getItem(LS_KEY_TOTAL);
    if (saved) setTotalSeconds(parseInt(saved, 10));

    const savedDate = localStorage.getItem(LS_KEY_DATE);
    const today = getTodayKey();
    if (savedDate === today) {
      const savedToday = localStorage.getItem(LS_KEY_TODAY);
      if (savedToday) setTodaySeconds(parseInt(savedToday, 10));
      const savedPomo = localStorage.getItem(LS_KEY_POMO);
      if (savedPomo) setPomodoroCount(parseInt(savedPomo, 10));
    } else {
      localStorage.setItem(LS_KEY_DATE, today);
      localStorage.setItem(LS_KEY_TODAY, "0");
      localStorage.setItem(LS_KEY_POMO, "0");
    }

    setCountdown(getCountdown());
    const ct = setInterval(() => setCountdown(getCountdown()), 60000);
    return () => clearInterval(ct);
  }, []);

  // Save to localStorage when values change
  useEffect(() => {
    localStorage.setItem(LS_KEY_TOTAL, totalSeconds.toString());
  }, [totalSeconds]);

  useEffect(() => {
    localStorage.setItem(LS_KEY_TODAY, todaySeconds.toString());
    localStorage.setItem(LS_KEY_DATE, getTodayKey());
  }, [todaySeconds]);

  useEffect(() => {
    localStorage.setItem(LS_KEY_POMO, pomodoroCount.toString());
  }, [pomodoroCount]);

  useEffect(() => {
    localStorage.setItem(LS_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // タイマー終了時の遷移
  const handleTimerEnd = useCallback(() => {
    if (settings.soundOn) playBeep();
    try {
      navigator.vibrate?.(200);
    } catch {
      // 未対応端末は無視
    }
    let nextMode: Mode;
    if (mode === "focus") {
      const nextCount = pomodoroCount + 1;
      setPomodoroCount(nextCount);
      nextMode = nextCount % LONG_BREAK_EVERY === 0 ? "longBreak" : "break";
    } else {
      nextMode = "focus";
    }
    setMode(nextMode);
    const nextDuration = durationOf(nextMode);
    setTimeLeft(nextDuration);
    if (settings.autoContinue) {
      endAtRef.current = Date.now() + nextDuration * 1000;
      lastTickRef.current = Date.now();
      // running は true のまま継続
    } else {
      setRunning(false);
      endAtRef.current = null;
    }
  }, [mode, pomodoroCount, settings.soundOn, settings.autoContinue, durationOf]);

  // Timer logic (endAt 基準・バックグラウンド復帰でも自己修正)
  useEffect(() => {
    if (running) {
      if (endAtRef.current === null) {
        endAtRef.current = Date.now() + timeLeft * 1000;
      }
      lastTickRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const endAt = endAtRef.current ?? now;
        const remaining = Math.max(0, Math.round((endAt - now) / 1000));

        // 集中モード中だけ、実経過時間ぶんを貯金に加算（バックグラウンド中の分も含む）
        if (mode === "focus") {
          const elapsed = Math.min(
            Math.round((now - lastTickRef.current) / 1000),
            // タイマー境界を跨いだ過剰加算を防ぐ
            Math.max(0, Math.round((endAt - lastTickRef.current) / 1000))
          );
          if (elapsed > 0) {
            setTotalSeconds((t) => t + elapsed);
            setTodaySeconds((t) => t + elapsed);
          }
        }
        lastTickRef.current = now;

        setTimeLeft(remaining);
        if (remaining <= 0) {
          handleTimerEnd();
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      endAtRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, handleTimerEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  // 画面スリープ防止（動作中のみ・対応ブラウザのみ）
  useEffect(() => {
    let cancelled = false;
    const acquire = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        if (running && nav.wakeLock && document.visibilityState === "visible") {
          const lock = await nav.wakeLock.request("screen");
          if (cancelled) {
            lock.release().catch(() => {});
          } else {
            wakeLockRef.current = lock;
          }
        }
      } catch {
        // 拒否・未対応は無視（タイマーは動く）
      }
    };
    const release = () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
    if (running) {
      acquire();
      // タブ復帰時に再取得（wake lock はバックグラウンドで自動解放されるため）
      const onVis = () => {
        if (document.visibilityState === "visible" && running) acquire();
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVis);
        release();
      };
    }
    release();
    return () => {
      cancelled = true;
    };
  }, [running]);

  // タブタイトルに残り時間（別タブ作業中でも進捗が見える）
  useEffect(() => {
    if (running) {
      const label = mode === "focus" ? "集中" : "休憩";
      document.title = `${formatTime(timeLeft)} ${label} | 勉強タイマー`;
    } else {
      document.title = "勉強タイマー | ビンクラフトツール";
    }
    return () => {
      document.title = "勉強タイマー | ビンクラフトツール";
    };
  }, [running, timeLeft, mode]);

  const toggleRunning = () => setRunning((r) => !r);

  const applyPreset = (p: { focusMin: number; breakMin: number }) => {
    setSettings((s) => ({ ...s, focusMin: p.focusMin, breakMin: p.breakMin }));
    // 停止中のみ即反映（動作中のタイマーは変えない）
    if (!running) {
      setMode("focus");
      setTimeLeft(p.focusMin * 60);
    }
  };

  const totalDuration = durationOf(mode);
  const progress = totalDuration > 0 ? 1 - timeLeft / totalDuration : 0;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  const handleReset = useCallback(() => {
    if (running || timeLeft < totalDuration) {
      setShowResetConfirm(true);
    } else {
      setRunning(false);
      setMode("focus");
      setTimeLeft(settings.focusMin * 60);
    }
  }, [running, timeLeft, totalDuration, settings.focusMin]);

  const confirmReset = () => {
    setShowResetConfirm(false);
    setRunning(false);
    setMode("focus");
    setTimeLeft(settings.focusMin * 60);
  };

  const isFocus = mode === "focus";
  const isLongBreak = mode === "longBreak";
  const accent = isFocus ? "#60a5fa" : "#4ade80";
  const bgColor = isFocus
    ? "linear-gradient(135deg, #0a1628 0%, #0f1d33 50%, #1e3a5f 100%)"
    : "linear-gradient(135deg, #0f3d2a 0%, #1a5f3e 50%, #1a5040 100%)";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative transition-all duration-700 py-10" style={{ background: bgColor }}>
      <FullscreenButton />

      {/* 設定ボタン */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="設定"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* 設定パネル */}
      {showSettings && (
        <div className="fixed top-16 left-4 z-50 bg-[#12233d] border border-white/15 rounded-2xl p-5 w-72 shadow-2xl">
          <div className="text-white/80 text-sm font-bold mb-3">タイマー設定</div>
          <div className="flex gap-2 mb-4">
            {PRESETS.map((p) => {
              const active = settings.focusMin === p.focusMin && settings.breakMin === p.breakMin;
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                    active ? "bg-blue-500 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <label className="flex items-center justify-between mb-3 text-white/80 text-sm">
            終わったら自動で次へ
            <input
              type="checkbox"
              checked={settings.autoContinue}
              onChange={(e) => setSettings((s) => ({ ...s, autoContinue: e.target.checked }))}
              className="w-5 h-5 accent-blue-500"
            />
          </label>
          <label className="flex items-center justify-between mb-3 text-white/80 text-sm">
            サウンド
            <input
              type="checkbox"
              checked={settings.soundOn}
              onChange={(e) => setSettings((s) => ({ ...s, soundOn: e.target.checked }))}
              className="w-5 h-5 accent-blue-500"
            />
          </label>
          <div className="text-white/40 text-xs leading-relaxed">
            {LONG_BREAK_EVERY}ポモドーロごとに長休憩（{settings.longBreakMin}分）が入ります。動作中のタイマーには次回から反映されます。
          </div>
        </div>
      )}

      {countdown && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
          <div className={`text-sm md:text-base tracking-wider ${isFocus ? "text-blue-300/70" : "text-green-300/70"}`}>
            {countdown}
          </div>
        </div>
      )}

      {/* Mode label */}
      <div className={`mb-4 text-lg md:text-xl font-bold tracking-widest ${isFocus ? "text-blue-300" : "text-green-300"}`}>
        {isFocus ? "集中モード" : isLongBreak ? "長休憩モード" : "休憩モード"}
      </div>

      {/* Circular timer */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="150"
            cy="150"
            r="140"
            fill="none"
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl md:text-6xl font-mono font-bold text-white tracking-wider">
            {formatTime(timeLeft)}
          </span>
          <span className="mt-2 text-white/40 text-xs tracking-widest">
            {pomodoroCount > 0 && `${pomodoroCount}ポモドーロ達成`}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={toggleRunning}
          className={`px-8 py-3 rounded-full text-lg font-bold transition-colors ${
            isFocus
              ? "bg-blue-500 hover:bg-blue-400 text-white"
              : "bg-green-500 hover:bg-green-400 text-white"
          }`}
        >
          {running ? "ポーズ" : "スタート"}
        </button>
        <button
          onClick={handleReset}
          className="px-8 py-3 rounded-full text-lg font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          リセット
        </button>
      </div>

      {/* 時間の貯金瓶（どんどん貯まるアニメーション） */}
      <TimeJar todaySeconds={todaySeconds} dripping={running && isFocus} accent={accent} />

      {/* Reset confirm dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1e3a5f] rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl border border-white/10">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white text-lg font-bold mb-2">ここまで積み上げたものが無駄になるけど本当にいいの？</p>
            <p className="text-white/60 text-sm mb-6">今のタイマーの進捗がリセットされます</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-6 py-3 rounded-full text-base font-bold bg-blue-500 hover:bg-blue-400 text-white transition-colors"
              >
                やっぱり続ける
              </button>
              <button
                onClick={confirmReset}
                className="px-6 py-3 rounded-full text-base font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                やめる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 md:gap-10 text-center">
        <div>
          <div className={`text-3xl md:text-4xl font-bold ${isFocus ? "text-blue-300" : "text-green-300"}`}>
            {pomodoroCount}
          </div>
          <div className="text-white/50 text-xs md:text-sm mt-1">今日のポモドーロ</div>
        </div>
        <div>
          <div className={`text-3xl md:text-4xl font-bold ${isFocus ? "text-blue-300" : "text-green-300"}`}>
            {formatHM(todaySeconds)}
          </div>
          <div className="text-white/50 text-xs md:text-sm mt-1">今日の学習</div>
        </div>
        <div>
          <div className={`text-3xl md:text-4xl font-bold ${isFocus ? "text-blue-300" : "text-green-300"}`}>
            {formatHM(totalSeconds)}
          </div>
          <div className="text-white/50 text-xs md:text-sm mt-1">累計学習</div>
        </div>
      </div>
    </div>
  );
}
