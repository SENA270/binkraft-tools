import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "100マス計算の効果とやり方｜今日から無料でできる（大人の脳トレにも）",
  description:
    "100マス計算の効果と正しいやり方、続けるコツを解説。たし算・ひき算・かけ算・わり算を暗算でタイムアタックできる無料ツールつき。子どもの学習にも大人の脳トレにも。登録不要。",
  openGraph: {
    title: "100マス計算の効果とやり方｜今日から無料でできる",
    description: "効果・正しいやり方・続けるコツ。その場で試せる無料ツールつき（たし/ひき/かけ/わり算）。",
    type: "article",
  },
  twitter: { card: "summary_large_image" },
};

export default function MasuBlogPage() {
  return (
    <main className="flex-1 bg-white">
      <article className="mx-auto max-w-2xl px-4 py-10">
        <nav className="text-sm text-zinc-400">
          <Link href="/" className="hover:underline">
            トップ
          </Link>
          {" > "}
          <span className="text-zinc-600">100マス計算の効果とやり方</span>
        </nav>

        <h1 className="mt-6 text-3xl font-black leading-tight text-zinc-900">
          100マス計算の効果とやり方｜今日から無料でできる（大人の脳トレにも）
        </h1>
        <time className="mt-2 block text-sm text-zinc-400">2026-07-28</time>

        <div className="mt-8 prose prose-zinc prose-lg max-w-none prose-headings:mt-10 prose-headings:mb-4 prose-h2:text-2xl prose-h2:border-b prose-h2:border-zinc-200 prose-h2:pb-2 prose-h3:text-xl prose-p:leading-relaxed prose-p:mb-4 prose-li:leading-relaxed prose-a:text-blue-700 hover:prose-a:underline prose-strong:text-zinc-900">
          <div className="rounded-lg bg-sky-50 p-5 mb-8 not-prose">
            <p className="font-bold text-sky-900 mb-2">この記事でわかること</p>
            <ul className="text-sm text-sky-800 space-y-1">
              <li>・100マス計算で得られる3つの効果</li>
              <li>・失敗しない正しいやり方と続けるコツ</li>
              <li>・その場で試せる無料ツール（たし・ひき・かけ・わり算）</li>
            </ul>
          </div>

          <p>
            「計算をもっと速くしたい」「集中力をつけたい」——そんなときに、家庭で手軽に取り組める定番が
            <strong>100マス計算</strong>です。この記事では、100マス計算の効果と正しいやり方、続けるコツを、
            <strong>その場で無料で試せるツール</strong>とあわせて紹介します。子どもの学習はもちろん、
            大人の脳トレにも活用できます。
          </p>

          <h2>100マス計算とは</h2>
          <p>
            縦10×横10のマスに、上の数字と左の数字を組み合わせて計算し、
            できるだけ<strong>速く・正確に</strong>埋めていくトレーニングです。
            たし算・ひき算・かけ算・わり算のバージョンがあります。
            教育者の陰山英男氏が広めた学習法として知られ、
            単純計算をくり返すことで基礎の計算力を鍛えられます。
          </p>

          <h2>100マス計算の3つの効果</h2>
          <h3>1. 計算が「自動化」する</h3>
          <p>
            同じ形の計算を毎日くり返すと、単純計算が「考えなくても答えが出る」状態に近づきます。
            計算に使う頭の負担が減るぶん、文章題や応用問題に集中しやすくなると言われています。
          </p>
          <h3>2. 集中力・処理能力を使う習慣がつく</h3>
          <p>
            制限時間内に一気に解くため、<strong>短時間の集中</strong>を毎日の習慣にできます。
            「まず机に向かう」きっかけづくりとしても取り入れやすいのが特長です。
          </p>
          <h3>3. 成長が「見える」から続けやすい</h3>
          <p>
            毎日タイムを計ると、<strong>タイムが縮んでいく過程</strong>が目に見えます。
            この「できるようになっている実感」が、続けるモチベーションにつながります。
          </p>

          <h2>失敗しない正しいやり方（3ステップ）</h2>
          <div className="not-prose my-6 rounded-lg bg-zinc-100 p-4">
            <ol className="list-decimal list-inside space-y-2 text-zinc-800">
              <li>
                <strong>タイマーを用意</strong>して、スタートと同時に解き始める
              </li>
              <li>
                <strong>決めた順番</strong>（上から下、または左から右）で、迷っても飛ばさず埋める
              </li>
              <li>
                <strong>毎日1回・同じ種目</strong>で。記録をつけて前回のタイムと比べる
              </li>
            </ol>
          </div>
          <p>
            ポイントは「<strong>速さより、まず毎日</strong>」。習慣になってから、少しずつタイム短縮を狙いましょう。
            うまくいかない日があっても気にせず、続けることを優先します。
          </p>

          <h2>まずは無料でやってみる（登録不要）</h2>
          <p>
            文章で読むより、1回やってみるのが一番です。下のツールは
            <strong>登録不要・スマホでそのまま</strong>遊べます。たし算・ひき算・かけ算・わり算を選べて、
            <strong>タイム計測・自己ベスト記録・ランキング</strong>にも対応しています。
          </p>
          <div className="not-prose my-6 rounded-xl bg-gradient-to-b from-sky-100 to-sky-50 border border-sky-200 p-6 text-center">
            <p className="text-lg font-bold text-sky-900 mb-1">100マス計算をやってみる</p>
            <p className="text-sm text-sky-800 mb-4">たし・ひき・かけ・わり算／タイム＆自己ベスト／無料・登録不要</p>
            <Link
              href="/masu"
              className="inline-block rounded-lg bg-sky-500 px-6 py-3 font-black text-white hover:bg-sky-600 transition-colors"
            >
              無料でスタート
            </Link>
          </div>
          <p>
            毎日1回、タイムが縮んでいくのを記録していくと、続けやすくなります。
          </p>

          <h2>大人の脳トレにも使える</h2>
          <p>
            100マス計算は子ども向けの印象がありますが、
            暗算を制限時間で一気に解く負荷は、<strong>大人の集中力の切り替え</strong>にも向いています。
            仕事前の頭の準備運動や、スキマ時間の脳トレとして取り入れる人もいます。
          </p>

          <h2>続けるコツ</h2>
          <ul>
            <li>
              <strong>まずはたし算から</strong>。慣れたらひき算・かけ算・わり算へ広げると飽きにくいです。
            </li>
            <li>
              <strong>記録を残す</strong>。自己ベスト更新を目標にすると、1日1回の動機になります。
            </li>
            <li>
              <strong>短くていい</strong>。1回1〜3分。長さより毎日の回数を優先します。
            </li>
          </ul>

          <h2>よくある質問</h2>
          <h3>いつまで続ければいい？</h3>
          <p>
            目安は「タイムが伸び止まる」まで。基礎が固まったら、文章題など次の段階に進むのがおすすめです。
          </p>
          <h3>大人でも効果はある？</h3>
          <p>
            集中力の切り替えや脳トレとして活用できます。無理のない範囲で、毎日の習慣にするのが続けるコツです。
          </p>
          <h3>何算からやればいい？</h3>
          <p>
            まずは<strong>たし算</strong>から。慣れてきたらひき算・かけ算・わり算へ広げていきましょう。
          </p>

          {/* 収益: 社長のASP登録後、ここに「もっと体系的に学ぶなら（タブレット学習/そろばん）」の
              資料請求アフィリを1〜2箇所。追加時は冒頭に「※本ページはアフィリエイト広告を利用しています」を必須表記。
              推薦する商品は事前にレビュー/サクラチェック済みのもののみ。 */}

          <hr className="my-10 border-zinc-200" />
          <p className="text-sm text-zinc-500">
            まずは1回、
            <Link href="/masu" className="text-blue-700 hover:underline">
              無料の100マス計算
            </Link>
            を試してみてください。今日のタイムを記録するところから始めましょう。
          </p>
        </div>
      </article>
    </main>
  );
}
