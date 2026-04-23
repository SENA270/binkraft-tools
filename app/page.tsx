import Link from "next/link";

const tools = [
  {
    href: "/commute",
    title: "通勤時間の生涯換算",
    description: "片道の通勤時間を入力するだけ。人生の何年を通勤に使ってる？",
    emoji: "",
    color: "from-sky-500 to-blue-600",
  },
  {
    href: "/gaman",
    title: "ガマンの値段",
    description: "日々の我慢を金額に変換。年間でいくら節約できるか計算",
    emoji: "",
    color: "from-amber-500 to-orange-500",
  },
  {
    href: "/oshikatsu-lifetime",
    title: "推し活 生涯総額計算機",
    description: "今のペースで推し続けたら、一生でいくら使う？",
    emoji: "",
    color: "from-purple-600 to-pink-500",
  },
  {
    href: "/oshikatsu",
    title: "推し活費計算機",
    description: "チケット・グッズ・交通費...推しにいくら使ったか計算",
    emoji: "",
    color: "from-purple-500 to-pink-500",
  },
  {
    href: "/ai-roi",
    title: "AI Subscription ROI Calculator",
    description: "Is your ChatGPT/Claude subscription worth it? Calculate your real ROI",
    emoji: "",
    color: "from-green-500 to-emerald-500",
  },
  {
    href: "/meeting",
    title: "会議コスト計算機",
    description: "この会議、いくらかかってる？リアルタイムで金額表示",
    emoji: "",
    color: "from-blue-500 to-cyan-500",
  },
  {
    href: "/study-motivate",
    title: "勉強応援メッセージ",
    description: "諦めそうになったらこれを開け。手を抜くな、自分に嘘をつくな",
    emoji: "🔥",
    color: "from-blue-600 to-indigo-700",
  },
  {
    href: "/study-timer",
    title: "ポモドーロタイマー",
    description: "25分集中→5分休憩。学習時間を記録して試験日までカウントダウン",
    emoji: "⏱",
    color: "from-blue-500 to-blue-700",
  },
  {
    href: "/study-clock",
    title: "勉強用時計",
    description: "フルスクリーン時計+試験までのカウントダウン。時間を意識しろ",
    emoji: "🕐",
    color: "from-slate-700 to-blue-900",
  },
  {
    href: "/study-instructor",
    title: "鬼教官「基本情報」",
    description: "逃げるな。鬼教官がお前を叩き直す。閉じたら負けだ",
    emoji: "👹",
    color: "from-red-600 to-red-800",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "binkraft tools",
  url: "https://binkraft-tools.vercel.app",
  description: "シンプルで便利な無料Web計算ツール集。通勤時間の生涯換算、ガマンの値段、推し活費計算機、会議コスト計算機。",
};

export default function Home() {
  return (
    <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900">
          binkraft tools
        </h1>
        <p className="mt-3 text-lg text-zinc-500">
          シンプルで便利な無料計算ツール
        </p>
        <div className="mt-12 grid gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              target="_blank"
              className="group flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm border border-zinc-200 transition hover:shadow-md hover:border-zinc-300 text-left"
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color} text-2xl shadow-sm`}
              >
                {tool.emoji}
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 group-hover:text-zinc-700">
                  {tool.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/blog"
            className="text-sm text-zinc-400 hover:text-zinc-700 hover:underline"
          >
            📝 ブログ — お金・時間にまつわるコラム
          </Link>
        </div>
        <p className="mt-6 text-xs text-zinc-400">&copy; 2026 binkraft</p>
      </div>
    </main>
  );
}
