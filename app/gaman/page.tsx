"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { label: string; amount: number; perDay: boolean; checked: boolean };

const PRESETS: Omit<Item, "checked">[] = [
  { label: "コンビニコーヒー", amount: 300, perDay: true },
  { label: "コンビニスイーツ", amount: 250, perDay: true },
  { label: "ペットボトル飲料", amount: 160, perDay: true },
  { label: "ランチ外食（弁当との差額）", amount: 500, perDay: true },
  { label: "タバコ", amount: 600, perDay: true },
  { label: "スタバの新作", amount: 500, perDay: true },
  { label: "Netflix", amount: 1980, perDay: false },
  { label: "Spotify", amount: 980, perDay: false },
  { label: "Amazon Prime", amount: 600, perDay: false },
  { label: "ジム会費", amount: 8000, perDay: false },
  { label: "ゲーム課金", amount: 3000, perDay: false },
];

const MILESTONES = [
  { amount: 3000, label: "ちょっといいランチ" },
  { amount: 10000, label: "欲しかった本5冊" },
  { amount: 30000, label: "推しのライブチケット" },
  { amount: 50000, label: "最新ワイヤレスイヤホン" },
  { amount: 100000, label: "国内旅行" },
  { amount: 200000, label: "最新iPhone" },
  { amount: 350000, label: "海外旅行" },
  { amount: 500000, label: "引っ越し資金" },
];

