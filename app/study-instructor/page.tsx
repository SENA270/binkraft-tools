"use client";

import { useState, useEffect, useCallback } from "react";

const LINES = [
  "やめてもいいけど？てめえの人生だよ？？わかってんだろうな？？？",
  "泣きたいのか？試験に落ちてから泣け",
  "お前が休んでる間にライバルは過去問3周してるぞ",
  "言い訳は聞いてない。手を動かせ",
  "甘えんな。基本情報ごときで弱音吐くのか",
  "俺は優しくしない。お前のためだ",
  "スマホいじってる暇があったら2進数でも暗算しとけ",
  "『あとでやる』は永遠にやらないと同義だ",
  "お前の敵はアルゴリズムじゃない。怠惰だ",
  "不合格の通知、親に見せられるのか？",
  "60点で受かる試験だぞ？落ちたら言い訳できねえぞ",
  "今この瞬間にページを閉じるな。10分だけやれ",
  "『難しい』んじゃない。『やってない』だけだ",
  "参考書を開け。開いたら勝ちだ",
  "5日あれば100問は解ける。やるかやらないかだ",
  "トイレでもIPアドレスのサブネット計算しろ",
  "俺を閉じるな。閉じた瞬間、お前の負けだ",
  "合格したやつは全員、お前より辛い時期を乗り越えてる",
  "お前がダラダラしてる1時間で合格ラインに1点近づける",
  "基本情報は入口だ。ここで止まるな",
  "眠い？顔洗って来い。5秒やる。……戻ったな？続けろ",
  "過去問は裏切らない。お前が裏切るんだ",
  "『分からない』のは恥じゃない。『調べない』のが恥だ",
  "ネットワークの問題が苦手？苦手なとこが一番伸びるんだよ",
  "今ここで踏ん張れるやつが、現場でも踏ん張れる",
  "やる気は待っても来ない。やり始めれば勝手に出る",
  "午前で落ちるやつは準備不足。それだけだ",
  "諦めるのは試験が終わってからにしろ",
  "俺はお前を信じてる。だから厳しくする",
  "残り5日。全力出したか胸に聞いてみろ",
];

const EXAM_DATE = new Date("2026-04-28T09:00:00+09:00");

function getCountdown() {
  const now = new Date();
  const diff = EXAM_DATE.getTime() - now.getTime();
  if (diff <= 0) return "試験当日！言い訳は許さん！";
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

export default function StudyInstructorPage() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [countdown, setCountdown] = useState("");
  const [shake, setShake] = useState(false);

  const nextLine = useCallback(() => {
    setFade(false);
    setTimeout(() => {
      setIndex((prev) => {
        let next: number;
        do {
          next = Math.floor(Math.random() * LINES.length);
        } while (next === prev && LINES.length > 1);
        return next;
      });
      setFade(true);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }, 300);
  }, []);

  useEffect(() => {
    setCountdown(getCountdown());
    const timer = setInterval(() => setCountdown(getCountdown()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextLine, 6000);
    return () => clearInterval(interval);
  }, [nextLine]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center cursor-pointer select-none relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f1d33 50%, #1e3a5f 100%)" }}
      onClick={nextLine}
    >
      <FullscreenButton />

      {/* Countdown */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-red-300/70 text-sm md:text-base tracking-wider">
        {countdown}
      </div>

      {/* Character */}
      <div className={`text-center mb-6 transition-transform duration-300 ${shake ? "scale-110" : "scale-100"}`}>
        <div className="text-6xl md:text-8xl mb-2">👹</div>
        <div className="text-red-400 text-lg md:text-xl font-black tracking-widest">
          鬼教官 基本情報
        </div>
      </div>

      {/* Line */}
      <div
        className={`px-8 md:px-16 text-center transition-opacity duration-300 max-w-3xl ${fade ? "opacity-100" : "opacity-0"}`}
      >
        <p className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-wide">
          {LINES[index]}
        </p>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-8 text-red-400/50 text-xs md:text-sm">
        タップで次の檄
      </div>

      {/* Style for shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
