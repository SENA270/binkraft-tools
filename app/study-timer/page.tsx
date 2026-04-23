"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;
const EXAM_DATE = new Date("2026-04-28T09:00:00+09:00");

const LS_KEY_TOTAL = "study-timer-total-seconds";
const LS_KEY_TODAY = "study-timer-today";
const LS_KEY_DATE = "study-timer-date";

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

function getCountdown() {
  const now = new Date();
  const diff = EXAM_DATE.getTime() - now.getTime();
  if (diff <= 0) return "試験当日！";
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

export default function StudyTimerPage() {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [countdown, setCountdown] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY_TOTAL);
    if (saved) setTotalSeconds(parseInt(saved, 10));

    const savedDate = localStorage.getItem(LS_KEY_DATE);
    const today = getTodayKey();
    if (savedDate === today) {
      const savedToday = localStorage.getItem(LS_KEY_TODAY);
      if (savedToday) setTodaySeconds(parseInt(savedToday, 10));
    } else {
      localStorage.setItem(LS_KEY_DATE, today);
      localStorage.setItem(LS_KEY_TODAY, "0");
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

  // Timer logic
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer ended
            playBeep();
            if (mode === "focus") {
              setPomodoroCount((c) => c + 1);
              setMode("break");
              setRunning(false);
              return BREAK_MINUTES * 60;
            } else {
              setMode("focus");
              setRunning(false);
              return FOCUS_MINUTES * 60;
            }
          }
          return prev - 1;
        });
        if (mode === "focus") {
          setTotalSeconds((t) => t + 1);
          setTodaySeconds((t) => t + 1);
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  const toggleRunning = () => setRunning((r) => !r);

  const reset = () => {
    setRunning(false);
    setMode("focus");
    setTimeLeft(FOCUS_MINUTES * 60);
  };

  const totalDuration = mode === "focus" ? FOCUS_MINUTES * 60 : BREAK_MINUTES * 60;
  const progress = 1 - timeLeft / totalDuration;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference * (1 - progress);

  const isFocus = mode === "focus";
  const bgColor = isFocus
    ? "linear-gradient(135deg, #0f1f3d 0%, #1e3a5f 50%, #1a3050 100%)"
    : "linear-gradient(135deg, #0f3d2a 0%, #1a5f3e 50%, #1a5040 100%)";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative transition-all duration-700" style={{ background: bgColor }}>
      <FullscreenButton />

      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
        <div className={`text-sm md:text-base tracking-wider ${isFocus ? "text-blue-300/70" : "text-green-300/70"}`}>
          {countdown}
        </div>
      </div>

      {/* Mode label */}
      <div className={`mb-4 text-lg md:text-xl font-bold tracking-widest ${isFocus ? "text-blue-300" : "text-green-300"}`}>
        {isFocus ? "集中モード" : "休憩モード"}
      </div>

      {/* Circular timer */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="150"
            cy="150"
            r="140"
            fill="none"
            stroke={isFocus ? "#60a5fa" : "#4ade80"}
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
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-8">
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
          onClick={reset}
          className="px-8 py-3 rounded-full text-lg font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          リセット
        </button>
      </div>

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
