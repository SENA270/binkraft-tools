import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "推し活 生涯総額計算機 | 一生でいくら使う？",
  description:
    "今の推し活ペースで一生続けたら、総額いくら？年齢と月額を入れるだけで生涯の推し活費がわかります。",
  openGraph: {
    title: "推し活 生涯総額計算機",
    description: "今のペースで推し続けたら、一生でいくら使う？",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function OshikatsuLifetimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
