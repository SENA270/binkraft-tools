import type { Metadata } from "next";

// イベントページは「リンクを知ってる人だけ」。検索に出さない(調整さんと同方針)。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ChouseiEventLayout({ children }: { children: React.ReactNode }) {
  return children;
}
