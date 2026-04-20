import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "会議コスト計算機 | この会議、いくら？",
  description:
    "会議の参加人数と平均月給を入力するだけ。リアルタイムで人件費コストを表示します。無駄な会議を可視化。",
  openGraph: {
    title: "会議コスト計算機",
    description: "この会議、いくらかかってる？ リアルタイムで計算",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function MeetingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
