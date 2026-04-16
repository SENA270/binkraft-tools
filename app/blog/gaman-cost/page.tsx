import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ガマンの値段とは？我慢のコストを数値化してみた",
  description:
    "日々の我慢にはいくらの価値があるのか。飲み会・趣味・買い物…我慢していることの年間コストを計算し、本当に節約になっているか検証します。",
};

export default function GamanBlogPage() {
  return (
    <main className="flex-1 bg-white">
      <article className="mx-auto max-w-2xl px-4 py-10">
        <nav className="text-sm text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          {" > "}
          <span className="text-zinc-600">ガマンの値段</span>
        </nav>

        <h1 className="mt-6 text-3xl font-black leading-tight text-zinc-900">
          ガマンの値段とは？我慢のコストを数値化してみた
        </h1>
        <time className="mt-2 block text-sm text-zinc-400">2026-04-16</time>

        <div className="mt-8 prose prose-zinc prose-lg max-w-none prose-headings:mt-10 prose-headings:mb-4 prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-2 prose-h3:text-xl prose-p:leading-relaxed prose-p:mb-4 prose-li:leading-relaxed prose-a:text-blue-700 hover:prose-a:underline prose-strong:text-zinc-900">
          <div className="rounded-lg bg-amber-50 p-5 mb-8 not-prose">
            <p className="font-bold text-amber-900 mb-2">この記事でわかること</p>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>・「我慢＝節約」とは限らない理由</li>
              <li>・我慢のコストを金額で可視化する方法</li>
              <li>・本当にやめるべき出費と、我慢しなくていい出費の見分け方</li>
            </ul>
          </div>

          <h2>我慢で節約した金額は大きいが、見えないコストもある</h2>
          <p>
            行きたかった飲み会を断って3,000円の節約。欲しかった本を我慢して1,500円の節約。
            外食をやめて自炊にして800円の節約。
          </p>
          <p>
            1つ1つは小さな金額ですが、これを毎日続けると年間でいくらになるか。
            実は「我慢して節約した金額」は、思っている以上に大きいです。
          </p>
          <p>
            でも同時に、我慢にはコストがかかっています。
            ストレスによるパフォーマンス低下、人間関係への影響、
            自分の時間を楽しめない精神的な負担。
            これらの「見えないコスト」を考えると、
            全ての我慢が正しい節約とは言えないかもしれません。
          </p>

          <h2>日常の我慢4つで年間22万円の節約になるが、続けられるか</h2>
          <p>
            日常的な我慢を金額で計算してみましょう。
          </p>

          <div className="not-prose overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-200 px-4 py-2 text-left">我慢していること</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">1回の金額</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">頻度</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">年間コスト</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2">コンビニコーヒー</td>
                  <td className="border border-zinc-200 px-4 py-2">150円</td>
                  <td className="border border-zinc-200 px-4 py-2">毎日</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">54,750円</td>
                </tr>
                <tr className="bg-zinc-50">
                  <td className="border border-zinc-200 px-4 py-2">飲み会</td>
                  <td className="border border-zinc-200 px-4 py-2">3,000円</td>
                  <td className="border border-zinc-200 px-4 py-2">月2回</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">72,000円</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2">ランチの外食</td>
                  <td className="border border-zinc-200 px-4 py-2">500円（差額）</td>
                  <td className="border border-zinc-200 px-4 py-2">週3回</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">78,000円</td>
                </tr>
                <tr className="bg-zinc-50">
                  <td className="border border-zinc-200 px-4 py-2">趣味の買い物</td>
                  <td className="border border-zinc-200 px-4 py-2">2,000円</td>
                  <td className="border border-zinc-200 px-4 py-2">月1回</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">24,000円</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            この4つを全部我慢すると、年間約22万円の節約。確かに大きい金額です。
          </p>
          <p>
            しかし問題は、<strong>この22万円分の我慢を1年間続けられるか</strong>ということ。
            そして、我慢し続けた先に「ストレスによる衝動買い」や
            「人付き合いが減ることでの機会損失」が起きていないかということです。
          </p>

          <h2>「やめるべき出費」と「やめなくていい出費」</h2>
          <p>
            全ての出費を我慢する必要はありません。
            大切なのは、自分にとって価値がある出費とそうでない出費を見分けることです。
          </p>

          <h3>やめた方がいい出費</h3>
          <ul>
            <li>惰性で続けているサブスク（使っていないのに毎月引き落とし）</li>
            <li>見栄のための出費（付き合いだけの飲み会、必要ないブランド品）</li>
            <li>「なんとなく」の買い物（コンビニでの目的なし購入）</li>
          </ul>

          <h3>やめなくていい出費</h3>
          <ul>
            <li>自分の幸福度を上げるもの（趣味、好きな食べ物、リラックスできるもの）</li>
            <li>人間関係を維持するもの（大切な人との食事、お祝い）</li>
            <li>将来の自分に投資になるもの（書籍、勉強、健康）</li>
          </ul>

          <h2>チェックリストで年間のガマン総額を計算できる</h2>
          <p>
            我慢していることを洗い出して、それぞれの年間金額を可視化できるツールを用意しました。
            チェックリスト形式で簡単に計算できます。
          </p>

          <div className="not-prose my-8 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-100 p-6 text-center">
            <p className="text-lg font-bold text-zinc-900">
              💰 ガマンの値段計算機
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              我慢していることにチェックを入れるだけで、年間のガマン総額がわかります
            </p>
            <Link
              href="/gaman"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition"
            >
              無料で計算してみる →
            </Link>
          </div>

          <h2>数字で把握すれば、必要な節約と不要な我慢の区別がつく</h2>
          <p>
            我慢は必ずしも正しい節約ではありません。
            自分が何にいくら我慢しているかを数字で把握すると、
            本当に必要な節約と、やめなくていい我慢の区別がつきやすくなります。
          </p>
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
