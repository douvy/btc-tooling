'use client';

import Footer from '@/components/layout/Footer';
import BitcoinPriceDisplay from '@/components/bitcoin/BitcoinPriceDisplay';
import PriceChart from '@/components/bitcoin/PriceChart';
// Use dynamic import for OrderBook to ensure it only runs on client-side
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
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
    username: 'David Marcus',
    handle: 'davidmarcus',
    profileImage: 'sacks.jpg',
    text: 'I can’t keep track of all the companies now racing to accumulate Bitcoin. Only about 1.4 million additional Bitcoin will be created in the next 115 years. It’s going to be so wild.',
    time: '9:47 AM · MAY 27, 2025',
    link: 'https://x.com/davidmarcus/status/1927361082449883233',
    comments: 11,
    retweets: 22,
    likes: 184,
    views: 2944
  },
  {
    id: '2',
    username: 'Watcher.Guru',
    handle: 'WatcherGuru',
    profileImage: 'watcher.png',
    text: 'JUST IN: Trump Media announces $2.5 billion deal to create a Bitcoin treasury.',
    time: '9:16 AM · MAY 27, 2025',
    link: 'https://x.com/WatcherGuru/status/1927353125679010057',
    comments: 553,
    retweets: 1100,
    likes: 7400,
    views: 361700
  },
  {
    id: '3',
    username: 'Jelle',
    handle: 'CryptoJelleNL',
    profileImage: 'jelle.jpg',
    text: 'Global liquidity keeps rising, and #Bitcoin follows suit. \n\nNew target: $150,000. \n\nSend it higher.',
    time: '9:25 AM · MAY 26, 2025',
    image: 'jelle-post.jpg',
    link: 'https://x.com/CryptoJelleNL/status/1926993160531525785',
    comments: 55,
    retweets: 185,
    likes: 1100,
    views: 29900
  },
];

// Tweet Card Component for inline use
interface TweetCardProps {
  tweet: any;
  isLast: boolean;
}

