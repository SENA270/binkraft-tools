import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-618KKVRJ69";

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
  description: "シンプルで便利な無料Web計算ツール集。通勤時間の生涯換算、ガマンの値段、推し活費計算機、会議コスト計算機など。",
  metadataBase: new URL("https://binkraft-tools.vercel.app"),
  verification: {
    google: "qzM2BXyY98YJiXlja_sQ1_34_CgF4irjIFQYxaM-ELU",
  },
  openGraph: {
    siteName: "binkraft tools",
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 font-[family-name:var(--font-noto-sans-jp)]">
        {children}
      </body>
    </html>
  );
}
