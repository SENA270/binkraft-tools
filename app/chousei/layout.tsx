import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "日程の被り調整 | 何時から空いてる？で予定を決める",
  description:
    "候補日に「何時〜何時なら空いてる」を入れるだけ。全員の被ってる時間帯を自動で算出。ダメな日は×でOK。ログイン不要・URL共有。",
  openGraph: {
    title: "日程の被り調整ツール",
    description: "時間帯の被りを自動で見つける。調整さんの「で、何時にする？」を解決。",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// iOS Safari は入力欄(文字<16px)にフォーカスすると自動ズームする。
// このツールはフォーム主体なので、調整ページに限り最大倍率を固定してズームを抑止する。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ChouseiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
