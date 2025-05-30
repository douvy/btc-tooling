import { TimeFrame, BitcoinPrice } from '@/types';
import { useEffect, useRef, memo } from 'react';
import classNames from 'classnames';
import DesktopPriceDisplay from './DesktopPriceDisplay';
import MediumPriceDisplay from './MediumPriceDisplay';
import MobilePriceDisplay from './MobilePriceDisplay';

interface BitcoinPriceDisplayProps {
  data: BitcoinPrice | null;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  variant?: 'desktop' | 'medium' | 'mobile';
  priceChangeDirection?: 'up' | 'down' | null;
  latency?: number;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

/**
 * Component to display Bitcoin price with animations
 * Delegates to variant-specific display components
 */
function BitcoinPriceDisplay({
  data,
  timeframe,
  onTimeframeChange,
  isLoading,
  error,
  variant = 'desktop',
  priceChangeDirection = null,
  latency = 0,
  connectionStatus = 'connected'
}: BitcoinPriceDisplayProps) {
  // Track previous price for logging
  const prevPriceRef = useRef<number | null>(null);
  
  // Track price changes
  useEffect(() => {
    if (!data) return;
    
    const isSignificantChange = 
      prevPriceRef.current === null || 
      Math.abs(data.price - prevPriceRef.current) >= 1;
      
    if (isSignificantChange) {
      prevPriceRef.current = data.price;
    }
  }, [data, timeframe]);
  
  // Loading skeleton
  if (isLoading && !data) {
    return (
      <div className={classNames(
        "animate-pulse",
        {
          "px-4 py-3": variant === 'desktop',
          "px-2 py-2": variant === 'medium',
          "pb-2": variant === 'mobile'
        }
      )}>
        <div className={classNames(
          "h-8 bg-gray-700 rounded",
          {
            "w-40": variant === 'desktop',
            "w-32": variant === 'medium',
            "w-28": variant === 'mobile'
          }
        )}></div>
        <div className="h-4 bg-gray-700 rounded w-20 mt-2"></div>
      </div>
    );
  }
  
  // Error state (fallback to loading UI)
  if (error && !data) {
    return (
      <div className="animate-pulse px-4 py-2">
        <div className="h-8 bg-gray-700 rounded w-40"></div>
        <div className="h-4 bg-gray-700 rounded w-20 mt-2"></div>
      </div>
    );
  }
  
  // No data yet
  if (!data) {
    return null;
  }

  // Display the appropriate variant
  if (variant === 'desktop') {
    return (
      <DesktopPriceDisplay
        data={data}
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        priceChangeDirection={priceChangeDirection}
        latency={latency}
        connectionStatus={connectionStatus}
      />
    );
  }
  
  if (variant === 'medium') {
    return (
      <MediumPriceDisplay
        data={data}
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        priceChangeDirection={priceChangeDirection}
        latency={latency}
        connectionStatus={connectionStatus}
      />
    );
  }
  
  // Mobile variant
  return (
    <MobilePriceDisplay
      data={data}
      timeframe={timeframe}
      onTimeframeChange={onTimeframeChange}
      priceChangeDirection={priceChangeDirection}
      latency={latency}
      connectionStatus={connectionStatus}
    />
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(BitcoinPriceDisplay);