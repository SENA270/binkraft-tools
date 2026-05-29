import type { Metadata } from "next";

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

export default function ChouseiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
