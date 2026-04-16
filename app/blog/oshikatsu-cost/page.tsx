import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "推し活に年間いくら使ってる？オタク費用の計算方法",
  description:
    "チケット代、グッズ、交通費、遠征費…推し活にかかる年間コストを項目別に計算。自分がいくら使っているかを可視化する無料ツールも紹介します。",
  openGraph: {
    title: "推し活に年間いくら使ってる？費用の計算方法",
    description: "チケット・グッズ・遠征費…全部合計すると年間6万〜24万円以上。",
    type: "article",
  },
  twitter: { card: "summary_large_image" },
};

export default function OshikatsuBlogPage() {
  return (
    <main className="flex-1 bg-white">
      <article className="mx-auto max-w-2xl px-4 py-10">
        <nav className="text-sm text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          {" > "}
          <span className="text-zinc-600">推し活の年間コスト</span>
        </nav>

        <h1 className="mt-6 text-3xl font-black leading-tight text-zinc-900">
          推し活に年間いくら使ってる？費用の計算方法
        </h1>
        <time className="mt-2 block text-sm text-zinc-400">2026-04-16</time>

        <div className="mt-8 prose prose-zinc prose-lg max-w-none prose-headings:mt-10 prose-headings:mb-4 prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-2 prose-h3:text-xl prose-p:leading-relaxed prose-p:mb-4 prose-li:leading-relaxed prose-a:text-blue-700 hover:prose-a:underline prose-strong:text-zinc-900">
          <div className="rounded-lg bg-purple-50 p-5 mb-8 not-prose">
            <p className="font-bold text-purple-900 mb-2">この記事でわかること</p>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>・推し活にかかる費用の内訳と平均的な金額</li>
              <li>・見落としがちな「隠れコスト」の正体</li>
              <li>・推し活と家計のバランスを取るコツ</li>
            </ul>
          </div>

          <h2>チケット・グッズ・遠征費、合計すると驚く金額になる</h2>
          <p>
            チケット代は覚えている。グッズ代もなんとなくわかる。
            でも交通費、宿泊費、カフェ巡り、配信の投げ銭、推しの誕生日のプレゼント…
            全部を合計するとどうなるか。
          </p>
          <p>
            1つ1つは「これくらいなら」と思える金額でも、
            年間で合計すると驚くような金額になることがあります。
          </p>

          <h2>チケット・グッズ・遠征費・配信 — 4大コストの内訳</h2>

          <h3>チケット代</h3>
          <p>
            ライブやイベントのチケット代は推し活の基本支出です。
            ワンマンライブで3,000〜8,000円、フェスで10,000〜15,000円程度が一般的。
            年間の参加回数が増えるほど、ここが大きくなります。
          </p>

          <h3>グッズ代</h3>
          <p>
            Tシャツ、タオル、アクスタ、ペンライト、写真集…
            1回のイベントで3,000〜10,000円使う方も珍しくありません。
            限定グッズや通販も含めると、年間で数万円〜10万円以上になることも。
          </p>

          <h3>交通費・遠征費</h3>
          <p>
            地方在住のファンにとって、遠征費は最も大きなコストになり得ます。
            新幹線や飛行機代、宿泊費を含めると、1回の遠征で2万〜5万円。
            これが年に数回あると、それだけで10万円を超えます。
          </p>

          <h3>見落としがちなコスト</h3>
          <ul>
            <li><strong>配信サービスの月額</strong>：ファンクラブ、有料配信、サブスクなど月500〜1,000円 × 12ヶ月</li>
            <li><strong>カフェ・コラボイベント</strong>：コラボカフェ1回で2,000〜3,000円</li>
            <li><strong>SNS用の通信費</strong>：推し活のために大容量プランに変えた場合の差額</li>
            <li><strong>時間のコスト</strong>：チケット争奪戦、物販の並び時間、移動時間</li>
          </ul>

          <h2>ライト月5千円、ミドル月2万円、ヘビー月2万円以上</h2>

          <div className="not-prose overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-100">
                  <th className="border border-zinc-200 px-4 py-2 text-left">レベル</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">月額目安</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">年間目安</th>
                  <th className="border border-zinc-200 px-4 py-2 text-left">主な内容</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2">ライト</td>
                  <td className="border border-zinc-200 px-4 py-2">〜5,000円</td>
                  <td className="border border-zinc-200 px-4 py-2">〜6万円</td>
                  <td className="border border-zinc-200 px-4 py-2">配信視聴+年数回のライブ</td>
                </tr>
                <tr className="bg-zinc-50">
                  <td className="border border-zinc-200 px-4 py-2">ミドル</td>
                  <td className="border border-zinc-200 px-4 py-2">5,000〜20,000円</td>
                  <td className="border border-zinc-200 px-4 py-2">6〜24万円</td>
                  <td className="border border-zinc-200 px-4 py-2">ライブ+グッズ+たまに遠征</td>
                </tr>
                <tr>
                  <td className="border border-zinc-200 px-4 py-2">ヘビー</td>
                  <td className="border border-zinc-200 px-4 py-2">20,000円〜</td>
                  <td className="border border-zinc-200 px-4 py-2">24万円〜</td>
                  <td className="border border-zinc-200 px-4 py-2">全通+遠征+グッズ全買い</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>月の予算・推し貯金・優先順位で無理なく続ける</h2>
          <p>
            推し活は生活を豊かにする大切な活動です。
            だからこそ、無理なく続けるために自分の支出を把握しておくことが大切です。
          </p>
          <ul>
            <li><strong>月の予算を決める</strong>：「推し活費は月○円まで」と上限を設定する</li>
            <li><strong>「推し貯金」を作る</strong>：毎月一定額を推し活用に積み立てる</li>
            <li><strong>優先順位をつける</strong>：全部のイベントに行かなくても、推しは応援できる</li>
          </ul>

          <h2>項目別に入力するだけで月額・年間を自動計算</h2>
          <p>
            項目別に推し活の費用を入力すると、月額・年間の合計が自動で計算されるツールを用意しました。
          </p>

          <div className="not-prose my-8 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 p-6 text-center">
            <p className="text-lg font-bold text-zinc-900">
              💜 推し活費計算機
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              費用を項目別に入力するだけで、月額・年間の推し活費を自動計算します
            </p>
            <Link
              href="/oshikatsu"
              className="mt-4 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition"
            >
              無料で計算してみる →
            </Link>
          </div>

          <h2>支出を把握すれば、推しを長く応援し続けられる</h2>
          <p>
            推し活の費用は、項目が多いため全体像が見えにくくなりがちです。
            一度自分の支出を数字で把握すると、
            「ここは減らせる」「ここは大事だから維持」という判断がしやすくなります。
            推しを長く応援し続けるために、まずは自分の数字を知ることから始めてみてください。
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
