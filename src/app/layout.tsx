import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rogue PSLE Agent Detection | SuperAI Hackathon 2026",
  description: "Detecting agentic discrepancies using proactive intuition",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
