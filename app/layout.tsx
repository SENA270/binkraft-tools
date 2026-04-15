import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "binkraft tools | 無料Web計算ツール",
    template: "%s | binkraft tools",
  },
  description: "シンプルで便利な無料Web計算ツール集",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 font-[family-name:var(--font-noto-sans-jp)]">
        {children}
      </body>
    </html>
  );
}
