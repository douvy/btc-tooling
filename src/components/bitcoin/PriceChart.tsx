import { TimeFrame } from '@/types';
import { useEffect, useState, useRef } from 'react';
import FallbackChart from './FallbackChart';
import TradingViewIframe from './TradingViewIframe';

interface PriceChartProps {
  currentPrice: number;
  timeframe: TimeFrame;
}

export default function PriceChart({ currentPrice, timeframe }: PriceChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [chartError, setChartError] = useState(false);
  const initialRenderRef = useRef(true);
  const timeframeRef = useRef(timeframe);
  
  // Handle timeframe changes
  useEffect(() => {
    // Update the ref
    timeframeRef.current = timeframe;
    
    // Skip the first render to avoid initial flickering
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    
    // Only reset error states on timeframe change if there's an error
    if (chartError) {
      setChartError(false);
      setIsLoading(true);
    }
  }, [timeframe, chartError]);
  
  return (
    <section className="rounded-xl overflow-hidden mb-6 h-[400px] md:h-[500px] p-6 md:pl-8 md:pr-8 pt-2 bg-transparent" aria-labelledby="chart-title">
      <h2 id="chart-title" className="text-xl font-fuji-bold mb-2 px-4 pt-4 pl-0 mb-6">BTC/USD Bitfinex</h2>
      <div className="w-full h-[calc(100%-50px)] relative bg-transparent">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-10 h-10 border-4 border-[#4CAF50] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {chartError && (
          <div className="absolute inset-0 flex items-center justify-center bg-opacity-50 z-10">
            <div className="text-[#F44336] text-center p-4">
              <p>Unable to load TradingView chart</p>
              <button 
                onClick={() => {
                  setChartError(false);
                  setIsLoading(true);
                }} 
                className="mt-2 px-4 py-2 bg-[#4CAF50] text-white rounded-md text-sm hover:bg-opacity-90"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        <div 
          className="w-full h-full relative bg-transparent" 
          role="img" 
          aria-label="Bitcoin price chart"
        >
          {chartError ? (
            <FallbackChart currentPrice={currentPrice} timeframe={timeframe} />
          ) : (
            // Use the simpler iframe method directly
            <TradingViewIframe 
              timeframe={timeframe}
              onLoaded={() => {
                if (timeframeRef.current === timeframe) {
                  setIsLoading(false);
                }
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}