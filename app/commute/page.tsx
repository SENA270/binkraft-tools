"use client";

import { useState } from "react";
import Link from "next/link";

const ACTIVITIES = [
  { hours: 1, label: "映画1本観れる" },
  { hours: 5, label: "本1冊読める" },
  { hours: 50, label: "資格の勉強ができる" },
  { hours: 500, label: "プログラミングが習得できる" },
  { hours: 1000, label: "楽器が弾けるようになる" },
  { hours: 2000, label: "新しい言語がマスターできる" },
  { hours: 5000, label: "プロレベルの専門スキルが身につく" },
  { hours: 10000, label: "その道の達人になれる" },
];

export default function CommutePage() {
  const [oneWayMinutes, setOneWayMinutes] = useState(60);
  const [workingYears, setWorkingYears] = useState(38);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [holidaysPerYear, setHolidaysPerYear] = useState(20);
  const [calculated, setCalculated] = useState(false);

  const workDaysPerYear = daysPerWeek * 52 - holidaysPerYear;
  const dailyMinutes = oneWayMinutes * 2;
  const yearlyHours = (dailyMinutes * workDaysPerYear) / 60;
  const lifetimeHours = yearlyHours * workingYears;
  const lifetimeDays = lifetimeHours / 24;
  const lifetimeYears = lifetimeDays / 365;
  const lifetimePercent = (lifetimeYears / workingYears) * 100;

  const yearlyCost = yearlyHours * 2000; // 時給2000円換算
  const lifetimeCost = yearlyCost * workingYears;

  const bestActivity = ACTIVITIES.filter((a) => a.hours <= lifetimeHours).pop();

  const shareText = calculated
    ? `通勤時間の生涯換算🚃\n\n片道${oneWayMinutes}分 × ${workingYears}年\n= 約${Math.round(lifetimeHours).toLocaleString()}時間（${lifetimeYears.toFixed(1)}年分）\n\n人生の${lifetimePercent.toFixed(1)}%が通勤に消えてる…\n\n▶ あなたも計算してみて\nhttps://binkraft-tools.vercel.app/commute`
    : "";

  return (
    <main className="flex-1 bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-zinc-400 hover:underline">
          ← ツール一覧
        </Link>

        <h1 className="mt-4 text-3xl font-black text-zinc-900">
          🚃 通勤時間の生涯換算
        </h1>
        <p className="mt-2 text-zinc-500">
          あなたの人生、通勤に何年使ってる？
        </p>

        {/* 入力フォーム */}
        <div className="mt-8 space-y-5">
          {/* 片道通勤時間 */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <label className="text-sm font-bold text-zinc-700">
              片道の通勤時間
            </label>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={oneWayMinutes}
                onChange={(e) => setOneWayMinutes(Number(e.target.value))}
                className="flex-1 accent-sky-500"
              />
              <span className="w-20 text-right text-2xl font-black text-sky-600">
                {oneWayMinutes}
                <span className="text-sm font-medium text-zinc-400">分</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              往復 {dailyMinutes}分 / 日
            </p>
          </div>

          {/* 勤務年数 */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <label className="text-sm font-bold text-zinc-700">
              あと何年働く？
            </label>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                value={workingYears}
                onChange={(e) => setWorkingYears(Number(e.target.value))}
                className="flex-1 accent-sky-500"
              />
              <span className="w-20 text-right text-2xl font-black text-sky-600">
                {workingYears}
                <span className="text-sm font-medium text-zinc-400">年</span>
              </span>
            </div>
          </div>

          {/* 詳細設定 */}
          <details className="rounded-xl border border-zinc-200 bg-white">
            <summary className="cursor-pointer p-4 text-sm font-medium text-zinc-500">
              詳細設定（週の出勤日数・有給）
            </summary>
            <div className="border-t border-zinc-100 p-5 space-y-4">
              <div>
                <label className="text-sm text-zinc-600">週の出勤日数</label>
                <div className="mt-2 flex gap-2">
                  {[3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDaysPerWeek(d)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                        daysPerWeek === d
                          ? "bg-sky-500 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {d}日
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-600">
                  年間の有給・祝日（日）
                </label>
                <input
                  type="number"
                  value={holidaysPerYear}
                  onChange={(e) =>
                    setHolidaysPerYear(Number(e.target.value) || 0)
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </details>

          <button
            onClick={() => setCalculated(true)}
            className="w-full rounded-xl bg-sky-500 py-4 text-lg font-bold text-white shadow-lg hover:bg-sky-600 transition"
          >
            計算する
          </button>
        </div>

        {/* 結果 */}
        {calculated && (
          <div className="mt-8 space-y-4">
            {/* メイン結果 */}
            <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-6 text-white shadow-lg">
              <p className="text-sm font-medium opacity-80">
                あなたの生涯通勤時間
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-5xl font-black">
                  {Math.round(lifetimeHours).toLocaleString()}
                </span>
                <span className="text-lg opacity-80">時間</span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/20 p-3 text-center">
                  <p className="text-2xl font-black">
                    {lifetimeYears.toFixed(1)}
                  </p>
                  <p className="text-xs opacity-80">年分</p>
                </div>
                <div className="rounded-xl bg-white/20 p-3 text-center">
                  <p className="text-2xl font-black">
                    {Math.round(lifetimeDays).toLocaleString()}
                  </p>
                  <p className="text-xs opacity-80">日分</p>
                </div>
                <div className="rounded-xl bg-white/20 p-3 text-center">
                  <p className="text-2xl font-black">
                    {lifetimePercent.toFixed(1)}%
                  </p>
                  <p className="text-xs opacity-80">人生の割合</p>
                </div>
              </div>

              {/* 年間コスト */}
              <div className="mt-4 rounded-xl bg-white/15 p-3">
                <p className="text-sm opacity-80">
                  時給2,000円換算だと…
                </p>
                <p className="text-xl font-black">
                  ¥{Math.round(lifetimeCost).toLocaleString()}
                </p>
                <p className="text-xs opacity-70">
                  （年間 ¥{Math.round(yearlyCost).toLocaleString()}）
                </p>
              </div>

              {/* できたこと */}
              {bestActivity && (
                <div className="mt-4 rounded-xl bg-white/20 p-3">
                  <p className="text-sm opacity-80">
                    この時間があれば…
                  </p>
                  <p className="text-lg font-bold">
                    ✨ {bestActivity.label}
                  </p>
                </div>
              )}

              {/* シェア */}
              <a
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-100 transition"
              >
                𝕏 でシェアする
              </a>
            </div>

            {/* 提案セクション（アフィリエイト導線） */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-bold text-zinc-900">
                通勤時間を減らす方法
              </h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-sky-50 p-4">
                  <p className="font-bold text-sky-800">
                    🏠 リモートワークできる仕事を探す
                  </p>
                  <p className="mt-1 text-sm text-sky-600">
                    在宅勤務なら通勤時間ゼロ。{lifetimeYears.toFixed(1)}
                    年分の時間が自由に。
                  </p>
                  {/* PR: アフィリエイトリンク設置予定 */}
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="font-bold text-emerald-800">
                    🚶 職場の近くに引っ越す
                  </p>
                  <p className="mt-1 text-sm text-emerald-600">
                    通勤{oneWayMinutes}分 → 15分に短縮するだけで年間
                    {Math.round(
                      ((oneWayMinutes - 15) * 2 * workDaysPerYear) / 60
                    ).toLocaleString()}
                    時間の節約。
                  </p>
                  {/* PR: アフィリエイトリンク設置予定 */}
                </div>
                <div className="rounded-xl bg-purple-50 p-4">
                  <p className="font-bold text-purple-800">
                    📚 通勤時間を学習に使う
                  </p>
                  <p className="mt-1 text-sm text-purple-600">
                    年間{Math.round(yearlyHours).toLocaleString()}
                    時間あれば、新しいスキルが身につく。
                  </p>
                  {/* PR: アフィリエイトリンク設置予定 */}
                </div>
              </div>
            </div>

            {/* 他のツール */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
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
                <Link
                  href="/meeting"
                  className="rounded-lg bg-blue-50 p-3 text-center text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
                >
                  🏢 会議コスト計算機
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