function TweetCard({ tweet, isLast }: TweetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Check if this is a long tweet that needs truncation
  const isLongTweet = tweet.text.length > 280;
  
  // For long tweets, truncate at a reasonable breakpoint
  const truncatePhrase = '"Smart money"';
  const truncateAt = tweet.text.indexOf(truncatePhrase);
  const shouldTruncate = isLongTweet && truncateAt > 0;
  
  // Only truncate specific tweets that have the "Smart money" phrase
  // Include the first few words of the truncated section for better UX
  const initialText = shouldTruncate 
    ? tweet.text.substring(0, truncateAt) + truncatePhrase + ' frontrunning' 
    : tweet.text;
    
  // Skip the words we already included in initialText
  const remainingText = shouldTruncate
    ? tweet.text.substring(truncateAt + truncatePhrase.length + ' frontrunning'.length)
    : '';
    
  // Specific custom spacing for each tweet using inline styles
  const customStyle: { [key: string]: string } = {};
  
  if (tweet.id === '1') {
    // First tweet - 4px more space at bottom
    customStyle.paddingTop = '16px';  
    customStyle.paddingBottom = '30px'; // 16px + 4px extra
    customStyle.marginBottom = '28px';
  } else if (tweet.id === '2') {
    // Second tweet - 8px more space at bottom
    customStyle.paddingTop = '0px';
    customStyle.paddingBottom = '30px'; // 16px + 8px extra
    customStyle.marginBottom = '12px';
  } else if (tweet.id === '3') {
    // Third tweet - 28px more space at top, reduced bottom padding by 4px
    customStyle.paddingTop = '12px';
    customStyle.paddingBottom = '0px'; // Minimum padding
    customStyle.marginBottom = '-4px'; // Use negative margin instead of negative padding
  }

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    // Prevent body scrolling when modal is open
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [modalOpen]);

  // Function to open the modal
  const openImageModal = () => {
    if (tweet.image) {
      setModalOpen(true);
    }
  };

  // Function to close the modal
  const closeImageModal = () => {
    setModalOpen(false);
  };

  return (
    <article className="relative" style={customStyle}>
      {!isLast && <div className="mx-[-1.5rem] md:mx-[-2rem] border-b border-divider absolute bottom-0 left-0 right-0"></div>}
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
            {tweet.link ? (
              <a 
                href={tweet.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tweet.username}
                <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{tweet.handle}</span>
              </a>
            ) : (
              <>
                {tweet.username}
                <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{tweet.handle}</span>
              </>
            )}
          </p>
          <p className="text-[#c2c5cc] text-sm font-gotham-medium mt-1">{tweet.time}</p>
        </div>
      </div>
      
      <div className="text-base mb-2 text-[#b4b8c1]">
        <p className="whitespace-pre-line">
          {initialText}
          <span 
            className={`transition-opacity duration-300 ease-in-out whitespace-pre-line ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden inline-block'}`}
          >
            {expanded && remainingText}
          </span>
          {shouldTruncate && !expanded && '...'}
          {shouldTruncate && !expanded && (
            <button 
              onClick={() => setExpanded(true)}
              className="ml-1 text-primary hover:text-primary/90 font-medium transition-colors duration-1000"
            >
              Show More
            </button>
          )}
        </p>
        
        {shouldTruncate && expanded && (
          <button 
            onClick={() => setExpanded(false)}
            className="text-primary hover:text-primary/90 font-medium transition-colors duration-1000 mt-2"
          >
            Show Less
          </button>
        )}
      </div>
      
      {tweet.image && (
        <div 
          className="mb-4 mt-2 rounded-lg overflow-hidden border border-divider cursor-pointer transform transition-transform hover:scale-[1.01] duration-300"
          onClick={openImageModal}
        >
          <Image 
            src={`/images/${tweet.image}`}
            alt="Tweet image"
            width={600}
            height={400}
            className="w-full h-auto object-cover"
          />
        </div>
      )}
      
      {/* Image Modal */}
      {modalOpen && tweet.image && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeImageModal}>
          <div className="relative bg-main-dark w-full max-w-3xl mx-4 rounded-lg overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button 
              className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-main-dark/80 text-white hover:bg-main-dark transition-colors duration-200"
              onClick={closeImageModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Image */}
            <div className="w-full">
              <Image 
                src={`/images/${tweet.image}`}
                alt="Tweet image"
                width={1200}
                height={800}
                className="w-full h-auto object-contain"
              />
            </div>
            
            {/* Tweet info */}
            <div className="p-6 border-t border-divider">
              <div className="flex items-start mb-4">
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
                    {tweet.link ? (
                      <a 
                        href={tweet.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline"
                      >
                        {tweet.username}
                        <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{tweet.handle}</span>
                      </a>
                    ) : (
                      <>
                        {tweet.username}
                        <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{tweet.handle}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[#c2c5cc] text-sm font-gotham-medium">{tweet.time}</p>
                </div>
              </div>
              
              <p className="text-base mb-4 text-[#b4b8c1] whitespace-pre-line">{tweet.text}</p>
              
              <div className="flex items-center justify-between text-[#8a919e] text-sm font-proxima-nova">
                <div className="flex space-x-6">
                  <span><i className="fa-regular fa-comment mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.comments)}</span>
                  <span><i className="fa-regular fa-retweet mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.retweets)}</span>
                  <span><i className="fa-regular fa-heart mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.likes)}</span>
                  <span><i className="fa-regular fa-chart-simple mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.views)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center text-[#8a919e] text-sm font-proxima-nova">
        <div className="flex space-x-4">
          <span><i className="fa-regular fa-comment mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.comments)}</span>
          <span><i className="fa-regular fa-retweet mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.retweets)}</span>
          <span><i className="fa-regular fa-heart mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.likes)}</span>
          <span><i className="fa-regular fa-chart-simple mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.views)}</span>
        </div>
      </div>
    </article>
  );
}

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
      // Clear the cached data to force a fresh load
      localStorage.removeItem('halvingData');
      
      const response = await fetch('/api/halving', { 
        cache: 'no-store',
        headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh halving data: ${response.status}`);
      }
      
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
            <div className="w-12 h-12 rounded-full flex items-center justify-center mr-3">
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
                <div className="w-12 h-12 rounded-full flex items-center justify-center mr-3">
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
          <div className="flex items-center h-[60px]">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
              </div>
              <h1 className="text-2xl font-fuji-bold">BTC Tooling</h1>
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
          
          <aside className="md:w-[385px] block border-l border-divider" role="complementary"> 
            <div className="h-full overflow-y-auto px-6 pt-6 pb-8 md:px-8 md:pt-6 pb-[60px] md:pb-8">
              <BTCAnalysis 
                date="MAY 21, 2025"
                content={fallbackAnalysisContent}
              />
              <div className="mx-[-1.5rem] md:mx-[-2rem] border-b border-divider mb-12 mt-12 sm:mt-8 mb-12 sm:mb-0"></div>
              <h2 className="text-xl font-fuji-bold mb-6 sm:mt-6 flex items-center">
                BTC 
                <span className="mx-1 flex items-center">
                  <Image 
                    src="/images/x.jpg" 
                    alt="X logo" 
                    width={22} 
                    height={22} 
                    className="inline-block"
                  />
                </span> 
                Insights
              </h2>
              <div className="space-y-0 -mt-4">
                {tweets.map((tweet, index) => (
                  <TweetCard 
                    key={tweet.id} 
                    tweet={tweet} 
                    isLast={index === tweets.length - 1} 
                  />
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