import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "通勤時間の生涯換算 | 人生の何年を通勤に使ってる？",
  description:
    "片道の通勤時間を入力するだけ。生涯で通勤に使う時間・日数・年数を計算。あなたの人生の何%が通勤に消えているか可視化します。",
  openGraph: {
    title: "通勤時間の生涯換算",
    description: "あなたの人生、通勤に何年使ってる？ 計算してみよう",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function CommuteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
