'use client';

import Footer from '@/components/layout/Footer';
import PriceChart from '@/components/bitcoin/PriceChart';
import HalvingCountdown from '@/components/bitcoin/HalvingCountdown';
import BTCAnalysis from '@/components/social/BTCAnalysis';
import TwitterFeed from '@/components/social/TwitterFeed';
import AppHeader from '@/components/layout/AppHeader';
import ErrorBoundary from '@/components/layout/ErrorBoundary';
import MarketStats from '@/components/bitcoin/MarketStats';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { featuredTweets } from '@/data/tweetData';
import { useAppContext } from '@/context/AppContext';

// Use dynamic import for OrderBook to ensure it only runs on client-side
const OrderBook = dynamic(() => import('@/components/bitcoin/OrderBook'), {
  ssr: false,
  loading: () => (
    <div className="text-white w-full font-sans animate-pulse p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-fuji-bold">Order Book</h2>
        <div className="w-48 h-8 bg-gray-800 rounded"></div>
      </div>
      <div className="h-64 bg-gray-800 rounded mt-4"></div>
    </div>
  )
});

/**
 * Main page component for the Bitcoin Tooling application
 * 
 * This page includes:
 * - Bitcoin price display with multiple timeframe options
 * - Interactive price chart
 * - Order book visualization
 * - Halving countdown
 * - BTC analysis section with dynamic date
 * - Twitter/X Bitcoin insights
 * 
 * The layout adapts to different screen sizes with responsive design
 * Error boundaries are implemented for each major section
 * 
 * @returns The complete page with all Bitcoin tooling components
 */
export default function Home() {
  // Get all data from the centralized context
  const { 
    bitcoinData, 
    timeframe, 
    setTimeframe,
    isLoading,
    error,
    isRefreshing,
    priceChangeDirection,
    latency,
    connectionStatus,
    halvingData,
    isHalvingLoading,
    halvingError,
    refreshHalvingData,
    setGlobalError,
    updateDocumentTitle
  } = useAppContext();
  
  // Add explicit document title update on price change
  useEffect(() => {
    // This is in addition to the context update, to ensure document title is updated
    if (bitcoinData && bitcoinData.price) {
      updateDocumentTitle(bitcoinData.price);
    }
  }, [bitcoinData, updateDocumentTitle]);

  return (
    <div className="flex min-h-screen flex-col">
      <ErrorBoundary>
        <AppHeader />
      </ErrorBoundary>

      <main id="main-content" className="flex-1 flex flex-col" role="main">
        <div className="flex flex-col lg:flex-row overflow-auto">
          <div className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              <MarketStats />
            </ErrorBoundary>

            <ErrorBoundary>
              <PriceChart
                currentPrice={bitcoinData?.price || 0}
                timeframe={timeframe}
              />
            </ErrorBoundary>
            
            {/* Order book and halving countdown section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 mb-6 pl-6 pr-6 md:p-8 pt-0 md:pt-1">
              <ErrorBoundary>
                <OrderBook 
                  className="order-book-container"
                  ariaLabel="Bitcoin order book from Bitfinex"
                  onError={(error) => setGlobalError(error)}
                />
              </ErrorBoundary>
              
              {/* Halving countdown with conditional visibility based on screen size 
                  Only visible on desktop/tablet (md and up) */}
              <div className="hidden md:block">
                <ErrorBoundary>
                  <HalvingCountdown />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          
          <aside className="md:w-[420px] block border-l border-divider" role="complementary"> 
            <div className="h-full overflow-y-auto px-6 pt-6 pb-[60px] md:px-8 md:pt-6 md:pb-8">
              <ErrorBoundary>
                <BTCAnalysis />
              </ErrorBoundary>
              
              <div className="mx-[-1.5rem] md:mx-[-2rem] border-b border-divider mb-12 mt-12 sm:mt-8 sm:mb-0"></div>
              
              <ErrorBoundary>
                <TwitterFeed tweets={featuredTweets} />
              </ErrorBoundary>
              
              {/* Mobile-only Halving Countdown - appears after tweets */}
              <div className="md:hidden mt-4">
                {/* Full-width divider to match other section dividers */}
                <div className="mx-[-1.5rem] md:mx-[-2rem] border-t border-divider mb-6"></div>
                <ErrorBoundary>
                  <HalvingCountdown />
                </ErrorBoundary>
              </div>
            </div>
          </aside>
        </div>

        <Footer />
      </main>
    </div>
  );
}