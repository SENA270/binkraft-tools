import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "100マス計算 | やさしい数学のお兄さんと暗算タイムアタック",
  description:
    "たしざん・かけざんの100マス計算を暗算でタイムアタック。自己ベストとランキングに挑戦。登録不要・無料・スマホで遊べる1人用。",
  openGraph: {
    title: "100マス計算 タイムアタック",
    description: "暗算で100問、タイムを競おう。自己ベスト＆ランキングあり。無料・登録不要。",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

// iOSの入力時ズーム防止
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MasuLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ページ全体のバウンド/スクロール連鎖を無効化 */}
      <style>{`html,body{overscroll-behavior:none;}`}</style>
      {children}
    </>
  );
}
