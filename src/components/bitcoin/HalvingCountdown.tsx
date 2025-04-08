import { HalvingInfo } from '@/types';
import { useState } from 'react';

interface HalvingCountdownProps {
  halvingInfo: HalvingInfo;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
}

export default function HalvingCountdown({ 
  halvingInfo, 
  isLoading = false, 
  error = null,
  onRefresh 
}: HalvingCountdownProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      // Add small delay to ensure visual feedback of refresh action
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <section className="rounded-lg overflow-hidden" aria-labelledby="halving-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="halving-title" className="text-xl font-fuji-bold flex items-center">
          Halving Countdown
          {isLoading && (
            <span className="ml-2 text-xs text-[#8a919e] animate-pulse">updating...</span>
          )}
        </h2>
        
        {/* Refresh button */}
        {onRefresh && (
          <button 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            aria-label="Refresh halving data"
            className="text-[#8a919e] hover:text-white transition-colors p-1"
          >
            <i className={`fa-regular fa-arrows-rotate ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true"></i>
          </button>
        )}
      </div>
      
      <div className="flex flex-row items-center justify-between">
        {/* Countdown Circle */}
        <div className="relative w-[180px] h-[180px] mb-6 sm:mb-0 flex-shrink-0" aria-label="Halving countdown timer">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
              {/* Background circle */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#2A2D33" strokeWidth="8" />
              
              {/* Progress circle */}
              <circle 
                cx="50" 
                cy="50" 
                r="42" 
                fill="none" 
                stroke="#FF6600" 
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray="263.9" 
                strokeDashoffset={263.9 * (1 - halvingInfo.progress / 100)} 
              />
            </svg>
          </div>
          
          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-[#8a919e] mb-1 font-fuji-bold">ETR</span>
            <span className="text-2xl font-fuji-bold mb-1">{halvingInfo.daysRemaining}</span>
            <span className="text-base font-medium">Days</span>
            <span className="text-xs text-[#8a919e] mt-1">{halvingInfo.date}</span>
          </div>
        </div>
        
        {/* Enhanced Stats with Icons */}
        <div className="space-y-5 sm:ml-8">
          <div>
            <h3 className="text-[#8a919e] text-sm mb-1 flex items-center font-fuji-bold">
              Blocks Remaining
            </h3>
            <div className="flex items-baseline">
              <p className="text-2xl font-fuji-bold">{halvingInfo.blocksRemaining.toLocaleString()}</p>
              <span className="ml-2 text-xs text-[#8a919e]">blocks</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[#2A2D33] rounded-full h-1.5 mt-2" role="progressbar" aria-valuenow={halvingInfo.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${halvingInfo.progress}%` }} aria-hidden="true"></div>
            </div>
          </div>
          
          <div>
            <h3 className="text-[#8a919e] text-sm mb-1 flex items-center font-fuji-bold">
              Current Reward
            </h3>
            <div className="flex items-baseline">
              <p className="text-2xl font-fuji-bold text-primary">{halvingInfo.currentReward.toFixed(2)}</p>
              <span className="ml-2 text-xl font-gotham-bold">BTC</span>
            </div>
            <p className="text-xs text-[#8a919e] mt-1 font-gotham-medium">Next reward: {halvingInfo.nextReward.toFixed(3)} BTC</p>
          </div>
          
          <div>
            <h3 className="text-[#8a919e] text-sm mb-1 flex items-center font-fuji-bold">
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
      
      {/* Live data indicator */}
      {!error && !isLoading && (
        <div className="mt-4 flex items-center">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse mr-2"></span>
          <span className="text-xs text-[#8a919e]">Live data from blockchain.info</span>
        </div>
      )}
      
      {/* Historical data table */}
      <div className="mt-4 pt-4 border-t border-divider">
        <h3 className="text-base mb-2 font-fuji-bold">Previous Halvings</h3>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-[#141519] rounded p-2 text-center">
            <div className="text-[#8a919e] font-gotham-bold text-base">2012</div>
            <div className="font-medium">50 → 25</div>
          </div>
          <div className="bg-[#141519] rounded p-2 text-center ">
            <div className="text-[#8a919e] font-gotham-bold text-base">2016</div>
            <div className="font-medium">25 → 12.5</div>
          </div>
          <div className="bg-[#141519] rounded p-2 text-center">
            <div className="text-[#8a919e] font-gotham-bold text-base">2020</div>
            <div className="font-medium">12.5 → 6.25</div>
          </div>
        </div>
      </div>
    </section>
  );
}