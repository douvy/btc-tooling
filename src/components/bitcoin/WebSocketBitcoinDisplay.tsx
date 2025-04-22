import { memo, useEffect, useRef, useState } from 'react';
import { useWebSocketPrice } from '@/hooks/useWebSocketPrice';
import DesktopPriceDisplay from './DesktopPriceDisplay';
import MediumPriceDisplay from './MediumPriceDisplay';
import MobilePriceDisplay from './MobilePriceDisplay';
import classNames from 'classnames';

interface WebSocketBitcoinDisplayProps {
  variant?: 'desktop' | 'medium' | 'mobile';
  initialTimeframe?: '1D' | '1W' | '1M' | '1Y' | 'ALL';
}

/**
 * Bitcoin price display component using WebSocket for real-time data
 */
function WebSocketBitcoinDisplay({
  variant = 'desktop',
  initialTimeframe = '1D'
}: WebSocketBitcoinDisplayProps) {
  // Use our WebSocket hook
  const {
    bitcoinData,
    timeframe,
    setTimeframe,
    isLoading,
    error,
    latency,
    connectionStatus
  } = useWebSocketPrice(initialTimeframe);
  
  // Track previous price for animations
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle price change animations (similar to the original implementation)
  useEffect(() => {
    if (!bitcoinData) return;
    
    // Only animate significant changes (>=1 dollar)
    const isSignificantChange = 
      prevPriceRef.current !== null && 
      Math.abs(bitcoinData.price - prevPriceRef.current) >= 1;
      
    if (isSignificantChange && prevPriceRef.current !== null) {
      // Clear any existing animation
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      // Set new direction (with null check to satisfy TypeScript)
      const direction = bitcoinData.price > prevPriceRef.current ? 'up' : 'down';
      setPriceChangeDirection(direction);
      
      // Reset animation after timeout
      animationTimeoutRef.current = setTimeout(() => {
        setPriceChangeDirection(null);
      }, 1500);
    }
    
    prevPriceRef.current = bitcoinData.price;
  }, [bitcoinData]);
  
  // Clean up animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);
  
  // Only show loading on initial load - not on timeframe switches
  // This ensures we always show some data rather than a blank loading state
  if (isLoading && !bitcoinData) {
    // First time loading - show skeleton
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
  
  // For timeframe switches, we'll show the previous data with a subtle loading indicator
  // This allows for better UX when changing timeframes
  
  // Error state (fallback to loading UI)
  if (error && !bitcoinData) {
    return (
      <div className="animate-pulse px-4 py-2">
        <div className="h-8 bg-gray-700 rounded w-40"></div>
        <div className="h-4 bg-gray-700 rounded w-20 mt-2"></div>
      </div>
    );
  }
  
  // No data yet
  if (!bitcoinData) {
    return null;
  }

  // Display the appropriate variant with latency information
  if (variant === 'desktop') {
    return (
      <DesktopPriceDisplay
        data={bitcoinData}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        latency={latency}
        connectionStatus={connectionStatus}
        priceChangeDirection={priceChangeDirection}
      />
    );
  }
  
  if (variant === 'medium') {
    return (
      <MediumPriceDisplay
        data={bitcoinData}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        latency={latency}
        connectionStatus={connectionStatus}
        priceChangeDirection={priceChangeDirection}
      />
    );
  }
  
  // Mobile variant
  return (
    <MobilePriceDisplay
      data={bitcoinData}
      timeframe={timeframe}
      onTimeframeChange={setTimeframe}
      latency={latency}
      connectionStatus={connectionStatus}
      priceChangeDirection={priceChangeDirection}
    />
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(WebSocketBitcoinDisplay);