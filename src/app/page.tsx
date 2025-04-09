'use client';

import Footer from '@/components/layout/Footer';
import BitcoinPriceDisplay from '@/components/bitcoin/BitcoinPriceDisplay';
import PriceChart from '@/components/bitcoin/PriceChart';
import OrderBook from '@/components/bitcoin/OrderBook';
import HalvingCountdown from '@/components/bitcoin/HalvingCountdown';
import BTCAnalysis from '@/components/social/BTCAnalysis';
import { useTimeframe } from '@/hooks/useTimeframe';
import { useLatencyMonitor } from '@/hooks/useLatencyMonitor';
import { useHalvingData } from '@/hooks/useHalvingData';
import Image from 'next/image';

// Mock data for non-price components
const mockOrderBook = {
  asks: [
    { price: 83040.88, amount: 0.0020, total: 90500, sum: 1739 },
    { price: 83040.87, amount: 0.0020, total: 90000, sum: 1694 },
    { price: 83040.55, amount: 0.0000, total: 89500, sum: 1543 },
    { price: 83040.53, amount: 0.0005, total: 89000, sum: 1513 },
    { price: 83040.33, amount: 0.0006, total: 88500, sum: 1351 },
    { price: 83040.00, amount: 0.0000, total: 88000, sum: 1230 },
    { price: 83039.72, amount: 0.0000, total: 87500, sum: 883 }
  ],
  bids: [
    { price: 83038.83, amount: 1.4728, total: 83000, sum: 28 },
    { price: 83038.82, amount: 0.0004, total: 82500, sum: 227 },
    { price: 83038.78, amount: 0.0001, total: 82000, sum: 413 },
    { price: 83038.74, amount: 0.0009, total: 81500, sum: 642 },
    { price: 83038.72, amount: 0.0007, total: 81000, sum: 863 },
    { price: 83038.53, amount: 0.0000, total: 80500, sum: 985 },
    { price: 83038.52, amount: 0.0004, total: 80000, sum: 1209 }
  ],
  spread: 0.01
};

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
    username: 'Ansem',
    handle: 'blknoiz06',
    profileImage: 'ansem.jpg',
    text: 'i really dont think you can conjure up a better scenario for when it makes a ton of sense to have a portion of your long term savings in bitcoin.',
    time: '1:59 PM · APR 5, 2025',
    comments: 177,
    retweets: 141,
    likes: 2500,
    views: 34000
  },
  {
    id: '2',
    username: 'Fapital',
    handle: 'Fapital3',
    profileImage: 'fapital.jpg',
    text: 'bitcoin is decoupling from old people assets',
    time: '12:10 PM · APR 4, 2025',
    comments: 33,
    retweets: 68,
    likes: 698,
    views: 24000
  },
  {
    id: '3',
    username: 'Nikita Bier',
    handle: 'nikitabier',
    profileImage: 'nikita.jpg',
    text: 'I think there\'s a non-zero chance we piss off enough countries, decimate foreign demand for treasuries, obliterate the dollar, and everyone realizes that this style of negotiation was a one-way door—and we all switch to Bitcoin.',
    time: '4:28 PM · APR 4, 2025',
    comments: 177,
    retweets: 141,
    likes: 2500,
    views: 229000
  },
  {
    id: '4',
    username: 'Paolo Ardoino 🤖',
    handle: 'paoloardoino',
    profileImage: 'paolo.jpg',
    text: 'Bitcoin is the hedge.',
    time: '9:08 AM · APR 4, 2025',
    comments: 206,
    retweets: 586,
    likes: 4700,
    views: 1100000
  }
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
              <img src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
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
                  <img src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
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
                <img src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 mb-6 pl-6 pr-6 md:p-8 pt-0 md:pt-1">
              <OrderBook 
                orderBook={mockOrderBook} 
                currentPrice={bitcoinData?.price || 0} 
                priceChange={bitcoinData?.change || 0} 
              />
              
              <HalvingCountdown 
                halvingInfo={halvingData} 
                isLoading={isHalvingLoading}
                error={halvingError}
                onRefresh={refreshHalvingData}
              />
            </div>
          </div>
          
          <aside className="md:w-[330px] block border-l border-divider " role="complementary"> 
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
                          <span className="text-[#8a919e] text-base font-fuji-regular"> @{tweet.handle}</span>
                        </p>
                        <p className="text-[#8a919e] text-sm font-gotham-medium">{tweet.time}</p>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{tweet.text}</p>
                    <div className="flex items-center text-[#8a919e] text-sm font-gotham-medium">
                      <div className="flex space-x-4">
                        <span><i className="fa-regular fa-comment mr-1" aria-hidden="true"></i> {tweet.comments}</span>
                        <span><i className="fa-regular fa-retweet mr-1" aria-hidden="true"></i> {tweet.retweets}</span>
                        <span><i className="fa-regular fa-heart mr-1" aria-hidden="true"></i> {tweet.likes}</span>
                        <span><i className="fa-regular fa-chart-simple mr-1" aria-hidden="true"></i> {tweet.views}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <Footer />
      </main>
    </div>
  );
}