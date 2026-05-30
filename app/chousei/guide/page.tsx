import Link from "next/link";

export const metadata = {
  title: "イツアウの使い方",
  description: "みんなの空いてる時間を集めて、会える日をサッと決める日程調整ツール「イツアウ」の使い方。",
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
        {n}
      </div>
      <div className="flex-1">
        <p className="font-bold text-zinc-800">{title}</p>
        <div className="mt-1 text-sm text-zinc-600">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-black text-zinc-900">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

export default function ChouseiGuidePage() {
  return (
    <main className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/chousei" className="text-sm text-zinc-400 hover:underline">
          ← イツアウにもどる
        </Link>

        <h1 className="mt-4 text-2xl font-black text-zinc-900">イツアウの使い方</h1>
        <p className="mt-2 text-sm text-zinc-600">
          みんなの「空いてる時間」を集めて、いちばん集まれる日時をサッと出す日程調整ツールです。
          登録不要・リンクを送るだけ。
        </p>

        <Section title="主催する人（マスター）">
          <Step n={1} title="イベントを作る">
            イベント名を入れて、候補日を<strong>カレンダーでタップ</strong>して選びます（範囲でまとめて追加も可）。
            入力できる時間の範囲（例 9:00〜23:00）も決めます。
          </Step>
          <Step n={2} title="リンクを共有する">
            作成後に出る「リンクを共有」から、LINEやメールで参加者に送ります。
            <strong>リンクを知っている人だけ</strong>が回答できます。
          </Step>
          <Step n={3} title="結果を見て確定する">
            「みんなの結果」に、全員OK・いちばん集まれる日時が自動で出ます。
            良い日時の<strong>「この日時で確定する」</strong>を押すと、全員に確定が共有されます。
          </Step>
        </Section>

        <Section title="回答する人（メンバー）">
          <Step n={1} title="リンクを開いて名前を入れる">
            送られてきたリンクを開き、自分の名前を入力します。
          </Step>
          <Step n={2} title="空いてる時間を入れる">
            候補日ごとに「何時〜何時なら空いてる」を入れます。入れ方は3通り：
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>手で時間帯を選ぶ</li>
              <li><strong>まとめて設定</strong>：同じ時間帯を曜日（平日・土日など）でまとめて反映</li>
              <li><strong>Googleカレンダー連携</strong>：空いてる時間を自動で取り込み（下の注意参照）</li>
            </ul>
          </Step>
          <Step n={3} title="送信する。あとから直せる">
            「回答を送信」で完了。
            予定が変わったら、<strong>同じリンクを開いて同じ名前で送り直す</strong>と上書きされます（増えません）。
          </Step>
        </Section>

        <Section title="Googleカレンダー連携について">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-zinc-700">
            <p>
              空いてる時間を自動入力できます。取得するのは<strong>「空き／予定あり」だけ</strong>で、
              予定のタイトルや中身は読みません。
            </p>
            <p className="mt-2">
              現在は<strong>招待制（テスト中）</strong>です。使いたい人は、自分のGoogleアドレスをマスターに伝えて
              登録してもらってください。登録していない人も、手入力・まとめて設定で問題なく使えます。
            </p>
          </div>
        </Section>

        <Section title="確定したあと">
          <Step n={1} title="自分のカレンダーに追加">
            確定すると上部に日時が表示され、<strong>「自分のGoogleカレンダーに追加」</strong>から
            ワンタップで自分の予定に入れられます。
          </Step>
        </Section>

        <div className="mt-10 rounded-xl bg-indigo-600 p-5 text-center">
          <p className="text-sm font-bold text-white">さっそく使ってみる</p>
          <Link
            href="/chousei"
            className="mt-2 inline-block rounded-lg bg-white px-4 py-2 text-sm font-bold text-indigo-700"
          >
            イベントを作る
          </Link>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-400">
          <Link href="/chousei/privacy" className="hover:text-indigo-600 hover:underline">
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </main>
  );
}
