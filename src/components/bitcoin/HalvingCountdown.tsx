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
      // Clear localStorage cache for halvingData
      localStorage.removeItem('halvingData');
      await onRefresh();
      // Add small delay to ensure visual feedback of refresh action
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <section className="rounded-sm overflow-hidden" aria-labelledby="halving-title">
      <div className="flex items-center justify-between mb-4">
        <h2 id="halving-title" className="text-xl font-fuji-bold flex items-center mt-6 sm:mt-4">
          Halving Countdown
          {isLoading && (
            <span className="ml-2 text-xs text-[#8a919e] animate-pulse">updating...</span>
          )}
        </h2>
      </div>
      
      <div className="flex flex-row items-center justify-between">
        {/* Blockchain-style Countdown Block - Refined */}
        <div className="relative w-[180px] h-[180px] mb-6 sm:mb-0 flex-shrink-0" aria-label="Halving countdown timer">
          {/* Main container with refined styling */}
          <div className="absolute inset-0 rounded-sm overflow-hidden bg-[#14151A] shadow-inner">
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
              <span className="text-xs text-[#8a919e] mb-2 font-fuji-bold uppercase tracking-wider">ETR</span>
              <div className="flex flex-col items-center">
                <span className="text-5xl font-fuji-bold text-white leading-none">{halvingInfo.daysRemaining}</span>
                <span className="text-sm text-[#a6abb5] mt-1">Days</span>
              </div>
              
              {/* Bottom date with refined styling */}
              <div className="mt-6 border-t border-[#21232A] pt-2 px-4 w-full text-center">
                <span className="text-xs text-[#8a919e] font-medium">{halvingInfo.date}</span>
              </div>
            </div>
          </div>
        </div>
              
        {/* Enhanced Stats with Icons */}
        <div className="space-y-5 sm:ml-8">
          <div>
            <h3 className="text-[#b4b8c1] text-sm mb-1 flex items-center font-fuji-bold">
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
            <h3 className="text-[#b4b8c1] text-sm mb-1 flex items-center font-fuji-bold">
              Current Reward
            </h3>
            <div className="flex items-baseline">
              <p className="text-2xl font-fuji-bold text-primary">{halvingInfo.currentReward.toFixed(2)}</p>
              <span className="ml-2 text-xl font-gotham-bold">BTC</span>
            </div>
            <p className="text-xs text-[#d0d2d8] mt-1 font-fuji-bold">Next reward: {halvingInfo.nextReward.toFixed(3)} BTC</p>
          </div>
          
          <div>
            <h3 className="text-[#b4b8c1] text-sm mb-1 flex items-center font-fuji-bold">
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
        <h3 className="text-base mb-2 font-fuji-bold">Previous Halvings</h3>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-[#141519] rounded p-2 text-center">
            <div className="text-[#b4b8c1] font-gotham-bold text-base">2012</div>
            <div className="font-medium">50 → 25</div>
          </div>
          <div className="bg-[#141519] rounded p-2 text-center ">
            <div className="text-[#b4b8c1] font-gotham-bold text-base">2016</div>
            <div className="font-medium">25 → 12.5</div>
          </div>
          <div className="bg-[#141519] rounded p-2 text-center">
            <div className="text-[#b4b8c1] font-gotham-bold text-base">2020</div>
            <div className="font-medium">12.5 → 6.25</div>
          </div>
          <div className="bg-[#141519] rounded p-2 text-center">
            <div className="text-[#b4b8c1] font-gotham-bold text-base">2024</div>
            <div className="font-medium">6.25 → 3.125</div>
          </div>
        </div>
      </div>
    </section>
  );
}