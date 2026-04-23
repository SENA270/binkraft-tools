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

      {/* Closing-in walls */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-linear"
        style={{
          boxShadow: `inset 0 0 ${Math.round(progress * 2)}px ${Math.round(progress * 1.5)}px ${
            finished ? "rgba(34,197,94,0.4)" : progress > 80 ? "rgba(239,68,68,0.6)" : progress > 50 ? "rgba(251,191,36,0.4)" : "rgba(59,130,246,0.3)"
          }`,
        }}
      />
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 transition-all duration-1000"
        style={{
          height: `${Math.min(progress * 0.35, 30)}%`,
          background: `linear-gradient(to bottom, ${
            progress > 80 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.2)"
          }, transparent)`,
        }}
      />
      {/* Bottom bar */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-1000"
        style={{
          height: `${Math.min(progress * 0.35, 30)}%`,
          background: `linear-gradient(to top, ${
            progress > 80 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.2)"
          }, transparent)`,
        }}
      />
      {/* Left bar */}
      <div
        className="absolute top-0 bottom-0 left-0 transition-all duration-1000"
        style={{
          width: `${Math.min(progress * 0.25, 20)}%`,
          background: `linear-gradient(to right, ${
            progress > 80 ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.15)"
          }, transparent)`,
        }}
      />
      {/* Right bar */}
      <div
        className="absolute top-0 bottom-0 right-0 transition-all duration-1000"
        style={{
          width: `${Math.min(progress * 0.25, 20)}%`,
          background: `linear-gradient(to left, ${
            progress > 80 ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.15)"
          }, transparent)`,
        }}
      />

      {/* Main countdown - center */}
      <div className="flex flex-col items-center justify-center z-10">
        {finished ? (
          <div className="text-center px-4">
            <div className="text-green-400 text-3xl sm:text-4xl md:text-5xl font-bold">
              今日の制限時間は終了！
            </div>
            <div className="text-green-300/70 text-xl sm:text-2xl mt-3">
              おつかれさま！
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-blue-300/60 text-lg sm:text-xl mb-2">
              {targetTime}まであと
            </div>
            <div
              className="font-mono font-bold text-white tracking-wider"
              style={{
                fontSize: "clamp(3.5rem, 12vw, 7rem)",
                lineHeight: 1.1,
                color: progress > 80 ? "#fca5a5" : "#ffffff",
                textShadow: progress > 80 ? "0 0 30px rgba(239,68,68,0.5)" : "none",
                transition: "color 2s, text-shadow 2s",
              }}
            >
              {text}
            </div>
            {progress > 80 && (
              <div className="text-red-400/80 text-lg sm:text-xl font-bold mt-4 animate-pulse">
                急げ！！時間がない！！
              </div>
            )}
          </div>
        )}
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
