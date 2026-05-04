import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ボーカルリズム入力 | スペースキーで譜面化",
  description:
    "歌いたいリズムをスペースキーで打ち込むだけ。MuseScore 転記用の音符列が出ます。BPM 設定+四つ打ちカウントダウン+4小節録音。",
  openGraph: {
    title: "ボーカルリズム入力",
    description: "歌いたいリズムをスペースキーで打ち込むだけ。MuseScore 転記用",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function VocalRhythmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
