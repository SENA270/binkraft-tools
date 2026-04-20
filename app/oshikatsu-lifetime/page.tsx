"use client";

import { useState } from "react";
import Link from "next/link";

const AGE_OPTIONS = Array.from({ length: 43 }, (_, i) => i + 13); // 13〜55歳
const OSHI_END_AGE = 70; // 推し活の想定終了年齢

const COMPARISONS = [
  { label: "軽自動車", value: 1500000 },
  { label: "新築マンションの頭金", value: 5000000 },
  { label: "世界一周旅行", value: 3000000 },
  { label: "高級腕時計（ロレックス）", value: 1500000 },
  { label: "結婚式", value: 3500000 },
  { label: "大学4年間の学費（私立文系）", value: 4000000 },
  { label: "新車（普通車）", value: 3000000 },
];

function getComparison(total: number) {
  const matches = COMPARISONS.filter((c) => total >= c.value);
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) => (Math.abs(total - a.value) < Math.abs(total - b.value) ? a : b));
  const count = Math.floor(total / best.value);
  return { ...best, count };
}

const LEVEL_MESSAGES = [
  { min: 0, max: 500000, level: "ライト推し", desc: "まだまだこれから！推し活は始まったばかり" },
  { min: 500000, max: 2000000, level: "ホビー推し", desc: "趣味として楽しんでいる健全な推し活" },
  { min: 2000000, max: 5000000, level: "ガチ推し", desc: "推しへの愛が形になっている" },
  { min: 5000000, max: 10000000, level: "沼推し", desc: "推し活が人生の大きな柱になっている" },
  { min: 10000000, max: 30000000, level: "覇者推し", desc: "推しと共に歩む人生。その覚悟は本物" },
  { min: 30000000, max: Infinity, level: "伝説推し", desc: "推し活の歴史に名を刻むレベル" },
];

