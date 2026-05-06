import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ドラムMIDIエディタ | Web上でドラムパターンを編集",
  description:
    "MIDIファイルを読み込んでドラムパターンをブラウザ上で編集。グリッド入力・ベロシティ調整・再生プレビュー・MIDIエクスポート対応。",
  openGraph: {
    title: "ドラムMIDIエディタ",
    description:
      "MIDIファイルを読み込んでドラムパターンをブラウザ上で編集・再生・エクスポート",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function DrumEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
