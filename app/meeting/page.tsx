"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const SALARY_PRESETS = [
  { label: "新入社員", amount: 220000 },
  { label: "若手", amount: 300000 },
  { label: "中堅", amount: 400000 },
  { label: "管理職", amount: 550000 },
  { label: "役員", amount: 800000 },
];

const TIME_PRESETS = [
  { label: "15分", seconds: 900 },
  { label: "30分", seconds: 1800 },
  { label: "1時間", seconds: 3600 },
];

function costToComparison(cost: number): string {
  if (cost < 500) return "";
  if (cost < 1000) return `コンビニ弁当${Math.floor(cost / 500)}個分`;
  if (cost < 3000) return `ランチ${Math.floor(cost / 1000)}回分`;
  if (cost < 10000) return `飲み会${Math.floor(cost / 4000)}回分`;
  if (cost < 50000) return `高級ディナー${Math.floor(cost / 10000)}回分`;
  return `月給${(cost / 400000).toFixed(1)}人分`;
}

export default function MeetingPage() {
  const [people, setPeople] = useState(5);
  const [avgSalary, setAvgSalary] = useState(400000);
  const [mode, setMode] = useState<"realtime" | "preset">("realtime");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hourlyRate = avgSalary / 160;
  const costPerSecond = (hourlyRate / 3600) * people;
  const totalCost = Math.round(costPerSecond * seconds);
  const costPerMinute = Math.round(costPerSecond * 60);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const startMeeting = () => {
    setSeconds(0);
    setRunning(true);
  };

  const setPresetTime = (secs: number) => {
    setRunning(false);
    setSeconds(secs);
  };

  const stopMeeting = () => setRunning(false);

  const resetMeeting = () => {
    setRunning(false);
    setSeconds(0);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const comparison = costToComparison(totalCost);

  const shareText =
    seconds > 0
      ? `この会議のコスト💸 ${formatTime(seconds)}・${people}人 → ¥${totalCost.toLocaleString()}${comparison ? `（${comparison}）` : ""}\n\n▶ あなたの会議もチェック`
      : "";

  return (
    <main className="flex-1 bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-zinc-400 hover:underline">
          ← ツール一覧
        </Link>

        <h1 className="mt-4 text-3xl font-black text-zinc-900">
          🏢 会議コスト計算機
        </h1>
        <p className="mt-2 text-zinc-500">
          この会議、いくらかかってる？
        </p>

        {/* 設定 */}
        <div className="mt-8 space-y-5 rounded-2xl bg-white border border-zinc-200 p-6">
          <div>
            <label className="block text-sm font-bold text-zinc-600 mb-2">
              参加人数: {people}人
            </label>
            <input
              type="range"
              min={2}
              max={30}
              value={people}
              onChange={(e) => setPeople(parseInt(e.target.value))}
              className="w-full accent-blue-500"
              disabled={running}
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>2人</span>
              <span>30人</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-600 mb-2">
              平均月給
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {SALARY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setAvgSalary(p.amount)}
                  disabled={running}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                    avgSalary === p.amount
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {p.label}（{(p.amount / 10000).toFixed(0)}万）
                </button>
              ))}
            </div>
            <input
              type="range"
              min={200000}
              max={1000000}
              step={10000}
              value={avgSalary}
              onChange={(e) => setAvgSalary(parseInt(e.target.value))}
              className="w-full accent-blue-500"
              disabled={running}
            />
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>20万円</span>
              <span>¥{avgSalary.toLocaleString()}</span>
              <span>100万円</span>
            </div>
          </div>

          <p className="text-sm text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
            💡 1分あたり <strong>¥{costPerMinute.toLocaleString()}</strong>
            （時給¥{Math.round(hourlyRate).toLocaleString()} × {people}人）
          </p>
        </div>

        {/* モード切替 */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => { setMode("realtime"); resetMeeting(); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              mode === "realtime"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            リアルタイム計測
          </button>
          <button
            onClick={() => { setMode("preset"); resetMeeting(); }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              mode === "preset"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            時間を入力して計算
          </button>
        </div>

        {/* プリセットタイマー */}
        {mode === "preset" && (
          <div className="mt-4 flex gap-2">
            {TIME_PRESETS.map((t) => (
              <button
                key={t.label}
                onClick={() => setPresetTime(t.seconds)}
                className={`flex-1 rounded-lg border py-3 text-sm font-bold transition ${
                  seconds === t.seconds
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* タイマー+コスト表示 */}
        <div
          className={`mt-6 rounded-2xl p-8 text-white shadow-lg text-center transition-colors duration-500 ${
            running
              ? "bg-gradient-to-br from-red-500 to-pink-600"
              : seconds > 0
                ? "bg-gradient-to-br from-blue-600 to-cyan-500"
                : "bg-gradient-to-br from-blue-500 to-cyan-500"
          }`}
        >
          <p className="text-sm font-medium opacity-80">経過時間</p>
          <p className="mt-1 text-4xl font-black font-mono tracking-wider">
            {formatTime(seconds)}
          </p>

          <p className="mt-6 text-sm font-medium opacity-80">
            この会議のコスト
          </p>
          <p className="mt-1 text-6xl font-black">
            ¥{totalCost.toLocaleString()}
          </p>

          {running && (
            <p className="mt-2 text-sm opacity-70">
              毎秒 ¥{Math.round(costPerSecond).toLocaleString()} 加算中...
            </p>
          )}

          {!running && seconds > 0 && comparison && (
            <p className="mt-3 text-sm font-medium bg-white/20 rounded-lg px-3 py-2">
              {comparison} 🍽️
            </p>
          )}

          {/* ボタン */}
          <div className="mt-6 flex gap-3 justify-center">
            {mode === "realtime" && !running && seconds === 0 && (
              <button
                onClick={startMeeting}
                className="rounded-xl bg-white px-8 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-100 transition"
              >
                会議スタート
              </button>
            )}
            {running && (
              <button
                onClick={stopMeeting}
                className="rounded-xl bg-white/20 border border-white/40 px-8 py-3 text-sm font-bold text-white hover:bg-white/30 transition"
              >
                会議終了
              </button>
            )}
            {!running && seconds > 0 && (
              <>
                {mode === "realtime" && (
                  <button
                    onClick={startMeeting}
                    className="rounded-xl bg-white/20 border border-white/40 px-6 py-3 text-sm font-bold text-white hover:bg-white/30 transition"
                  >
                    再スタート
                  </button>
                )}
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-100 transition"
                >
                  𝕏 でシェア
                </a>
              </>
            )}
          </div>
        </div>

        {!running && seconds > 0 && (
          <button
            onClick={resetMeeting}
            className="mt-4 w-full text-center text-sm text-zinc-400 hover:text-zinc-600"
          >
            リセット
          </button>
        )}

        {/* 他のツール */}
        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-bold text-zinc-600 mb-3">
            他のツールも試す
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/gaman"
              className="rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
            >
              💰 ガマンの値段
            </Link>
            <Link
              href="/oshikatsu"
              className="rounded-lg bg-purple-50 p-3 text-center text-sm font-medium text-purple-700 hover:bg-purple-100 transition"
            >
              💜 推し活費計算機
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
