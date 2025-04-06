import { TimeFrame, BitcoinPrice } from '@/types';
import { useEffect, useRef, memo } from 'react';
import classNames from 'classnames';
import TimeframeSelector from './TimeframeSelector';
import { formatPrice, normalizeDecimalPlaces } from '@/lib/priceUtils';

interface BitcoinPriceDisplayProps {
  data: BitcoinPrice | null;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  variant?: 'desktop' | 'medium' | 'mobile';
  priceChangeDirection?: 'up' | 'down' | null;
}

/**
 * Component to display Bitcoin price with animations
 * Supports desktop, medium, and mobile layouts
 */
function BitcoinPriceDisplay({
  data,
  timeframe,
  onTimeframeChange,
  isLoading,
  error,
  variant = 'desktop',
  priceChangeDirection = null
}: BitcoinPriceDisplayProps) {
  // Track previous price for logging significant changes
  const prevPriceRef = useRef<number | null>(null);
  
  // Log price changes to console (for debugging)
  useEffect(() => {
    if (!data) return;
    
    const isSignificantChange = 
      prevPriceRef.current === null || 
      Math.abs(data.price - prevPriceRef.current) >= 1;
      
    if (isSignificantChange) {
      console.log(
        `Bitcoin price updated (${timeframe}): $${data.price.toFixed(2)} ` +
        `(${data.direction === 'up' ? '+' : '-'}${data.changePercent.toFixed(2)}%)`
      );
      prevPriceRef.current = data.price;
    }
  }, [data, timeframe]);
  
  // Handle loading state
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
  
  // Handle error state (fallback to loading UI)
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
  
  const isPositiveChange = data.direction === 'up';
  const formattedPrice = formatPrice(data.price);
  const formattedChange = formatPrice(data.change);
  const formattedPercent = data.changePercent.toFixed(2);
  
  // Desktop layout
  if (variant === 'desktop') {
    return (
      <div className="flex items-center space-x-6">
        {/* Desktop Bitcoin Price Display */}
        <div className="flex items-center" aria-live="polite">
          <span 
            className={classNames(
              "text-2xl lg:text-5xl font-fuji-bold flex items-center",
              { 
                "animate-pulse-green": priceChangeDirection === 'up',
                "animate-pulse-red": priceChangeDirection === 'down'
              }
            )}
            aria-label={`Bitcoin price ${formattedPrice} dollars`}
          >
            {formattedPrice}
          </span>
          <span className={`ml-3 text-xl ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
            <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
            <span className="mr-1.5 font-fuji-bold" aria-label={`Price change ${formattedChange} dollars`}>
              ${formattedChange}
            </span>
            <span className="font-fuji-bold" aria-label={`Percentage change ${formattedPercent} percent`}>
              ({formattedPercent}%)
            </span>
          </span>
        </div>
        
        {/* Timeframe selector */}
        <TimeframeSelector timeframe={timeframe} onTimeframeChange={onTimeframeChange} />
      </div>
    );
  }
  
  // Medium layout
  if (variant === 'medium') {
    return (
      <div className="flex flex-col">
        {/* Top row with price */}
        <div className="flex items-center justify-between">
          {/* Price display */}
          <div className="flex items-center" aria-live="polite">
            <span 
              className={classNames(
                "text-2xl font-fuji-bold flex items-center",
                { 
                  "animate-pulse-green": priceChangeDirection === 'up',
                  "animate-pulse-red": priceChangeDirection === 'down',
                  "text-primary": true
                }
              )}
              aria-label={`Bitcoin price ${formattedPrice} dollars`}
            >
              {formattedPrice}
            </span>
            <span className={`ml-2 ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
              <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} ml-1 mr-0.5`} aria-hidden="true"></i>
              <span aria-label={`Percentage change ${formattedPercent} percent`}>
                ({formattedPercent}%)
              </span>
            </span>
          </div>
        </div>
        
        {/* Timeframe selector on second row */}
        <div className="flex justify-center pb-3">
          <TimeframeSelector timeframe={timeframe} onTimeframeChange={onTimeframeChange} variant="medium" />
        </div>
      </div>
    );
  }
  
  // Mobile layout
  return (
    <div className="flex flex-col items-start">
      {/* Timeframe selector row */}
      <div className="flex justify-start pb-3">
        <TimeframeSelector 
          timeframe={timeframe} 
          onTimeframeChange={onTimeframeChange} 
          variant="mobile" 
        />
      </div>
      
      {/* Price row */}
      <div className="flex items-start justify-start" aria-live="polite">
        <span 
          className={classNames(
            "text-4xl font-fuji-bold",
            { 
              "animate-pulse-green": priceChangeDirection === 'up',
              "animate-pulse-red": priceChangeDirection === 'down',
              "text-white": !priceChangeDirection
            }
          )}
          aria-label={`Bitcoin price ${formattedPrice} dollars`}
        >
          {formattedPrice}
        </span>
      </div>
      
      {/* Change row */}
      <div className="flex items-start mt-1" aria-label="Price change">
        <span className={`${isPositiveChange ? 'text-success' : 'text-error'} flex items-center`}>
          <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
          <span className="mr-1.5">
            ${formattedChange}
          </span>
          <span>
            ({formattedPercent}%)
          </span>
        </span>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(BitcoinPriceDisplay);