export default function GamanPage() {
  const [items, setItems] = useState<Item[]>(
    PRESETS.map((p) => ({ ...p, checked: false }))
  );
  const [customLabel, setCustomLabel] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [customPerDay, setCustomPerDay] = useState(true);

  const toggleItem = (i: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const addCustom = () => {
    const amt = parseInt(customAmount);
    if (!customLabel || isNaN(amt) || amt <= 0) return;
    setItems((prev) => [
      ...prev,
      { label: customLabel, amount: amt, perDay: customPerDay, checked: true },
    ]);
    setCustomLabel("");
    setCustomAmount("");
  };

  const checkedItems = items.filter((i) => i.checked);
  const monthlyTotal = checkedItems.reduce(
    (sum, i) => sum + (i.perDay ? i.amount * 30 : i.amount),
    0
  );
  const yearlyTotal = monthlyTotal * 12;

  // 3ヶ月・半年・1年のマイルストーン
  const threeMonth = monthlyTotal * 3;
  const sixMonth = monthlyTotal * 6;
  const milestones3 = MILESTONES.filter((m) => m.amount <= threeMonth).pop();
  const milestones6 = MILESTONES.filter((m) => m.amount <= sixMonth).pop();
  const milestones12 = MILESTONES.filter((m) => m.amount <= yearlyTotal).pop();

  const shareText =
    checkedItems.length > 0
      ? `ガマンの値段💰 年間${yearlyTotal.toLocaleString()}円\n\n▶ あなたも計算してみて\nhttps://binkraft-tools.vercel.app/gaman`
      : "";

  return (
    <main className="flex-1 bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/" className="text-sm text-zinc-400 hover:underline">
          ← ツール一覧
        </Link>

        <h1 className="mt-4 text-3xl font-black text-zinc-900">
          💰 ガマンの値段
        </h1>
        <p className="mt-2 text-zinc-500">
          我慢してるもの、年間でいくらになるか知ってますか？
        </p>

        {/* 合計バー（チェックがあるとき固定表示） */}
        {checkedItems.length > 0 && (
          <div className="sticky top-0 z-10 -mx-4 mt-4 border-b border-amber-200 bg-amber-50/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-amber-800">
              {checkedItems.length}項目選択中
            </span>
            <span className="text-lg font-black text-amber-700">
              ¥{yearlyTotal.toLocaleString()}/年
            </span>
          </div>
        )}

        {/* チェックリスト */}
        <div className="mt-6 space-y-2">
          {items.map((item, i) => (
            <label
              key={i}
              className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition ${
                item.checked
                  ? "border-amber-400 bg-amber-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(i)}
                className="h-5 w-5 rounded border-zinc-300 text-amber-500 focus:ring-2 focus:ring-amber-500"
              />
              <span className="flex-1 font-medium text-zinc-800">
                {item.label}
              </span>
              <span className="text-sm font-bold text-zinc-500">
                ¥{item.amount.toLocaleString()}/{item.perDay ? "日" : "月"}
              </span>
            </label>
          ))}
        </div>

        {/* カスタム追加（モバイル対応: 縦積み） */}
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-white p-4">
          <p className="text-sm font-bold text-zinc-600 mb-3">自分で追加</p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="項目名（例: 自販機の缶コーヒー）"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="金額"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
              />
              <select
                value={customPerDay ? "day" : "month"}
                onChange={(e) => setCustomPerDay(e.target.value === "day")}
                className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm"
              >
                <option value="day">/ 日</option>
                <option value="month">/ 月</option>
              </select>
            </div>
          </div>
          <button
            onClick={addCustom}
            className="mt-3 w-full rounded-lg bg-zinc-100 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-200 transition"
          >
            + 追加する
          </button>
        </div>

        {/* 結果 */}
        {checkedItems.length > 0 && (
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white shadow-lg">
            <p className="text-sm font-medium opacity-80">
              あなたのガマンの値段
            </p>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-sm opacity-70">¥</span>
              <span className="text-5xl font-black">
                {yearlyTotal.toLocaleString()}
              </span>
              <span className="text-lg opacity-80">/年</span>
            </div>
            <p className="mt-1 text-lg font-bold opacity-90">
              月 ¥{monthlyTotal.toLocaleString()}
            </p>

            {/* 内訳 */}
            <div className="mt-4 rounded-xl bg-white/20 p-3">
              <p className="text-sm font-medium">内訳:</p>
              {checkedItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm mt-1">
                  <span>{item.label}</span>
                  <span>
                    ¥
                    {(item.perDay
                      ? item.amount * 30
                      : item.amount
                    ).toLocaleString()}
                    /月
                  </span>
                </div>
              ))}
            </div>

            {/* マイルストーン（複数表示） */}
            <div className="mt-4 space-y-2">
              {milestones3 && (
                <div className="flex items-center gap-2 text-sm bg-white/15 rounded-lg px-3 py-2">
                  <span className="font-bold">3ヶ月</span>
                  <span className="opacity-80">
                    ¥{threeMonth.toLocaleString()} →「{milestones3.label}」
                  </span>
                </div>
              )}
              {milestones6 && milestones6 !== milestones3 && (
                <div className="flex items-center gap-2 text-sm bg-white/15 rounded-lg px-3 py-2">
                  <span className="font-bold">半年</span>
                  <span className="opacity-80">
                    ¥{sixMonth.toLocaleString()} →「{milestones6.label}」
                  </span>
                </div>
              )}
              {milestones12 && milestones12 !== milestones6 && (
                <div className="flex items-center gap-2 text-sm bg-white/20 rounded-lg px-3 py-2 font-bold">
                  <span>1年</span>
                  <span>
                    ¥{yearlyTotal.toLocaleString()} →「{milestones12.label}
                    」
                  </span>
                </div>
              )}
            </div>

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
        )}

        {/* 提案セクション */}
        {checkedItems.length > 0 && (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-bold text-zinc-900">
              もっとお得に暮らすには
            </h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="font-bold text-amber-800">🎁 ポイ活で取り戻す</p>
                <p className="mt-1 text-sm text-amber-600">
                  普段の買い物をポイントサイト経由にするだけで、年間{Math.min(Math.round(yearlyTotal * 0.05), 30000).toLocaleString()}円分のポイントが貯まるかも。
                </p>
                {/* PR: ポイ活サイトのアフィリエイトリンク設置予定 */}
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="font-bold text-green-800">💰 家計の見直しを相談</p>
                <p className="mt-1 text-sm text-green-600">
                  FPへの無料相談で、保険・通信費・サブスクの見直しポイントが見つかるかも。
                </p>
                {/* PR: FP無料相談のアフィリエイトリンク設置予定 */}
              </div>
            </div>
          </div>
        )}

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
    </main>
  );
}
