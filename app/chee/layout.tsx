import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "チーゲーム | 休み時間に友達と遊べる無料ワードゲーム (スマホ1台)",
  description:
    "「チー」で終わる言葉を順番に言うだけのワードゲーム。「悪役っぽく言う」等のしばりお題50種以上で大喜利化。休み時間・放課後・2人の暇つぶしに。インストール不要・スマホ1台で無料。",
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
