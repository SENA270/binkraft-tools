import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "チーゲーム | 語尾「チー」の早撃ちワードバトル（麺屋チー）",
  description:
    "語尾が「チー」で終わる言葉の早撃ちワードバトル。オンラインでランダム対戦・ひとり練習・対面でも。持ち時間30秒＋文字数しばりのスピード勝負。登録不要・スマホで無料。",
  openGraph: {
    title: "麺屋チー — 語尾「チー」の早撃ちワードバトル",
    description: "オンライン対戦・ひとり練習・対面で。持ち時間30秒＋文字数しばりのスピード勝負。登録不要・無料。",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// iOSで入力欄フォーカス時に自動ズームするのを防ぐ(maximumScale=1)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function CheeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ページ全体のバウンド/スクロール連鎖を無効化(チーゲーム配下のみ) */}
      <style>{`html,body{overscroll-behavior:none;}`}</style>
      {children}
    </>
  );
}
