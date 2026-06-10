import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Rogue Agent Detection // SuperAI Hackathon 2026",
  description: "Neural discrepancy scanner — detecting agentic anomalies through proactive intuition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrains.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
