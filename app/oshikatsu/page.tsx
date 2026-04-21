"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Entry = { label: string; amount: number };

const CATEGORIES = [
  {
    name: "チケット",
    presets: ["ライブ", "舞台", "映画", "イベント", "ファンミ"],
  },
  {
    name: "グッズ",
    presets: ["CD/DVD", "アクスタ", "ペンライト", "Tシャツ", "写真集", "ランダムグッズ"],
  },
  {
    name: "交通・宿泊",
    presets: ["電車", "新幹線", "飛行機", "ホテル", "夜行バス"],
  },
  {
    name: "その他",
    presets: ["FC年会費", "サブスク", "雑誌", "カフェ（聖地巡礼）", "配信投げ銭", "ゲーム課金"],
  },
];

const MESSAGES = [
  { min: 0, max: 5000, text: "堅実な推し活！ まだまだ推せる余地あり？" },
  { min: 5000, max: 20000, text: "いい感じの推し活ペース！" },
  { min: 20000, max: 50000, text: "推しへの愛が溢れてる！" },
  { min: 50000, max: 100000, text: "ガチ勢の域に突入！ 推しも喜んでるはず" },
  { min: 100000, max: Infinity, text: "推しへの愛、プライスレス 👑" },
];

export default function OshikatsuPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [inputLabel, setInputLabel] = useState("");
  const [inputAmount, setInputAmount] = useState("");
  const [oshiName, setOshiName] = useState("");
  const [period, setPeriod] = useState<"month" | "year">("month");
  const amountRef = useRef<HTMLInputElement>(null);

  const addEntry = (label?: string) => {
    const l = label || inputLabel;
    const a = parseInt(inputAmount);
    if (label && !inputAmount) {
      setInputLabel(label);
      amountRef.current?.focus();
      return;
    }
    if (!l || isNaN(a) || a <= 0) return;
    setEntries((prev) => [...prev, { label: l, amount: a }]);
    setInputLabel("");
    setInputAmount("");
  };

  const removeEntry = (i: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  };

  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const displayTotal = period === "year" ? total * 12 : total;
  const dailyAmount = Math.round((period === "year" ? displayTotal : total * 12) / 365);
  const message = MESSAGES.find((m) => total >= m.min && total < m.max);

  const oshiLabel = oshiName ? `${oshiName}に` : "推しに";
  const shareText =
    entries.length > 0
      ? `${oshiLabel}月${total.toLocaleString()}円（年${(total * 12).toLocaleString()}円）使ってた💜\n\n${message?.text}\n\n▶ あなたも計算してみて\nhttps://binkraft-tools.vercel.app/oshikatsu`
      : "";

  return (
    <main className="flex-1 bg-gradient-to-b from-purple-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-zinc-400 hover:underline">
          ← ツール一覧
        </Link>

        <h1 className="mt-4 text-3xl font-black text-zinc-900">
          推し活費計算機
        </h1>
        <p className="mt-2 text-zinc-500">
          推しにいくら使ってるか、正直に計算してみよう
        </p>

        {/* 推し名入力 */}
        <div className="mt-6">
          <input
            type="text"
            placeholder="推しの名前（任意）"
            value={oshiName}
            onChange={(e) => setOshiName(e.target.value)}
            className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-200"
          />
        </div>

        {/* カテゴリプリセット */}
        <div className="mt-6 space-y-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <p className="text-sm font-bold text-zinc-600 mb-2">
                {cat.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {cat.presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => addEntry(preset)}
                    className="rounded-full border border-purple-200 bg-white px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 入力フォーム */}
        <div className="mt-6 space-y-2">
          <input
            type="text"
            placeholder="項目名"
            value={inputLabel}
            onChange={(e) => setInputLabel(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
          />
          <div className="flex gap-2">
            <input
              ref={amountRef}
              type="number"
              placeholder="月額（円）"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEntry()}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            />
            <button
              onClick={() => addEntry()}
              className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-700 transition"
            >
              追加
            </button>
          </div>
        </div>

        {/* 入力済みリスト */}
        {entries.length > 0 && (
          <div className="mt-6 space-y-2">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-white border border-zinc-200 px-4 py-3"
              >
                <span className="text-sm font-medium text-zinc-800">
                  {entry.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-purple-600">
                    ¥{entry.amount.toLocaleString()}/月
                  </span>
                  <button
                    onClick={() => removeEntry(i)}
                    className="text-zinc-400 hover:text-red-500 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 結果 */}
        {entries.length > 0 && (
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-80">
              {oshiLabel}使ってる金額
            </p>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setPeriod("month")}
                className={`rounded-lg px-3 py-1 text-sm font-bold transition ${
                  period === "month"
                    ? "bg-white/30"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                月額
              </button>
              <button
                onClick={() => setPeriod("year")}
                className={`rounded-lg px-3 py-1 text-sm font-bold transition ${
                  period === "year"
                    ? "bg-white/30"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                年額
              </button>
            </div>

            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-sm opacity-70">¥</span>
              <span className="text-5xl font-black">
                {displayTotal.toLocaleString()}
              </span>
              <span className="text-lg opacity-80">
                /{period === "month" ? "月" : "年"}
              </span>
            </div>

            <p className="mt-1 text-sm opacity-80">
              1日あたり ¥{dailyAmount.toLocaleString()}
            </p>

            {message && (
              <p className="mt-4 text-sm font-bold bg-white/20 rounded-lg px-3 py-2 text-center">
                {message.text}
              </p>
            )}

            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-100 transition"
            >
              𝕏 でシェアする
            </a>
          </div>
        )}

        {/* 提案セクション */}
        {entries.length > 0 && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-bold text-zinc-900">
              推し活をもっとお得に
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-purple-50 p-4">
                <p className="font-bold text-purple-800">💳 推し活向けクレカで還元率UP</p>
                <p className="mt-1 text-sm text-purple-600">
                  エンタメ系の還元率が高いカードなら、年間{Math.round(displayTotal * 0.03).toLocaleString()}円分のポイントが戻ってくるかも。
                </p>
                {/* PR: クレジットカードのアフィリエイトリンク設置予定 */}
              </div>
              <div className="rounded-xl bg-pink-50 p-4">
                <p className="font-bold text-pink-800">📊 推し活の予算管理をもっと楽に</p>
                <p className="mt-1 text-sm text-pink-600">
                  家計簿アプリでカテゴリ別に推し活費を自動記録。使いすぎ防止にも。
                </p>
                {/* PR: 家計簿アプリのアフィリエイトリンク設置予定 */}
              </div>
            </div>
          </div>
        )}

        {/* 関連記事 */}
        <Link
          href="/blog/oshikatsu-cost"
          className="block rounded-xl border border-purple-200 bg-purple-50 p-4 text-center text-sm font-medium text-purple-700 hover:bg-purple-100 transition"
        >
          📝 推し活費について詳しく解説 →
        </Link>

        {/* 他のツール */}
        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-sm font-bold text-zinc-600 mb-3">
            他のツールも試す
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/commute"
              className="rounded-lg bg-sky-50 p-3 text-center text-sm font-medium text-sky-700 hover:bg-sky-100 transition"
            >
              🚃 通勤時間の生涯換算
            </Link>
            <Link
              href="/gaman"
              className="rounded-lg bg-amber-50 p-3 text-center text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
            >
              💰 ガマンの値段
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
    </main>
  );
}
