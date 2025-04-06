import { TimeFrame, BitcoinPrice } from '@/types';
import { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';
import TimeframeSelector from './TimeframeSelector';

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

export default function BitcoinPriceDisplay({
  data,
  timeframe,
  onTimeframeChange,
  isLoading,
  isRefreshing,
  error,
  variant = 'desktop',
  priceChangeDirection = null
}: BitcoinPriceDisplayProps) {
  // For debug purposes - only log when price actually changes
  const prevPriceRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (data && (prevPriceRef.current === null || data.price !== prevPriceRef.current)) {
      prevPriceRef.current = data.price;
      
      // Only log price changes, not every render
      if (priceChangeDirection !== null) {
        console.log(`Price ${priceChangeDirection === 'up' ? '↑' : '↓'} $${data.price.toFixed(2)}`);
      }
    }
  }, [data, priceChangeDirection]);
  
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
  
  // Note: We should never reach this state with our improved error handling,
  // but keeping it as an extra safety measure with a less alarming message
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
            aria-label="Bitcoin price"
          >
            {data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`ml-3 text-xl ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
            <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
            <span className="mr-1.5 font-fuji-bold" aria-label="Price change">
              ${Math.abs(data.change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="font-fuji-bold" aria-label="Percentage change">
              ({Math.abs(data.changePercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
            </span>
          </span>
        </div>
        
        {/* Timeframe selector */}
        <TimeframeSelector timeframe={timeframe} onTimeframeChange={onTimeframeChange} />
      </div>
    );
  }
  
  if (variant === 'medium') {
    return (
      <div className="flex flex-col">
        {/* Top row with logo and price */}
        <div className="flex items-center justify-between">
          {/* Price display */}
          <div className="flex items-center" aria-live="polite">
            <span 
              className={classNames(
                "text-2xl font-fuji-bold flex items-center",
                { 
                  "animate-pulse-green": priceChangeDirection === 'up',
                  "animate-pulse-red": priceChangeDirection === 'down',
                  "text-primary": true // Always maintain the primary color
                }
              )}
              style={{
                animation: priceChangeDirection === 'up' 
                  ? 'pulse-green-primary 1.2s ease-in-out' 
                  : priceChangeDirection === 'down' 
                    ? 'pulse-red-primary 1.2s ease-in-out' 
                    : 'none'
              }}
            >
              {data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`ml-2 ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
              <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} ml-1 mr-0.5`} aria-hidden="true"></i>
              <span className={classNames({
                "animate-pulse-green": priceChangeDirection === 'up',
                "animate-pulse-red": priceChangeDirection === 'down'
              })}>
                ({Math.abs(data.changePercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
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
  
  // Mobile variant
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
          aria-label="Bitcoin price"
        >
          {data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      
      {/* Change row */}
      <div className="flex items-start mt-1" aria-label="Price change">
        <span className={`${isPositiveChange ? 'text-success' : 'text-error'} flex items-center`}>
          <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
          <span className={classNames("mr-1.5", {
            "animate-pulse-green": priceChangeDirection === 'up',
            "animate-pulse-red": priceChangeDirection === 'down'
          })}>
            ${Math.abs(data.change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={classNames({
            "animate-pulse-green": priceChangeDirection === 'up',
            "animate-pulse-red": priceChangeDirection === 'down'
          })}>
            ({Math.abs(data.changePercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
          </span>
        </span>
      </div>
    </div>
  );
}