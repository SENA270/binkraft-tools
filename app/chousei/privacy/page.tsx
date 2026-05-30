import Link from "next/link";

export const metadata = {
  title: "イツアウ プライバシーポリシー",
  description: "日程調整ツール「イツアウ」の個人情報の取り扱いについて。",
};

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-black text-zinc-900">
        {n}. {title}
      </h2>
      <div className="mt-2 text-sm text-zinc-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link href="/chousei" className="text-sm text-zinc-400 hover:underline">
          ← イツアウにもどる
        </Link>

        <h1 className="mt-4 text-2xl font-black text-zinc-900">プライバシーポリシー</h1>
        <p className="mt-2 text-xs text-zinc-400">最終更新: 2026-05-30</p>

        <p className="mt-4 text-sm text-zinc-700 leading-relaxed">
          日程調整ツール「イツアウ」（以下「本サービス」）は、binkraft（以下「運営者」）が運営しています。
          本サービスは現在、Googleの審査前のテストモードで限定運用しています。
          利用者の個人情報の取り扱いについて以下のとおり定めます。
        </p>

        <Section n={1} title="取得する情報">
          <ul className="list-disc space-y-1 pl-5">
            <li>イベント情報（タイトル・候補日・時間範囲・確定日時・マスター用秘密鍵）</li>
            <li>回答情報（名前・空き時間・任意のひとことコメント）</li>
            <li>
              Google連携を行った利用者から:
              <ul className="mt-1 list-disc space-y-1 pl-5">
                <li>メールアドレス</li>
                <li>Googleカレンダーへのアクセストークン（AES-256-GCMで暗号化して保存）</li>
                <li>Googleカレンダーの「空き／予定あり」情報（予定のタイトルや中身は取得しません）</li>
              </ul>
            </li>
          </ul>
        </Section>

        <Section n={2} title="利用目的">
          <ul className="list-disc space-y-1 pl-5">
            <li>イベントの作成・回答の集計・確定日時の共有</li>
            <li>確定時にマスターから参加者へのGoogleカレンダー招待送信</li>
            <li>回答時の「（仮）」予定のカレンダー書き込みと、確定時の自動削除</li>
            <li>取得したメールアドレスは招待送信および再連携依頼のみに使用</li>
          </ul>
        </Section>

        <Section n={3} title="保存期間">
          <p>
            すべての情報はサーバ（Upstash Redis・東京リージョン）に保存し、
            最終更新から<strong>180日で自動削除</strong>されます。
            利用者の操作によりそれ以前の削除も可能です（第7項参照）。
          </p>
        </Section>

        <Section n={4} title="安全管理措置">
          <ul className="list-disc space-y-1 pl-5">
            <li>Googleアクセストークンは暗号化（AES-256-GCM）して保存</li>
            <li>すべての通信を HTTPS で暗号化</li>
            <li>マスター権限の操作は秘密鍵による認証</li>
            <li>サーバ環境変数の管理は Vercel の暗号化保管に依拠</li>
          </ul>
        </Section>

        <Section n={5} title="第三者提供">
          <p>
            利用者の同意なく第三者に提供しません。
            マスターが確定時に行うGoogleカレンダー招待は、利用者がメールアドレスを提出した同意のもとに送信されます。
            送信先メールアドレスはマスターと本人のみ閲覧可能です。
          </p>
        </Section>

        <Section n={6} title="委託先">
          <ul className="list-disc space-y-1 pl-5">
            <li>Vercel Inc.（ホスティング）</li>
            <li>Upstash Inc.（データ保存・東京リージョン）</li>
            <li>Google LLC（OAuth認証・カレンダーAPI）</li>
          </ul>
        </Section>

        <Section n={7} title="開示・訂正・削除のご請求">
          <p>
            ご自身の情報の開示・訂正・削除のご請求は、下記の連絡先までご連絡ください。
            また、本サービスからは「自分のイツアウ仮押さえを全部消す」「Google連携を解除する」などの操作が可能です。
          </p>
        </Section>

        <Section n={8} title="テストモードについて">
          <p>
            本サービスは現在 Googleのテストモード（Googleによる審査前）で限定運用しています。
            Googleアカウント連携機能を使えるのは、運営者が事前に許可リストに登録した方のみです。
          </p>
        </Section>

        <Section n={9} title="改定">
          <p>本ポリシーは予告なく改定する場合があります。重要な変更がある場合は本ページで告知します。</p>
        </Section>

        <Section n={10} title="運営者・お問い合わせ">
          <ul className="list-none space-y-1">
            <li>運営: binkraft</li>
            <li>連絡先: binkraft.works@gmail.com</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
