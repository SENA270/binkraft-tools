import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "通勤時間は人生の何年分？生涯の通勤コストを計算してみた",
  description:
    "片道1時間の通勤を38年間続けると、生涯で約2万時間（2.3年分）を通勤に費やす計算に。あなたの通勤時間を生涯換算できる無料ツールも紹介。",
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

        <div className="mt-8 prose prose-zinc prose-lg max-w-none">
          <div className="rounded-lg bg-sky-50 p-5 mb-8 not-prose">
            <p className="font-bold text-sky-900 mb-2">この記事でわかること</p>
            <ul className="text-sm text-sky-800 space-y-1">
              <li>・通勤時間を生涯で換算するとどれくらいになるか</li>
              <li>・通勤にかかる「見えないコスト」の正体</li>
              <li>・通勤時間を減らす3つの現実的な方法</li>
            </ul>
          </div>

          <h2>毎日の通勤、生涯で何時間になるか考えたことはありますか？</h2>
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

          <h2>通勤時間別の生涯換算</h2>
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
                  <th className="border border-zinc-200 px-4 py-2 text-left">時給2,000円換算</th>
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

          <h2>通勤の「見えないコスト」</h2>
          <p>
            通勤のコストは時間だけではありません。
          </p>
          <ul>
            <li><strong>体力の消耗</strong>：満員電車で消費する体力は、仕事のパフォーマンスに影響する</li>
            <li><strong>睡眠時間の削減</strong>：通勤が長いほど、起床時間が早くなる</li>
            <li><strong>ストレス</strong>：遅延、混雑、乗り換えのストレスが毎日積み重なる</li>
            <li><strong>交通費</strong>：定期代は会社負担でも、それは本来給与に回せるお金</li>
          </ul>

          <h2>通勤時間を減らす3つの方法</h2>

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

          <h2>あなたの通勤時間を計算してみよう</h2>
          <p>
            自分の通勤時間が生涯でどれくらいになるか、具体的な数字で確認できます。
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

          <h2>まとめ</h2>
          <p>
            毎日の通勤時間は、1日単位で見ると大したことがないように感じます。
            でも生涯で換算すると、数年分の時間になります。
          </p>
          <p>
            まずは自分の数字を知ることが、働き方を見直すきっかけになるかもしれません。
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
