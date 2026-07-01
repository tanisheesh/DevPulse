import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#070b14" },
    { media: "(prefers-color-scheme: light)", color: "#eef1ff" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "DevPulse — AI Developer Productivity",
    template: "%s · DevPulse",
  },
  description:
    "Connect GitHub, get AI standup reports, weekly summaries, and a burnout-risk score from your real commits and PRs.",
  keywords: ["developer productivity", "standup report", "burnout score", "github analytics"],
  authors: [{ name: "Tanish Poddar", url: "https://tanisheesh.in/" }],
  creator: "Tanish Poddar",
  openGraph: {
    title: "DevPulse — AI Developer Productivity",
    description: "Standup reports, burnout score, and weekly summaries from your GitHub activity.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
