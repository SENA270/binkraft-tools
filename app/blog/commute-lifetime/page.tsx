import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "通勤時間は人生の何年分？生涯の通勤コストを計算してみた",
  description:
    "片道1時間の通勤を38年間続けると、生涯で約2万時間（2.3年分）を通勤に費やす計算に。あなたの通勤時間を生涯換算できる無料ツールも紹介。",
  openGraph: {
    title: "通勤時間は人生の何年分？生涯の通勤コストを計算してみた",
    description: "片道1時間×38年＝約2万時間。人生の2年以上を通勤に使っている計算です。",
    type: "article",
  },
  twitter: { card: "summary_large_image" },
};

export default function CommuteBlogPage() {
  return (
    <main className="flex-1 bg-white">
      <article className="mx-auto max-w-2xl px-4 py-10">
        <nav className="text-sm text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          {" > "}
          <span className="text-zinc-600">通勤時間の生涯コスト</span>
        </nav>

        <h1 className="mt-6 text-3xl font-black leading-tight text-zinc-900">
          通勤時間は人生の何年分？生涯の通勤コストを計算してみた
        </h1>
        <time className="mt-2 block text-sm text-zinc-400">2026-04-16</time>

        <div className="mt-8 prose prose-zinc prose-lg max-w-none prose-headings:mt-10 prose-headings:mb-4 prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-2 prose-h3:text-xl prose-p:leading-relaxed prose-p:mb-4 prose-li:leading-relaxed prose-a:text-blue-700 hover:prose-a:underline prose-strong:text-zinc-900">
          <div className="rounded-lg bg-sky-50 p-5 mb-8 not-prose">
            <p className="font-bold text-sky-900 mb-2">この記事でわかること</p>
            <ul className="text-sm text-sky-800 space-y-1">
              <li>・通勤時間を生涯で換算するとどれくらいになるか</li>
              <li>・通勤にかかる「見えないコスト」の正体</li>
              <li>・通勤時間を減らす3つの現実的な方法</li>
            </ul>
          </div>

          <h2>片道1時間の通勤を38年続けると、人生の2年以上が消える</h2>
          <p>
            片道1時間の通勤。往復2時間。週5日。年間約240日。
          </p>
          <p>
            「たった1時間」と思うかもしれません。
            でもこれを38年間（22歳〜60歳）続けると、生涯で約18,240時間になります。
          </p>
          <p>
            <strong>18,240時間 = 760日 = 約2.1年分。</strong>
          </p>
          <p>
            人生の2年以上を、電車やバスの中で過ごしている計算です。
          </p>

          <h2>片道30分なら1年、1時間半なら3年以上を通勤に使う</h2>
          <p>
            片道の通勤時間が変わると、生涯の合計はどう変わるのか。
            38年間勤務・年間240日通勤として計算しました。
          </p>

          <div className="not-prose overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-200 px-4 py-2 text-left">片道</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">生涯合計</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">年換算</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">時給2,000円で換算した金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2">30分</td>
                  <td className="border border-zinc-200 px-4 py-2">9,120時間</td>
                  <td className="border border-zinc-200 px-4 py-2">約1.0年</td>
                  <td className="border border-zinc-200 px-4 py-2">約1,824万円</td>
                </tr>
                <tr className="bg-zinc-50">
                  <td className="border border-zinc-200 px-4 py-2">45分</td>
                  <td className="border border-zinc-200 px-4 py-2">13,680時間</td>
                  <td className="border border-zinc-200 px-4 py-2">約1.6年</td>
                  <td className="border border-zinc-200 px-4 py-2">約2,736万円</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">1時間</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">18,240時間</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">約2.1年</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">約3,648万円</td>
                </tr>
                <tr className="bg-zinc-50">
                  <td className="border border-zinc-200 px-4 py-2">1時間半</td>
                  <td className="border border-zinc-200 px-4 py-2">27,360時間</td>
                  <td className="border border-zinc-200 px-4 py-2">約3.1年</td>
                  <td className="border border-zinc-200 px-4 py-2">約5,472万円</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            片道1時間半の通勤だと、生涯で3年以上。
            時給に換算すると5,000万円以上の時間を通勤に使っていることになります。
          </p>

          <h2>体力・睡眠・ストレス — 時間以外にも失っているもの</h2>
          <p>
            通勤のコストは時間だけではありません。
          </p>
          <ul>
            <li><strong>体力の消耗</strong>：満員電車で消費する体力は、仕事のパフォーマンスに影響する</li>
            <li><strong>睡眠時間の減少</strong>：通勤が長いほど睡眠時間は短くなり、慢性的な寝不足につながる</li>
            <li><strong>ストレス</strong>：遅延、混雑、乗り換えのストレスが毎日積み重なる</li>
          </ul>

          <h2>通勤時間を減らす2つの方法と、減らせないときの活用法</h2>

          <h3>1. リモートワークが可能な仕事を探す</h3>
          <p>
            週5日の出社が週2日に減るだけで、通勤時間は60%削減されます。
            フルリモートなら通勤時間はゼロになります。
            IT・Web業界ではリモートワークを導入している企業が増えています。
          </p>

          <h3>2. 職場の近くに引っ越す</h3>
          <p>
            片道1時間を15分に短縮できれば、1日1時間半の時間が生まれます。
            年間で約360時間。家賃が上がったとしても、時間の価値を考えると元が取れる場合があります。
          </p>

          <h3>3. 通勤時間を「学びの時間」に変える</h3>
          <p>
            通勤時間を完全になくせない場合は、その時間を有効活用する方法もあります。
            オーディオブック、ポッドキャスト、語学学習アプリなど、
            移動中にできるインプットは意外と多いです。
          </p>

          <h2>今は気にならなくても、ライフステージの変化で通勤の負担は増していく</h2>
          <p>
            今は通勤時間をそこまで気にしていない方も多いかもしれません。
            でも、結婚や子育てが始まると自由に使える時間は大幅に減ります。
            そのとき「通勤に毎日2時間取られている」ことの重さは、今とは比較にならないほど大きくなります。
          </p>
          <p>
            何にせよ、まずは今の自分が通勤にどれだけの時間を使っているか、客観的に把握することが一歩になります。
            以下のツールでは、片道の通勤時間を入力するだけで生涯の通勤時間を計算できます。
          </p>

          <div className="not-prose my-8 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 p-6 text-center">
            <p className="text-lg font-bold text-zinc-900">
              🚃 通勤時間の生涯換算ツール
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              片道の通勤時間を入力するだけで、生涯の通勤時間・日数・年数を計算します
            </p>
            <Link
              href="/commute"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition"
            >
              無料で計算してみる →
            </Link>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-200 pt-6">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
          >
            ← ツール一覧に戻る
          </Link>
        </div>
      </article>
    </main>
  );
}
