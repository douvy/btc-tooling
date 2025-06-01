import { TimeFrame, BitcoinPrice } from '@/types';
import { useEffect, useRef, memo, useMemo } from 'react';
import React from 'react';
import classNames from 'classnames';
import DesktopPriceDisplay from './DesktopPriceDisplay';
import MediumPriceDisplay from './MediumPriceDisplay';
import MobilePriceDisplay from './MobilePriceDisplay';
import { useAppContext } from '@/context/AppContext';

// Export these types for reuse in other components
export type PriceDisplayVariant = 'desktop' | 'medium' | 'mobile';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
export type PriceChangeDirection = 'up' | 'down' | null;

/**
 * Props for the BitcoinPriceDisplay component
 * All properties are optional since they can be provided via context
 */
export interface BitcoinPriceDisplayProps {
  data?: BitcoinPrice | null;
  timeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: Error | null;
  variant?: PriceDisplayVariant;
  priceChangeDirection?: PriceChangeDirection;
  latency?: number;
  connectionStatus?: ConnectionStatus;
}

/**
 * Component to display Bitcoin price with animations and responsive layouts
 * Delegates to variant-specific display components based on screen size
 * Data can be supplied via props or retrieved from global context
 */
const BitcoinPriceDisplay: React.FC<BitcoinPriceDisplayProps> = ({
  data: propData,
  timeframe: propTimeframe,
  onTimeframeChange: propOnTimeframeChange,
  isLoading: propIsLoading,
  isRefreshing: propIsRefreshing,
  error: propError,
  variant = 'desktop',
  priceChangeDirection: propPriceChangeDirection = null,
  latency: propLatency = 0,
  connectionStatus: propConnectionStatus = 'connected'
}) => {
  // Get data from context if not provided via props
  const {
    bitcoinData: contextBitcoinData,
    timeframe: contextTimeframe,
    setTimeframe: contextSetTimeframe,
    isLoading: contextIsLoading,
    isRefreshing: contextIsRefreshing,
    error: contextError,
    priceChangeDirection: contextPriceChangeDirection,
    latency: contextLatency,
    connectionStatus: contextConnectionStatus
  } = useAppContext();
  
  // Use props if provided, otherwise use context values
  const data = propData || contextBitcoinData;
  const timeframe = propTimeframe || contextTimeframe;
  const onTimeframeChange = propOnTimeframeChange || contextSetTimeframe;
  const isLoading = propIsLoading !== undefined ? propIsLoading : contextIsLoading;
  const isRefreshing = propIsRefreshing !== undefined ? propIsRefreshing : contextIsRefreshing;
  const error = propError || contextError;
  const priceChangeDirection = propPriceChangeDirection || contextPriceChangeDirection || null;
  const latency = propLatency !== undefined ? propLatency : (contextLatency || 0);
  const connectionStatus = propConnectionStatus || contextConnectionStatus || 'connected';
  // Track previous price for significant changes
  const prevPriceRef = useRef<number | null>(null);
  const prevTimeframeRef = useRef<TimeFrame>(timeframe);
  
  // Track price changes and update reference
  useEffect(() => {
    if (!data) return;
    
    // Only consider price changes significant if not switching timeframes
    const isTimeframeChange = prevTimeframeRef.current !== timeframe;
    
    // Track significant price changes only within the same timeframe
    const isSignificantChange = 
      !isTimeframeChange && (
        prevPriceRef.current === null || 
        Math.abs(data.price - prevPriceRef.current) >= 1
      );
      
    if (isSignificantChange) {
      prevPriceRef.current = data.price;
    }
    
    // Always update timeframe reference
    prevTimeframeRef.current = timeframe;
  }, [data, timeframe]);
  
  // Memoize loading skeleton based on variant to avoid unnecessary re-renders
  const loadingSkeleton = useMemo(() => (
    <div className={classNames(
      "animate-pulse",
      {
        "px-4 py-3": variant === 'desktop',
        "px-2 py-2": variant === 'medium',
        "pb-2": variant === 'mobile'
      }
    )}>
      <div className={classNames(
        "h-8 bg-divider rounded",
        {
          "w-40": variant === 'desktop',
          "w-32": variant === 'medium',
          "w-28": variant === 'mobile'
        }
      )}></div>
      <div className="h-4 bg-divider rounded w-20 mt-2"></div>
    </div>
  ), [variant]);
  
  // Show loading state
  if (isLoading && !data) {
    return loadingSkeleton;
  }
  
  // Show error state (fallback to loading UI)
  if (error && !data) {
    return loadingSkeleton;
  }
  
  // No data to display
  if (!data) {
    return null;
  }

  // Common props for all variant components
  const commonProps = {
    data,
    timeframe,
    onTimeframeChange,
    priceChangeDirection,
    latency,
    connectionStatus,
  };

  // Return the appropriate variant based on the prop
  switch (variant) {
    case 'desktop':
      return <DesktopPriceDisplay {...commonProps} />;
    case 'medium':
      return <MediumPriceDisplay {...commonProps} />;
    case 'mobile':
      return <MobilePriceDisplay {...commonProps} />;
    default:
      // TypeScript should prevent this, but added for safety
      return <DesktopPriceDisplay {...commonProps} />;
  }
}

// Custom equality function for memoization to prevent unnecessary re-renders
function arePropsEqual(prevProps: BitcoinPriceDisplayProps, nextProps: BitcoinPriceDisplayProps): boolean {
  // Different loading states should trigger re-render
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isRefreshing !== nextProps.isRefreshing) return false;
  
  // Different error states should trigger re-render
  if (
    (prevProps.error && !nextProps.error) || 
    (!prevProps.error && nextProps.error)
  ) return false;
  
  // Check if timeframe changed
  if (prevProps.timeframe !== nextProps.timeframe) return false;
  
  // Check price change direction
  if (prevProps.priceChangeDirection !== nextProps.priceChangeDirection) return false;
  
  // Check connection status changes
  if (prevProps.connectionStatus !== nextProps.connectionStatus) return false;
  
  // Significant latency changes (more than 100ms difference)
  if (Math.abs((prevProps.latency || 0) - (nextProps.latency || 0)) > 100) return false;
  
  // Different data structures or missing data
  if ((!prevProps.data && nextProps.data) || (prevProps.data && !nextProps.data)) return false;
  
  // If both have data, compare price values
  if (prevProps.data && nextProps.data) {
    // Only re-render if price, change, or direction is different
    if (prevProps.data.price !== nextProps.data.price) return false;
    if (prevProps.data.change !== nextProps.data.change) return false;
    if (prevProps.data.changePercent !== nextProps.data.changePercent) return false;
    if (prevProps.data.direction !== nextProps.data.direction) return false;
  }
  
  // If variant changes, we need to re-render
  if (prevProps.variant !== nextProps.variant) return false;
  
  // Props are equal, no need to re-render
  return true;
}

// Memoize the component with custom equality function to prevent unnecessary re-renders
export default memo(BitcoinPriceDisplay, arePropsEqual);