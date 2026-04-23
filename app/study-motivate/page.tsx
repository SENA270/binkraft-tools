"use client";

import { useState, useEffect, useCallback } from "react";

const MESSAGES = [
  "ここで諦めたら一生後悔するぞ",
  "手を抜くな。自分に嘘をつくな",
  "あと5日。たった5日で人生が変わる",
  "今サボった分は試験当日に返ってくる",
  "やらない理由を探すな。やる理由を思い出せ",
  "合格した自分を想像しろ。そいつは今、勉強してる",
  "疲れた？でも不合格の方がもっと疲れるぞ",
  "1問でも多く解け。1点が合否を分ける",
  "今日の頑張りは明日の自信になる",
  "諦めるのはいつでもできる。今じゃない",
  "基本情報は取って当たり前。取らないと恥ずかしいぞ",
  "周りはもう勉強してる。お前は？",
  "できない言い訳より、できる方法を考えろ",
  "残り5日で人は変われる",
  "今この瞬間が一番早いスタートだ",
  "午前免除じゃないなら午前も手を抜くな",
  "アルゴリズムから逃げるな",
  "過去問を解け。答えを覚えるんじゃない、考え方を覚えろ",
  "60点取ればいい。完璧じゃなくていい",
  "寝る前に10分でも復習しろ",
  "スマホを見る時間で1問解ける",
  "不合格通知を見たときの自分の顔を想像しろ",
  "努力は裏切らない。サボりも裏切らない",
  "集中しろ。今この瞬間に全力を出せ",
  "試験会場で後悔しないために、今やれ",
  "お前ならできる。でもやらなきゃできない",
  "つらくても机に向かえ。座るだけでいい。そこから始まる",
  "受かったら好きなだけ休め。今は走れ",
  "この5日間を全力で生きろ",
  "未来の自分に誇れる今日にしろ",
  "覚えられないなら書け。書いて書いて叩き込め",
  "眠い？顔洗って戻ってこい",
  "言い訳してる暇があったら1問解け",
  "合格率は関係ない。お前が受かるかどうかだ",
  "今やらなくていつやる？明日の自分を信じるな",
];

const EXAM_DATE = new Date("2026-04-28T09:00:00+09:00");

function getCountdown() {
  const now = new Date();
  const diff = EXAM_DATE.getTime() - now.getTime();
  if (diff <= 0) return "試験当日！";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `試験まであと ${days}日 ${hours}時間 ${minutes}分`;
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

export default function StudyMotivatePage() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [countdown, setCountdown] = useState("");

  const nextMessage = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => {
        let next: number;
        do {
          next = Math.floor(Math.random() * MESSAGES.length);
        } while (next === prev && MESSAGES.length > 1);
        return next;
      });
      setFade(true);
    }, 300);
  }, []);

  useEffect(() => {
    setCountdown(getCountdown());
    const timer = setInterval(() => setCountdown(getCountdown()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextMessage, 7000);
    return () => clearInterval(interval);
  }, [nextMessage]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center cursor-pointer select-none relative"
      style={{ background: "linear-gradient(135deg, #0f1f3d 0%, #1e3a5f 50%, #1a3050 100%)" }}
      onClick={nextMessage}
    >
      <FullscreenButton />

      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-blue-300/70 text-sm md:text-base tracking-wider">
        {countdown}
      </div>

      <div
        className={`px-8 md:px-16 text-center transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
      >
        <p className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-wide">
          {MESSAGES[index]}
        </p>
      </div>

      <div className="absolute bottom-8 text-blue-400/50 text-xs md:text-sm">
        タップで次のメッセージ
      </div>
    </div>
  );
}
