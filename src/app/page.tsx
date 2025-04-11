'use client';

import Footer from '@/components/layout/Footer';
import BitcoinPriceDisplay from '@/components/bitcoin/BitcoinPriceDisplay';
import PriceChart from '@/components/bitcoin/PriceChart';
// Use dynamic import for OrderBook to ensure it only runs on client-side
import dynamic from 'next/dynamic';
import { useEffect } from 'react';
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
import HalvingCountdown from '@/components/bitcoin/HalvingCountdown';
import BTCAnalysis from '@/components/social/BTCAnalysis';
import { useTimeframe } from '@/hooks/useTimeframe';
import { useLatencyMonitor } from '@/hooks/useLatencyMonitor';
import { useHalvingData } from '@/hooks/useHalvingData';
import { formatCompactNumber } from '@/lib/priceUtils';
import Image from 'next/image';

// Import mock data generator
import { getMockOrderBook } from '@/lib/mockData';

const halvingInfo = {
  daysRemaining: 1084,
  date: 'Mar. 31, 2028',
  blocksRemaining: 158881,
  currentReward: 6.25,
  nextReward: 3.125,
  targetBlock: 1050000,
  progress: 15
};

const fallbackAnalysisContent = `
• BTC Price: ~$76066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).

• Macro Environment: Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.

• Sentiment: CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.`;

const tweets = [
  {
    id: '1',
    username: 'Michael Saylor',
    handle: 'saylor',
    profileImage: 'saylor.jpg',
    text: 'Bitcoin is powered by Chaos.',
    time: '1:00 PM · APR 10, 2025',
    comments: 1500,
    retweets: 1400,
    likes: 14000,
    views: 756500
  },
  {
    id: '2',
    username: 'SalsaTekila',
    handle: 'SalsaTekila',
    profileImage: 'salsa.jpg',
    text: 'The juciest, and most accessible opportunity of the next decade, is buying spot BTC below 100k USD. It will trade above 500K by 2035, probably much higher than current prices by the end of Trump’s term. Don’t get spooked out by Saylor, he can’t be liquidated and likely wins.',
    time: '11:39 AM · APR 10, 2025',
    comments: 26,
    retweets: 5,
    likes: 131,
    views: 8890
  },
  {
    id: '3',
    username: 'Adam Back',
    handle: 'adam3us',
    profileImage: 'back.jpg',
    text: 'The future of finance runs on Bitcoin.',
    time: '7:13 PM · APR 9, 2025',
    comments: 321,
    retweets: 669,
    likes: 5000,
    views: 170000
  },
];

