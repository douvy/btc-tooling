import type { Metadata } from "next";
import "./globals.css";
import "@/styles/fonts.css";
import Script from "next/script";
import { AppProvider } from '@/context/AppContext';
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Bitcoin Dashboard - Live BTC Price & Market Stats",
  description: "Bitcoin dashboard with live BTC price, market cap, all-time high, and real-time stats. Clean interface for monitoring Bitcoin data.",
  keywords: "bitcoin dashboard, btc dashboard, bitcoin tools, btc tools, live btc price, btc stats",
  metadataBase: new URL('https://btctooling.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Bitcoin Dashboard - Live BTC Price & Stats",
    description: "Bitcoin dashboard with live BTC price, market cap, all-time high, and real-time stats. Clean interface for monitoring Bitcoin data.",
    type: "website",
    url: 'https://btctooling.com',
    images: [
      {
        url: "/images/bg.jpg",
        width: 1344,
        height: 896,
        alt: "Bitcoin Dashboard - BTC Price and Market Stats",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Bitcoin Dashboard - Live BTC Price & Stats",
    description: "Bitcoin dashboard with live BTC price, market cap, all-time high, and real-time stats. Clean interface for monitoring Bitcoin data.",
    images: ['/images/bg.jpg'],
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
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://btctooling.com/#website',
        url: 'https://btctooling.com/',
        name: 'BTC Tooling',
        description: 'Bitcoin dashboard with live BTC price, market cap, all-time high, and real-time stats.',
        inLanguage: 'en-US',
      },
      {
        '@type': 'SoftwareApplication',
        name: 'BTC Tooling',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description: 'Bitcoin dashboard with live BTC price, market cap, all-time high, and real-time stats. Clean interface for monitoring Bitcoin data.',
        url: 'https://btctooling.com',
      },
    ],
  };

  return (
    <html lang="en">
      <body className="bg-main-dark text-white font-proxima-nova leading-relaxed min-h-screen flex flex-col">
        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

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
