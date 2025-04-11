import type { Metadata } from "next";
import "./globals.css";
import "@/styles/fonts.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "BTC Tooling",
  description: "A Bitcoin dashboard providing real-time price data, chart, market summary, orderbook, X insights and halving countdown data",
  keywords: "bitcoin, BTC, cryptocurrency, crypto market, bitcoin price, halving",
  openGraph: {
    title: "BTC Tooling - Bitcoin Market Tools",
    description: "A Bitcoin dashboard providing real-time price data, chart, market summary, orderbook, X insights and halving countdown data",
    type: "website",
    images: [
      {
        url: "/images/bg.jpg",
        width: 1344,
        height: 896,
        alt: "BTC Tooling Dashboard",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-main-dark text-white font-proxima-nova leading-relaxed min-h-screen flex flex-col">
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
