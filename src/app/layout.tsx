import type { Metadata } from "next";
import "./globals.css";
import "@/styles/fonts.css";
import Script from "next/script";
import { AppProvider } from '@/context/AppContext';
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Free Bitcoin Dashboard - Live BTC Price, Analysis & Market Insights",
  description: "Free Bitcoin dashboard with live BTC price tracking, market analysis, trading insights, and real-time data. Clean, ad-free interface for monitoring Bitcoin markets.",
  keywords: "bitcoin dashboard, btc dashboard, free bitcoin dashboard, bitcoin market analysis, bitcoin price tracker, live btc price, bitcoin trading insights",
  openGraph: {
    title: "Free Bitcoin Dashboard - Live BTC Price & Market Analysis",
    description: "Free Bitcoin dashboard with live BTC price tracking, market analysis, trading insights, and real-time data. Clean, ad-free interface for monitoring Bitcoin markets.",
    type: "website",
    images: [
      {
        url: "/images/bg.jpg",
        width: 1344,
        height: 896,
        alt: "Free Bitcoin Dashboard - BTC Price and Market Analysis",
      },
    ],
  },
};

// Client-side wrapper to provide context
function Providers({ children }: { children: React.ReactNode }) {
  'use client';
  return <AppProvider>{children}</AppProvider>;
}

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
        
        {/* Global state provider - wrapped in client component */}
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
