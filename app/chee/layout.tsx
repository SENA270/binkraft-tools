import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "チーゲーム | 飲み会・暇つぶしで遊べる無料ワードゲーム (スマホ1台)",
  description:
    "「チー」で終わる言葉を順番に言うだけのパーティゲーム。「悪役っぽく言う」等のしばりお題50種で大喜利化。飲み会・2人の暇つぶし・ドライブに。インストール不要・スマホ1台で無料。",
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