export default function OshikatsuLifetimePage() {
  const [age, setAge] = useState(25);
  const [monthlySpend, setMonthlySpend] = useState(15000);
  const [calculated, setCalculated] = useState(false);

  const yearsLeft = Math.max(OSHI_END_AGE - age, 1);
  const lifetimeTotal = monthlySpend * 12 * yearsLeft;
  const comparison = getComparison(lifetimeTotal);
  const level = LEVEL_MESSAGES.find((l) => lifetimeTotal >= l.min && lifetimeTotal < l.max);

  const shareText = calculated
    ? `推し活を${age}歳から${OSHI_END_AGE}歳まで続けたら、生涯で${lifetimeTotal.toLocaleString()}円使うことが判明...\n\n${level ? `推しレベル: ${level.level}` : ""}\n\n▶ あなたも計算してみて\nhttps://binkraft-tools.vercel.app/oshikatsu-lifetime`
    : "";

  return (
    <main className="flex-1 bg-gradient-to-b from-purple-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-zinc-400 hover:underline">
          ← ツール一覧
        </Link>

        <h1 className="mt-4 text-2xl font-black text-zinc-900 sm:text-3xl">
          推し活 生涯総額計算機
        </h1>
        <p className="mt-2 text-zinc-500">
          今のペースで推し活を続けたら、一生でいくら使う？
        </p>

        {/* 入力フォーム */}
        <div className="mt-8 space-y-6">
          {/* 年齢 */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              あなたの年齢
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={13}
                max={55}
                value={age}
                onChange={(e) => {
                  setAge(Number(e.target.value));
                  setCalculated(false);
                }}
                className="flex-1 accent-purple-600"
              />
              <span className="w-16 text-center text-lg font-bold text-purple-700">
                {age}歳
              </span>
            </div>
          </div>

          {/* 月額 */}
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              推し活の月額（円）
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[5000, 10000, 15000, 30000, 50000, 100000].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setMonthlySpend(v);
                    setCalculated(false);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    monthlySpend === v
                      ? "bg-purple-600 text-white"
                      : "border border-purple-200 text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  {(v / 10000).toLocaleString()}万円
                </button>
              ))}
            </div>
            <input
              type="number"
              value={monthlySpend}
              onChange={(e) => {
                setMonthlySpend(Number(e.target.value) || 0);
                setCalculated(false);
              }}
              placeholder="月額を入力"
              className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
            />
            <p className="mt-1 text-xs text-zinc-400">
              チケット・グッズ・交通費・サブスクなど全て含めた月額
            </p>
          </div>

          {/* 計算ボタン */}
          <button
            onClick={() => setCalculated(true)}
            className="w-full rounded-xl bg-purple-600 py-4 text-lg font-bold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-500 active:scale-[0.98]"
          >
            生涯総額を計算する
          </button>
        </div>

        {/* 結果 */}
        {calculated && (
          <div className="mt-8 space-y-6">
            {/* メイン結果 */}
            <div className="rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 p-6 text-white shadow-lg">
              <p className="text-sm opacity-80">
                {age}歳から{OSHI_END_AGE}歳まで（{yearsLeft}年間）の推し活総額
              </p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-sm opacity-70">¥</span>
                <span className="text-4xl font-black sm:text-5xl">
                  {lifetimeTotal.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm opacity-80">
                月{monthlySpend.toLocaleString()}円 × 12ヶ月 × {yearsLeft}年
              </p>

              {level && (
                <div className="mt-4 rounded-lg bg-white/20 px-4 py-3 text-center">
                  <p className="text-xs opacity-80">あなたの推しレベル</p>
                  <p className="mt-1 text-xl font-black">{level.level}</p>
                  <p className="mt-1 text-sm opacity-90">{level.desc}</p>
                </div>
              )}
            </div>

            {/* 比較 */}
            {comparison && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-lg font-bold text-zinc-900">
                  この金額は...
                </h2>
                <p className="mt-3 text-center">
                  <span className="text-3xl font-black text-purple-600">
                    {comparison.label}
                  </span>
                  <span className="text-lg text-zinc-500">
                    {" "}が
                  </span>
                  <span className="text-3xl font-black text-pink-500">
                    {comparison.count}回
                  </span>
                  <span className="text-lg text-zinc-500">
                    {" "}買える金額
                  </span>
                </p>
              </div>
            )}

            {/* 年表 */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-bold text-zinc-900">推し活年表</h2>
              <div className="mt-4 space-y-2">
                {[1, 3, 5, 10, 20, yearsLeft].filter((v, i, a) => a.indexOf(v) === i && v <= yearsLeft).map((years) => (
                  <div key={years} className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2.5">
                    <span className="text-sm text-zinc-600">
                      {years}年後（{age + years}歳）
                    </span>
                    <span className="text-sm font-bold text-purple-700">
                      ¥{(monthlySpend * 12 * years).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* シェア */}
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-4 text-sm font-bold text-white hover:bg-zinc-700 transition"
            >
              X でシェアする
            </a>

            {/* 節約提案 */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-bold text-zinc-900">
                推し活をもっとお得に
              </h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-purple-50 p-4">
                  <p className="font-bold text-purple-800">楽天市場でグッズを買う</p>
                  <p className="mt-1 text-sm text-purple-600">
                    楽天ポイントが貯まるので、年間{Math.round(monthlySpend * 12 * 0.03).toLocaleString()}円分お得に。ペンライトや耳栓も楽天で買えます。
                  </p>
                </div>
                <div className="rounded-xl bg-pink-50 p-4">
                  <p className="font-bold text-pink-800">遠征は早割+楽天トラベルで節約</p>
                  <p className="mt-1 text-sm text-pink-600">
                    ホテル予約は早いほど安い。楽天トラベルならポイントも貯まって二重にお得。
                  </p>
                </div>
              </div>
            </div>

            {/* 関連ツール */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-sm font-bold text-zinc-600 mb-3">
                関連ツール
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/oshikatsu"
                  className="rounded-lg bg-purple-50 p-3 text-center text-sm font-medium text-purple-700 hover:bg-purple-100 transition"
                >
                  推し活費計算機（月額を詳しく計算）
                </Link>
                <Link
                  href="/gaman"
                  className="rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
                >
                  ガマンの値段
                </Link>
                <Link
                  href="/commute"
                  className="rounded-lg bg-sky-50 p-3 text-center text-sm font-medium text-sky-700 hover:bg-sky-100 transition"
                >
                  通勤時間の生涯換算
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
