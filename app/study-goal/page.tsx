"use client";

import { useState, useEffect } from "react";

const EXAM_DATE = new Date("2026-04-28T09:00:00+09:00");

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
  return `試験まであと ${days}日 ${hours}時間 ${mins}分`;
}

const DEFAULT_GOAL = "予想問題2までやり切る！！！";
const CHEER_MESSAGE = "諦めるな。戦え。";

export default function StudyGoalPage() {
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [editing, setEditing] = useState(false);
  const [examCountdown, setExamCountdown] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("study-goal-text");
    if (saved) setGoal(saved);
  }, []);

  useEffect(() => {
    const tick = () => setExamCountdown(getExamCountdown());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSave = (value: string) => {
    const trimmed = value.trim() || DEFAULT_GOAL;
    setGoal(trimmed);
    localStorage.setItem("study-goal-text", trimmed);
    setEditing(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative px-4 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f1d33 50%, #1e3a5f 100%)" }}
    >
      <FullscreenButton />

      {/* Pulsing glow effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)",
            animation: "pulse-glow 3s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }
      `}</style>

      {/* Exam countdown - top */}
      <div className="absolute top-6 text-center">
        <div className="text-blue-400/50 text-xs sm:text-sm mb-1">基本情報技術者試験（4/28）</div>
        <div className="text-blue-300/70 text-sm sm:text-base font-bold tracking-wider">
          {examCountdown}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-3xl w-full">
        {editing ? (
          <div className="px-4">
            <textarea
              autoFocus
              defaultValue={goal}
              onBlur={(e) => handleSave(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave((e.target as HTMLTextAreaElement).value);
                }
              }}
              className="w-full bg-white/10 text-white text-4xl sm:text-5xl font-bold text-center border border-white/20 rounded-2xl p-6 focus:outline-none focus:border-blue-400 resize-none"
              rows={3}
            />
            <div className="text-blue-300/40 text-sm mt-2">
              Enterで保存 / 外をタップで保存
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="cursor-pointer px-4 py-8 rounded-2xl hover:bg-white/5 transition-colors"
          >
            <div className="text-4xl sm:text-5xl font-bold text-white leading-relaxed break-words">
              {goal}
            </div>
            <div className="text-blue-300/30 text-xs mt-4">
              タップして編集
            </div>
          </div>
        )}

        {/* Cheer message */}
        <div className="mt-8 text-xl text-blue-200/50 font-medium tracking-wider">
          {CHEER_MESSAGE}
        </div>
      </div>
    </div>
  );
}
