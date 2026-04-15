import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "推し活費計算機 | 推しにいくら使ってる？",
  description:
    "チケット・グッズ・交通費・サブスク...推し活にかかる費用を月額・年額で計算。シェア機能付き。",
  openGraph: {
    title: "💜 推し活費計算機",
    description: "推しにいくら使ってる？ 正直に計算してみよう",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function OshikatsuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
