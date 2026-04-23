"use client";

import { useState, useEffect } from "react";

const EXAM_DATE = new Date("2026-04-28T09:00:00+09:00");
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function padZero(n: number) {
  return n.toString().padStart(2, "0");
}

function getTimeData() {
  const now = new Date();
  const h = padZero(now.getHours());
  const m = padZero(now.getMinutes());
  const s = padZero(now.getSeconds());

  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekday = WEEKDAYS[now.getDay()];
  const dateStr = `${month}月${day}日（${weekday}）`;

  const diff = EXAM_DATE.getTime() - now.getTime();
  let countdownStr: string;
  if (diff <= 0) {
    countdownStr = "試験当日！全力を出せ！";
  } else {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    countdownStr = `あと ${days}日 ${hours}時間 ${mins}分 ${secs}秒`;
  }

  return { time: `${h}:${m}:${s}`, date: dateStr, countdown: countdownStr };
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

export default function StudyClockPage() {
  const [data, setData] = useState({ time: "--:--:--", date: "", countdown: "" });

  useEffect(() => {
    setData(getTimeData());
    const timer = setInterval(() => setData(getTimeData()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f1d33 50%, #1e3a5f 100%)" }}
    >
      <FullscreenButton />

      <div className="text-center">
        {/* Date */}
        <div className="text-blue-300/60 text-xl md:text-2xl mb-4 tracking-wider">
          {data.date}
        </div>

        {/* Time */}
        <div className="font-mono text-7xl sm:text-8xl md:text-[10rem] lg:text-[12rem] font-bold text-white tracking-wider leading-none">
          {data.time}
        </div>

        {/* Countdown */}
        <div className="mt-8 md:mt-12">
          <div className="text-blue-400/50 text-sm md:text-base mb-1">基本情報技術者試験</div>
          <div className="text-blue-300 text-xl md:text-3xl font-bold tracking-wider">
            {data.countdown}
          </div>
        </div>
      </div>
    </div>
  );
}
