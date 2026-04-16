import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ブログ",
  description: "お金・時間・コストにまつわるコラム。無料計算ツールと合わせてどうぞ。",
};

const articles = [
  {
    href: "/blog/commute-lifetime",
    title: "通勤時間は人生の何年分？生涯の通勤コストを計算してみた",
    description: "片道1時間の通勤を38年間続けると、生涯で約2万時間。あなたの通勤時間を生涯換算できます。",
    emoji: "🚃",
  },
  {
    href: "/blog/gaman-cost",
    title: "ガマンの値段とは？我慢のコストを数値化してみた",
    description: "飲み会・趣味・買い物…我慢の年間コストを計算し、本当に節約になっているか検証。",
    emoji: "💰",
  },
  {
    href: "/blog/oshikatsu-cost",
    title: "推し活に年間いくら使ってる？費用の計算方法",
    description: "チケット代、グッズ、交通費、遠征費…推し活にかかる年間コストを項目別に計算。",
    emoji: "💜",
  },
  {
    href: "/blog/meeting-cost",
    title: "その会議、いくらかかってる？会議コストの計算方法",
    description: "会議の参加人数と時間から人件費を計算。1時間の会議が実はいくらか可視化。",
    emoji: "💸",
  },
];

export default function BlogIndex() {
  return (
    <main className="flex-1 bg-white">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <nav className="text-sm text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          {" > "}
          <span className="text-zinc-600">ブログ</span>
        </nav>

        <h1 className="mt-6 text-3xl font-black text-zinc-900">ブログ</h1>
        <p className="mt-2 text-zinc-500">
          お金・時間・コストにまつわるコラム
        </p>

        <div className="mt-8 grid gap-4">
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="block rounded-xl border border-zinc-200 p-5 transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <p className="text-lg font-bold text-zinc-900">
                {article.emoji} {article.title}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                {article.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-10 border-t border-zinc-200 pt-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
          >
            ← ツール一覧に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