export default function Home() {
  // Use the original hook with Bitcoin price data and real-time 5-second updates
  const { 
    timeframe, 
    setTimeframe, 
    bitcoinData, 
    isLoading, 
    error, 
    isRefreshing,
    priceChangeDirection,
    lastUpdateTime,
    refreshData
  } = useTimeframe('1D');
  
  // Use the latency monitor to track WebSocket connection quality
  const { latency, connectionStatus } = useLatencyMonitor();
  
  // Use the halving data hook
  const { halvingData, isLoading: isHalvingLoading, error: halvingError } = useHalvingData();

  // Update document title with current BTC price
  useEffect(() => {
    if (bitcoinData && bitcoinData.price) {
      // Format price with no decimal places for the title (to save space)
      const formattedPrice = bitcoinData.price.toLocaleString('en-US', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      
      // Set document title with format: "$75,432 - BTC Tooling"
      document.title = `$${formattedPrice} - BTC Tooling`;
    }
  }, [bitcoinData]);

  // Refresh function for manual refresh
  const refreshHalvingData = async () => {
    try {
      const response = await fetch('/api/halving', { 
        cache: 'no-store',
        headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh halving data: ${response.status}`);
      }
      
      // Clear the cached data to force a fresh load
      localStorage.removeItem('halvingData');
      
      // The useHalvingData hook will automatically update on the next render
      window.location.reload(); // Simple refresh to update the UI
    } catch (err) {
      console.error('Failed to manually refresh halving data:', err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop and tablet price displays in Header */}
      <header className="w-full border-b border-divider main-dark lg:sticky lg:top-0 z-20 backdrop-blur-md bg-main-dark bg-opacity-90" role="banner">
        {/* Desktop layout (lg and up) */}
        <div className="hidden lg:flex items-center px-6 h-[80px]">
          {/* Left side with logo */}
          <div className="flex items-center flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
              <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
            </div>
          </div>
          
          {/* Spacer */}
          <div className="flex-grow"></div>
          
          {/* Right side with price display - original API with latency monitor */}
          <div className="flex items-center">
            {/* Use the original Bitcoin price display but enhanced with latency UI */}
            <BitcoinPriceDisplay
              data={bitcoinData}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              error={error}
              variant="desktop"
              priceChangeDirection={priceChangeDirection}
              latency={latency}
              connectionStatus={connectionStatus}
            />
          </div>
        </div>
        
        {/* Medium layout (md to lg) */}
        <div className="hidden md:block lg:hidden px-6">
          {/* Top row with logo */}
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                  <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
                </div>
                <h1 className="text-xl font-fuji-bold">BTC Tooling</h1>
              </div>
            </div>
            
            {/* Bitcoin price display - medium variant */}
            <BitcoinPriceDisplay
              data={bitcoinData}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              error={error}
              variant="medium"
              priceChangeDirection={priceChangeDirection}
              latency={latency}
              connectionStatus={connectionStatus}
            />
          </div>
        </div>
        
        {/* Mobile layout (sm and below) */}
        <div className="md:hidden px-6">
          {/* Top row with logo only */}
          <div className="flex items-center h-[55px]">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3">
                <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
              </div>
              <h1 className="text-xl font-fuji-bold">BTC Tooling</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile price display - with increased padding and space */}
      <div className="md:hidden py-6 px-6">
        <BitcoinPriceDisplay
          data={bitcoinData}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          variant="mobile"
          priceChangeDirection={priceChangeDirection}
          latency={latency}
          connectionStatus={connectionStatus}
        />
      </div>

      <main id="main-content" className="flex-1 flex flex-col" role="main">
        <div className="flex flex-col lg:flex-row overflow-auto">
          <div className="flex-1 overflow-y-auto">
            <PriceChart 
              currentPrice={bitcoinData?.price || 0} 
              timeframe={timeframe} 
            />
            
            {/* Order book always stays in its position on all devices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 mb-6 pl-6 pr-6 md:p-8 pt-0 md:pt-1">
              <OrderBook 
                currentPrice={bitcoinData?.price || 0} 
                priceChange={bitcoinData?.change || 0} 
              />
              
              {/* Halving countdown with conditional visibility based on screen size 
                  Only visible on desktop/tablet (md and up) */}
              <div className="hidden md:block">
                <HalvingCountdown 
                  halvingInfo={halvingData} 
                  isLoading={isHalvingLoading}
                  error={halvingError}
                  onRefresh={refreshHalvingData}
                />
              </div>
            </div>
          </div>
          
          <aside className="md:w-[375px] block border-l border-divider " role="complementary"> 
            <div className="h-full overflow-y-auto px-6 pt-6 pb-8 md:px-8 md:pt-6 md:pb-8">
              <BTCAnalysis 
                date="APR 7, 2025"
                content={fallbackAnalysisContent}
              />
              <div className="mx-[-1.5rem] md:mx-[-2rem] border-b border-divider mb-8 mt-8"></div>
              <h2 className="text-xl font-fuji-bold mb-6">BTC X Insights</h2>
              <div className="space-y-4">
                {tweets.map((tweet, index) => (
                  <article key={tweet.id} className={`${index === tweets.length - 1 ? 'pb-0' : 'border-b border-divider pb-4'}`}>
                    <div className="flex items-start mb-2">
                      <div className="w-10 h-10 rounded-full bg-btc flex-shrink-0 mr-3 overflow-hidden">
                        <Image 
                          src={`/images/${tweet.profileImage}`} 
                          alt={`Profile picture of ${tweet.username}`}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-fuji-bold text-base">
                          {tweet.username}
                          <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{tweet.handle}</span>
                        </p>
                        <p className="text-[#c2c5cc] text-sm font-gotham-medium">{tweet.time}</p>
                      </div>
                    </div>
                    <p className="text-base mb-2 text-[#a6abb5]">{tweet.text}</p>
                    <div className="flex items-center text-[#8a919e] text-sm font-proxima-nova">
                      <div className="flex space-x-4">
                        <span><i className="fa-regular fa-comment mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.comments)}</span>
                        <span><i className="fa-regular fa-retweet mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.retweets)}</span>
                        <span><i className="fa-regular fa-heart mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.likes)}</span>
                        <span><i className="fa-regular fa-chart-simple mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.views)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              
              {/* Mobile-only Halving Countdown - appears after tweets */}
              <div className="md:hidden mt-8">
                {/* Full-width divider to match other section dividers */}
                <div className="mx-[-1.5rem] md:mx-[-2rem] border-t border-divider mb-8"></div>
                <HalvingCountdown 
                  halvingInfo={halvingData} 
                  isLoading={isHalvingLoading}
                  error={halvingError}
                  onRefresh={refreshHalvingData}
                />
              </div>
            </div>
          </aside>
        </div>

        <Footer />
      </main>
    </div>
  );
}