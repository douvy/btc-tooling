'use client';

import Footer from '@/components/layout/Footer';
import BitcoinPriceDisplay from '@/components/bitcoin/BitcoinPriceDisplay';
import PriceChart from '@/components/bitcoin/PriceChart';
import OrderBook from '@/components/bitcoin/OrderBook';
import HalvingCountdown from '@/components/bitcoin/HalvingCountdown';
import TwitterFeed from '@/components/social/TwitterFeed';
import { useTimeframe } from '@/hooks/useTimeframe';
import { useLatencyMonitor } from '@/hooks/useLatencyMonitor';

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
          <div className="flex items-center h-[72px]">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                <img src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
              </div>
              <h1 className="text-xl font-fuji-bold">BTC Tooling</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile price display */}
      <div className="md:hidden py-4 px-6">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 mb-6 pl-6 pr-6 md:p-8 pt-0">
              <OrderBook 
                orderBook={mockOrderBook} 
                currentPrice={bitcoinData?.price || 0} 
                priceChange={bitcoinData?.change || 0} 
              />
              
              <HalvingCountdown halvingInfo={halvingInfo} />
            </div>
          </div>
          
          <TwitterFeed tweets={tweets} />
        </div>

        <Footer />
      </main>
    </div>
  );
}