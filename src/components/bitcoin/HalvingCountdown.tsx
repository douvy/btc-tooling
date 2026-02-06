import { HalvingInfo } from '@/types';
import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';

/**
 * Props for the HalvingCountdown component
 * All props are optional as data can be fetched from context
 */
interface HalvingCountdownProps {
  halvingInfo?: HalvingInfo;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
}

export default function HalvingCountdown({ 
  halvingInfo: propHalvingInfo, 
  isLoading: propIsLoading, 
  error: propError,
  onRefresh: propOnRefresh 
}: HalvingCountdownProps) {
  // Get data from context if not provided via props
  const { 
    halvingData: contextHalvingData,
    isHalvingLoading: contextIsLoading,
    halvingError: contextError,
    refreshHalvingData: contextRefreshData
  } = useAppContext();

  // Use props if provided, otherwise use context values
  const halvingInfo = propHalvingInfo || contextHalvingData;
  const isLoading = propIsLoading !== undefined ? propIsLoading : contextIsLoading;
  const error = propError || contextError;
  const onRefresh = propOnRefresh || contextRefreshData;

  // Guard against missing data
  if (!halvingInfo) {
    return (
      <div className="rounded-sm overflow-hidden p-4 bg-dark-card animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-800 rounded mb-4"></div>
        <div className="h-12 bg-gray-800 rounded"></div>
      </div>
    );
  }
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      
      // No need to clear localStorage cache here anymore
      // The hook's refreshData function now handles this
      
      // Call the onRefresh function provided by the parent
      await onRefresh();
      
      // Add small delay to ensure visual feedback of refresh action
      // This is important for UX even if data loads quickly
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  return (
    <section className="rounded-sm overflow-hidden" aria-labelledby="halving-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="halving-title" className="text-xl font-semibold flex items-center mt-6 sm:mt-4">
          Halving Countdown
          {isLoading && (
            <span className="ml-2 text-xs text-muted animate-pulse">updating...</span>
          )}
        </h2>
        
        {/* Refresh button with proper loading state */}
        {!!onRefresh && (
          <button 
            onClick={handleRefresh} 
            disabled={isLoading || isRefreshing}
            className={`flex items-center justify-center p-1 rounded-sm transition-colors ${
              isRefreshing || isLoading
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-muted hover:text-white hover:bg-gray-800'
            }`}
            aria-label="Refresh halving data"
            title="Refresh halving data"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex flex-row items-center justify-between">
        {/* Blockchain-style Countdown Block - Refined */}
        <div className="relative w-[180px] h-[180px] mb-6 sm:mb-0 flex-shrink-0" aria-label="Halving countdown timer">
          {/* Main container with refined styling */}
          <div className="absolute inset-0 rounded-lg overflow-hidden shadow-inner" style={{ backgroundColor: '#141519' }}>
            {/* Progress indicators - clean lines */}
            <div className="absolute inset-0">
              {/* Top progress bar */}
              <div className="absolute top-0 left-0 h-[2px] bg-transparent"
                style={{ width: `${halvingInfo.progress}%` }}></div>
                
              {/* Left side progress */}
              <div className="absolute top-0 left-0 w-[2px] bg-transparent"
                style={{ height: `${Math.min(100, halvingInfo.progress * 4)}%` }}></div>
              
              {/* Bottom progress - only visible after 25% */}
              {halvingInfo.progress >= 25 && (
                <div className="absolute bottom-0 left-0 h-[2px] bg-transparent"
                  style={{ width: `${Math.min(100, (halvingInfo.progress - 25) * 4/3)}%` }}></div>
              )}
              
              {/* Right side progress - only visible after 75% */}
              {halvingInfo.progress >= 75 && (
                <div className="absolute right-0 bottom-0 w-[2px] bg-transparent"
                  style={{ height: `${Math.min(100, (halvingInfo.progress - 75) * 4)}%` }}></div>
              )}
            </div>
            
            {/* Inner content with improved typography */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm text-secondary mb-2 font-semibold uppercase tracking-wider">ETR</span>
              <div className="flex flex-col items-center">
                <span className="text-5xl font-fuji-bold text-white leading-none">{halvingInfo.daysRemaining}</span>
                <span className="text-sm text-secondary mt-2">Days</span>
              </div>
              
              {/* Bottom date with refined styling */}
              <div className="mt-6 border-t border-card-border pt-2 px-4 w-full text-center">
                <span className="text-xs text-secondary font-medium">{halvingInfo.date}</span>
              </div>
            </div>
          </div>
        </div>
              
        {/* Enhanced Stats with Icons */}
        <div className="space-y-5 sm:ml-8">
          <div>
            <h3 className="text-secondary text-sm mb-1 flex items-center font-semibold">
              Blocks Remaining
            </h3>
            <div className="flex items-baseline">
              <p className="text-2xl font-fuji-bold">{halvingInfo.blocksRemaining.toLocaleString()}</p>
              <span className="ml-2 text-xs text-muted">blocks</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-divider rounded-full h-1.5 mt-2" role="progressbar" aria-valuenow={halvingInfo.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${halvingInfo.progress}%` }} aria-hidden="true"></div>
            </div>
          </div>
          
          <div>
            <h3 className="text-secondary text-sm mb-1 flex items-center font-semibold">
              Current Reward
            </h3>
            <div className="flex items-baseline">
              <p className="text-2xl font-fuji-bold text-primary">{halvingInfo.currentReward}</p>
              <span className="ml-2 text-xl font-semibold">BTC</span>
            </div>
            <p className="text-xs text-secondary mt-1 font-semibold">Next reward: <span className="text-white">{halvingInfo.nextReward} BTC</span></p>
          </div>
          
          <div>
            <h3 className="text-secondary text-sm mb-1 flex items-center font-semibold">
              Target Block
            </h3>
            <div className="flex items-baseline">
              <p className="text-base font-medium">{halvingInfo.targetBlock.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Show error message if there's an error */}
      {error && (
        <div className="mt-4 text-error text-sm">
          <p>Error retrieving live halving data. Using cached or fallback data.</p>
        </div>
      )}
      
      {/* Historical data table */}
      <div className="mt-4 pt-4">
        <h3 className="text-base mb-2 font-semibold">Previous Halvings</h3>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-card-bg rounded-lg p-2 text-center">
            <div className="text-secondary font-semibold text-base">2012</div>
            <div className="font-medium mt-1">50 → 25</div>
          </div>
          <div className="bg-card-bg rounded-lg p-2 text-center ">
            <div className="text-secondary font-semibold text-base">2016</div>
            <div className="font-medium mt-1">25 → 12.5</div>
          </div>
          <div className="bg-card-bg rounded-lg p-2 text-center">
            <div className="text-secondary font-semibold text-base">2020</div>
            <div className="font-medium mt-1">12.5 → 6.25</div>
          </div>
          <div className="bg-card-bg rounded-lg p-2 text-center">
            <div className="text-secondary font-semibold text-base">2024</div>
            <div className="font-medium mt-1">6.25 → 3.125</div>
          </div>
        </div>
      </div>
    </section>
  );
}