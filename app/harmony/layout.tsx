import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ハモリメーカー | 歌うだけでハモリのパートを作る",
  description:
    "歌を録音するだけで、キーに合ったハモリのパートを自動で作ります。3度上・3度下・6度上を切り替え、ハモリだけをゆっくり再生して覚えられます。音名表示つき・WAV保存でそのまま送れます。無料・登録不要。",
  openGraph: {
    title: "ハモリメーカー",
    description: "歌うだけでハモリのパートを作成。キーに合わせるので外れません",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function HarmonyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
