import { TimeFrame, BitcoinPrice } from '@/types';
import { useEffect, useRef, memo, useState } from 'react';
import classNames from 'classnames';
import TimeframeSelector from './TimeframeSelector';
import { formatPrice, normalizeDecimalPlaces, calculateDollarChange } from '@/lib/priceUtils';

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
  const prevPriceRef = useRef<{price: number, timeframe: TimeFrame} | null>(null);
  
  // Add state for real-time price calculations
  const [priceData, setPriceData] = useState<{
    currentPrice: number;
    previousPrice: number | null;
    percentChange: number;
    dollarChange: number;
    isPositiveChange: boolean;
  }>({
    currentPrice: 0,
    previousPrice: null,
    percentChange: 0,
    dollarChange: 0,
    isPositiveChange: true
  });
  
  // Log price changes to console (for debugging)
  useEffect(() => {
    if (!data) return;
    
    // Check if we've switched timeframes or have a significant price change
    const isNewTimeframe = 
      !prevPriceRef.current || 
      prevPriceRef.current.timeframe !== timeframe;
      
    const isSignificantChange = 
      !prevPriceRef.current || 
      Math.abs(data.price - prevPriceRef.current.price) >= 1;
      
    if (isNewTimeframe || isSignificantChange) {
      // Only log if this is a real change, not just a component re-render
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `Bitcoin price ${isNewTimeframe ? 'timeframe change' : 'updated'} (${timeframe}): $${data.price.toFixed(2)} ` +
          `(${data.direction === 'up' ? '+' : '-'}${data.changePercent.toFixed(2)}%)`
        );
      }
      
      // Update reference with current values
      prevPriceRef.current = {
        price: data.price,
        timeframe
      };
    }
  }, [data, timeframe]);
  
  // Update price data whenever the incoming data changes - track actual movement from previous price
  useEffect(() => {
    if (!data) return;
    
    const currentPrice = data.price;
    
    // Update with price movement relative to previous observed price
    setPriceData(prevPriceData => {
      // If this is the first update or timeframe changed, just record the price without showing movement
      if (prevPriceData.previousPrice === null || prevPriceData.currentPrice === 0 || timeframe !== prevPriceRef.current?.timeframe) {
        return {
          currentPrice: currentPrice,
          previousPrice: currentPrice, // Initially, previous = current (no change)
          percentChange: 0,
          dollarChange: 0,
          isPositiveChange: true // Default (doesn't matter since change is 0)
        };
      }
      
      // Calculate actual movement from previous price
      const previousPrice = prevPriceData.previousPrice;
      const dollarChange = Math.abs(currentPrice - previousPrice);
      const isPositiveChange = currentPrice > previousPrice;
      
      // Calculate percentage change relative to previous price
      const percentChange = previousPrice > 0 
        ? (dollarChange / previousPrice) * 100 
        : 0;
      
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Actual price movement calculated:', {
          previousPrice: previousPrice.toFixed(2),
          currentPrice: currentPrice.toFixed(2),
          dollarChange: dollarChange.toFixed(2),
          percentChange: percentChange.toFixed(2) + '%',
          direction: isPositiveChange ? 'up' : 'down',
          timeframe,
          timestamp: new Date().toISOString()
        });
      }
      
      // Return new state with change calculation
      return {
        currentPrice,
        previousPrice: currentPrice, // Update previous to current for next change
        dollarChange,
        percentChange,
        isPositiveChange
      };
    });
  }, [data, timeframe]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear references to prevent memory leaks
      prevPriceRef.current = null;
    };
  }, []);
  
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
  
  // Prepare display values - use our price change calculations
  const { currentPrice, percentChange, dollarChange, isPositiveChange } = priceData;
  const formattedPrice = formatPrice(currentPrice);
  
  // Format dollar change and percentage
  const formattedChange = formatPrice(dollarChange);
  const formattedPercent = percentChange.toFixed(2);
  
  // Use actual direction indicator for CSS classes and icon
  // This matches the red/green colors to actual price movement, not timeframe data
  const changeDirection = isPositiveChange ? 'up' : 'down';
  
  // Desktop layout
  if (variant === 'desktop') {
    return (
      <div className="flex items-center space-x-6">
        {/* Desktop Bitcoin Price Display */}
        <div className="flex items-center" aria-live="polite">
          <span 
            className={classNames(
              "text-2xl lg:text-5xl font-fuji-bold flex items-center transition-colors duration-300",
              { 
                "animate-pulse-green": priceChangeDirection === 'up',
                "animate-pulse-red": priceChangeDirection === 'down',
                "text-primary": !priceChangeDirection
              }
            )}
            aria-label={`Bitcoin price ${formattedPrice} dollars`}
            data-price-direction={priceChangeDirection || 'stable'}
          >
            {formattedPrice}
          </span>
          <span 
            className={classNames(
              "ml-3 text-xl flex items-center self-center transition-colors duration-300",
              {
                "text-success": isPositiveChange,
                "text-error": !isPositiveChange
              }
            )}
            data-change-direction={changeDirection}
          >
            <i 
              className={`fa-solid fa-arrow-${changeDirection} mr-2 transition-transform duration-300`} 
              aria-hidden="true"
            ></i>
            <span 
              className="mr-1.5 font-fuji-bold transition-all duration-300" 
              aria-label={`Price change ${formattedChange} dollars`}
            >
              ${formattedChange}
            </span>
            <span 
              className="font-fuji-bold transition-all duration-300" 
              aria-label={`Percentage change ${formattedPercent} percent`}
            >
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
                "text-2xl font-fuji-bold flex items-center transition-colors duration-300",
                { 
                  "animate-pulse-green": priceChangeDirection === 'up',
                  "animate-pulse-red": priceChangeDirection === 'down',
                  "text-primary": true
                }
              )}
              aria-label={`Bitcoin price ${formattedPrice} dollars`}
              data-price-direction={priceChangeDirection || 'stable'}
            >
              {formattedPrice}
            </span>
            <span 
              className={classNames(
                "ml-2 flex items-center self-center transition-colors duration-300",
                {
                  "text-success": isPositiveChange,
                  "text-error": !isPositiveChange
                }
              )}
              data-change-direction={changeDirection}
            >
              <i 
                className={`fa-solid fa-arrow-${changeDirection} ml-1 mr-0.5 transition-transform duration-300`} 
                aria-hidden="true"
              ></i>
              <span 
                className="transition-all duration-300"
                aria-label={`Percentage change ${formattedPercent} percent`}
              >
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
            "text-4xl font-fuji-bold transition-colors duration-300",
            { 
              "animate-pulse-green": priceChangeDirection === 'up',
              "animate-pulse-red": priceChangeDirection === 'down',
              "text-white": !priceChangeDirection
            }
          )}
          aria-label={`Bitcoin price ${formattedPrice} dollars`}
          data-price-direction={priceChangeDirection || 'stable'}
        >
          {formattedPrice}
        </span>
      </div>
      
      {/* Change row */}
      <div className="flex items-start mt-1" aria-label="Price change">
        <span 
          className={classNames(
            "flex items-center transition-colors duration-300",
            {
              "text-success": isPositiveChange,
              "text-error": !isPositiveChange
            }
          )}
          data-change-direction={changeDirection}
        >
          <i 
            className={`fa-solid fa-arrow-${changeDirection} mr-2 transition-transform duration-300`} 
            aria-hidden="true"
          ></i>
          <span className="mr-1.5 transition-all duration-300">
            ${formattedChange}
          </span>
          <span className="transition-all duration-300">
            ({formattedPercent}%)
          </span>
        </span>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
// Only re-render when props actually change
export default memo(BitcoinPriceDisplay, (prevProps, nextProps) => {
  // Always re-render if loading state changes
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  
  // Always re-render if error state changes
  if (prevProps.error !== nextProps.error) return false;
  
  // Always re-render if animation state changes
  if (prevProps.priceChangeDirection !== nextProps.priceChangeDirection) return false;
  
  // Always re-render if timeframe changes
  if (prevProps.timeframe !== nextProps.timeframe) return false;
  
  // Re-render if data changes or transitions from null
  if (prevProps.data === null || nextProps.data === null) {
    return prevProps.data === nextProps.data;
  }
  
  // Deep comparison of Bitcoin price data
  return (
    prevProps.data.price === nextProps.data.price &&
    prevProps.data.change === nextProps.data.change &&
    prevProps.data.changePercent === nextProps.data.changePercent &&
    prevProps.data.direction === nextProps.data.direction
  );
});