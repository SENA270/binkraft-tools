"use client";

import { useState, useEffect, useCallback } from "react";

const EXAM_DATE = new Date("2026-04-28T09:00:00+09:00");

function padZero(n: number) {
  return n.toString().padStart(2, "0");
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

function getExamCountdown() {
  const now = new Date();
  const diff = EXAM_DATE.getTime() - now.getTime();
  if (diff <= 0) return "試験当日！全力を出せ！";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `あと ${days}日 ${hours}時間 ${mins}分 ${secs}秒`;
}

export default function StudyCountdownPage() {
  const [targetTime, setTargetTime] = useState("17:30");
  const [now, setNow] = useState<Date | null>(null);
  const [examCountdown, setExamCountdown] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("study-countdown-target");
    if (saved) setTargetTime(saved);
  }, []);

  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      setExamCountdown(getExamCountdown());
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTargetChange = useCallback((value: string) => {
    setTargetTime(value);
    localStorage.setItem("study-countdown-target", value);
  }, []);

  const getTargetDate = useCallback(() => {
    if (!now) return null;
    const [h, m] = targetTime.split(":").map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    return target;
  }, [now, targetTime]);

  const getCountdownData = useCallback(() => {
    if (!now) return { text: "--:--:--", finished: false, progress: 0 };
    const target = getTargetDate();
    if (!target) return { text: "--:--:--", finished: false, progress: 0 };

    const diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      return { text: "", finished: true, progress: 100 };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    // Progress: from start of day (0:00) to target time
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const totalDuration = target.getTime() - startOfDay.getTime();
    const elapsed = now.getTime() - startOfDay.getTime();
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    return {
      text: `${padZero(hours)}:${padZero(mins)}:${padZero(secs)}`,
      finished: false,
      progress,
    };
  }, [now, getTargetDate]);

  const { text, finished, progress } = getCountdownData();

  // SVG circle progress
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative px-4"
      style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f1d33 50%, #1e3a5f 100%)" }}
    >
      <FullscreenButton />

      {/* Target time input */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <label className="text-blue-300/60 text-sm">目標時刻:</label>
        <input
          type="time"
          value={targetTime}
          onChange={(e) => handleTargetChange(e.target.value)}
          className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Main countdown */}
      <div className="flex flex-col items-center justify-center">
        {/* Circular progress */}
        <div className="relative flex items-center justify-center">
          <svg
            width="320"
            height="320"
            viewBox="0 0 320 320"
            className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[400px] md:h-[400px]"
          >
            {/* Background circle */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="160"
              cy="160"
              r={radius}
              fill="none"
              stroke={finished ? "#22c55e" : "#3b82f6"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 160 160)"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {finished ? (
              <div className="text-center px-4">
                <div className="text-green-400 text-xl sm:text-2xl md:text-3xl font-bold">
                  今日の制限時間は終了！
                </div>
                <div className="text-green-300/70 text-lg sm:text-xl mt-2">
                  おつかれさま！
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-blue-300/60 text-sm sm:text-base mb-1">
                  {targetTime}まであと
                </div>
                <div className="font-mono text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-wider">
                  {text}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exam countdown */}
      <div className="absolute bottom-8 text-center">
        <div className="text-blue-400/50 text-xs sm:text-sm mb-1">基本情報技術者試験（4/28）</div>
        <div className="text-blue-300/70 text-sm sm:text-base font-bold tracking-wider">
          {examCountdown}
        </div>
      </div>
    </div>
  );
}
