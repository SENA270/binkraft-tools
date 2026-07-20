import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "チーゲーム | 語尾「チー」縛りワードバトル",
  description:
    "「チー」で終わる言葉を交互に言い合うパーティゲーム。しばりお題×制限時間で盛り上がる。スマホ1台で今すぐ無料で遊べます。",
  openGraph: {
    title: "チーゲーム",
    description: "「チー」で終わる言葉を交互に言うだけ。しばりお題で大喜利化する無料パーティゲーム",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function CheeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
