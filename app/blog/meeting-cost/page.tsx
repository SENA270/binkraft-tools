import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "その会議、いくらかかってる？会議コストの計算方法",
  description:
    "会議の参加人数と時間から人件費を計算。1時間の会議が実はいくらのコストか可視化し、会議を減らす・短くするための具体的な方法を紹介します。",
};

export default function MeetingBlogPage() {
  return (
    <main className="flex-1 bg-white">
      <article className="mx-auto max-w-2xl px-4 py-10">
        <nav className="text-sm text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          {" > "}
          <span className="text-zinc-600">会議コストの計算</span>
        </nav>

        <h1 className="mt-6 text-3xl font-black leading-tight text-zinc-900">
          その会議、いくらかかってる？会議コストの計算方法
        </h1>
        <time className="mt-2 block text-sm text-zinc-400">2026-04-16</time>

        <div className="mt-8 prose prose-zinc prose-lg max-w-none prose-headings:mt-10 prose-headings:mb-4 prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-2 prose-h3:text-xl prose-p:leading-relaxed prose-p:mb-4 prose-li:leading-relaxed prose-a:text-blue-700 hover:prose-a:underline prose-strong:text-zinc-900">
          <div className="rounded-lg bg-blue-50 p-5 mb-8 not-prose">
            <p className="font-bold text-blue-900 mb-2">この記事でわかること</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>・会議の人件費コストの計算方法</li>
              <li>・「1時間の会議」が実際にいくらか</li>
              <li>・会議を減らす・短くするための具体的な方法</li>
            </ul>
          </div>

          <h2>会議のコストを考えたことはありますか？</h2>
          <p>
            会議室は無料で使えるし、参加するだけだからコストはかかっていない。
            そう思っている方は多いかもしれません。
          </p>
          <p>
            しかし、会議には参加者全員の人件費がかかっています。
            5人が1時間の会議に参加すれば、
            それは「5人分の1時間の給与」が使われているということです。
          </p>

          <h2>会議コストの計算方法</h2>
          <p>
            会議のコストは以下のシンプルな計算式で求められます。
          </p>

          <div className="not-prose my-6 rounded-lg bg-zinc-100 p-4 text-center">
            <p className="text-lg font-bold text-zinc-900">
              会議コスト ＝ 参加人数 × 会議時間 × 1人あたりの時給
            </p>
          </div>

          <p>
            1人あたりの時給は、年収から逆算できます。
            年収400万円なら時給は約2,000円、年収600万円なら約3,000円が目安です
            （年間労働時間を約2,000時間として計算）。
          </p>

          <h2>会議コストの具体例</h2>

          <div className="not-prose overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-200 px-4 py-2 text-left">会議の内容</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">人数</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">時間</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">コスト（時給3,000円）</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2">チームの朝会</td>
                  <td className="border border-zinc-200 px-4 py-2">5人</td>
                  <td className="border border-zinc-200 px-4 py-2">15分</td>
                  <td className="border border-zinc-200 px-4 py-2">3,750円</td>
                </tr>
                <tr className="bg-zinc-50">
                  <td className="border border-zinc-200 px-4 py-2">週次の進捗会議</td>
                  <td className="border border-zinc-200 px-4 py-2">8人</td>
                  <td className="border border-zinc-200 px-4 py-2">1時間</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">24,000円</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2">部門横断の定例</td>
                  <td className="border border-zinc-200 px-4 py-2">15人</td>
                  <td className="border border-zinc-200 px-4 py-2">1時間</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">45,000円</td>
                </tr>
                <tr className="bg-zinc-50">
                  <td className="border border-zinc-200 px-4 py-2">全社ミーティング</td>
                  <td className="border border-zinc-200 px-4 py-2">50人</td>
                  <td className="border border-zinc-200 px-4 py-2">1時間</td>
                  <td className="border border-zinc-200 px-4 py-2 font-bold">150,000円</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            8人で1時間の週次会議を毎週やると、年間で約125万円。
            「この会議、本当に必要か？」と考える価値がある金額です。
          </p>

          <h2>会議コストに含まれない「隠れコスト」</h2>
          <p>
            上の計算は参加中の人件費だけです。実際にはさらにコストがかかっています。
          </p>
          <ul>
            <li><strong>準備時間</strong>：資料作成、アジェンダの作成に30分〜1時間</li>
            <li><strong>移動時間</strong>：会議室への移動、別フロア・別オフィスの場合はさらに</li>
            <li><strong>コンテキストスイッチ</strong>：集中作業を中断して会議に参加すると、元の作業に戻るまで15〜20分かかる</li>
            <li><strong>議事録作成</strong>：会議後のまとめや共有にかかる時間</li>
          </ul>

          <h2>会議を減らす・短くする方法</h2>

          <h3>1. 「この会議、メールで済まないか」を常に考える</h3>
          <p>
            情報共有が目的の会議は、多くの場合メールやチャットで代替できます。
            議論や意思決定が必要な場合だけ、会議を設定しましょう。
          </p>

          <h3>2. 参加人数を減らす</h3>
          <p>
            「念のため呼んでおく」をやめるだけで、コストは大幅に下がります。
            意思決定に必要な人だけを招集し、それ以外の人には議事録を共有すれば十分です。
          </p>

          <h3>3. 時間を短く設定する</h3>
          <p>
            1時間の枠を取ると1時間使い切りがち。
            30分で設定すれば、30分で終わる内容にまとまります。
            アジェンダを事前に共有し、時間内に結論を出すことを意識しましょう。
          </p>

          <h3>4. 定例会議を見直す</h3>
          <p>
            「毎週やっているから」という理由だけで続いている会議はありませんか？
            隔週や月1回に減らしても問題ないか、一度検討してみてください。
          </p>

          <h2>自分の会議のコストを計算してみよう</h2>
          <p>
            会議の時間と参加人数を入力するだけで、リアルタイムにコストが表示されるツールを用意しました。
            会議中に使って「今いくらかかっているか」を可視化するのにも使えます。
          </p>

          <div className="not-prose my-8 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 p-6 text-center">
            <p className="text-lg font-bold text-zinc-900">
              💸 会議コスト計算機
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              タイマー機能付き。参加人数と時間から会議のリアルタイムコストを計算します
            </p>
            <Link
              href="/meeting"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition"
            >
              無料で計算してみる →
            </Link>
          </div>

          <h2>まとめ</h2>
          <p>
            会議は「無料」ではありません。参加者全員の時間＝人件費がかかっています。
            コストを意識することで、本当に必要な会議だけを残し、
            チームの生産性を上げるきっかけになります。
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
