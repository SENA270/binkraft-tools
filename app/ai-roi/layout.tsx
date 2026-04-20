import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Subscription ROI Calculator | Is Your AI Tool Worth It?",
  description:
    "Calculate if your AI subscription (ChatGPT, Claude, Gemini, Copilot) is paying for itself. Input your monthly cost and time saved to see your ROI.",
  openGraph: {
    title: "AI Subscription ROI Calculator",
    description: "Is your AI subscription actually worth the money? Calculate your real ROI.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function AiRoiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
