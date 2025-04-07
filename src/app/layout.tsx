import type { Metadata } from "next";
import "./globals.css";
import "@/styles/fonts.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "BTC Tooling",
  description: "Live Bitcoin Price, Charts, Orderbook, Halving Countdown - Analyze BTC market data in real-time",
  keywords: "bitcoin, BTC, cryptocurrency, crypto market, bitcoin price, halving",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-main-dark text-white font-archivo leading-tight min-h-screen flex flex-col">
        {/* Load Font Awesome Pro kit */}
        <Script
          src="https://kit.fontawesome.com/7f8f63cf7a.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        
        {/* Skip to main content link */}
        <a href="#main-content" className="skip-to-content">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
