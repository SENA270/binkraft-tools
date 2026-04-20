import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ガマンの値段 | 日々の我慢、年間いくら？",
  description:
    "コンビニコーヒー、サブスク、タバコ...日々の我慢を金額に変換。年間でいくら節約できるか無料で計算できます。",
  openGraph: {
    title: "ガマンの値段",
    description: "あなたの我慢、年間いくら？ 計算してみよう",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function GamanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
