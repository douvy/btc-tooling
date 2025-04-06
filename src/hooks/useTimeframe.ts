import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeFrame, BitcoinPrice } from '@/types';
import { getBitcoinPrice, updateStatus, lastUpdateTimestamp } from '@/lib/api';

/**
 * Data structure for storing all timeframes
 * Enables instant switching between timeframes
 */
interface TimeframesData {
  [key: string]: BitcoinPrice;
}

/**
 * Hook return type
 */
interface UseTimeframeResult {
  timeframe: TimeFrame;
  setTimeframe: (timeframe: TimeFrame) => void;
  bitcoinData: BitcoinPrice | null;
  isLoading: boolean;
  error: Error | null;
  isRefreshing: boolean;
  priceChangeDirection: 'up' | 'down' | null;
  lastUpdateTime: number;
  refreshData: () => Promise<void>;
  diagnosticsVisible: boolean;
  setDiagnosticsVisible: (visible: boolean) => void;
}

// Auto refresh interval - EXACTLY 5 seconds
const REFRESH_INTERVAL = 5000;
// Animation duration
const ANIMATION_DURATION = 1500;
// Request timeout
const REQUEST_TIMEOUT = 8000;
// Debug mode
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

/**
 * Enhanced hook for Bitcoin price data with guaranteed refresh intervals
 * Implements the stale-while-revalidate pattern for optimized performance
 */
export function useTimeframe(initialTimeframe: TimeFrame = '1D'): UseTimeframeResult {
  // Core state
  const [timeframe, setTimeframe] = useState<TimeFrame>(initialTimeframe);
  const [bitcoinData, setBitcoinData] = useState<BitcoinPrice | null>(null);
  const [timeframesData, setTimeframesData] = useState<TimeframesData>({});
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(true);
  
  // Refs for tracking values without triggering re-renders
  const previousPriceRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Debug logging with timestamps
  const log = useCallback((message: string, ...args: any[]) => {
    if (DEBUG || process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString().slice(11, 19);
      console.log(`[${timestamp}][useTimeframe] ${message}`, ...args);
    }
  }, []);
  
  /**
   * Fetch fresh Bitcoin data with comprehensive error handling and timeout
   */
  const fetchBitcoinData = useCallback(async (force = false): Promise<boolean> => {
    // Prevent concurrent fetches unless forced
    if (isFetchingRef.current && !force) {
      log('Skipping fetch (already fetching)');
      return false;
    }
    
    // Don't fetch if component unmounted
    if (!isMountedRef.current) return false;
    
    // Calculate time since last fetch
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    
    // Throttle fetches to prevent excessive API calls unless forced refresh
    if (!force && timeSinceLastFetch < 3000) {
      log(`Throttling fetch (last fetch ${timeSinceLastFetch}ms ago)`);
      return false;
    }
    
    // Update state for UI feedback
    isFetchingRef.current = true;
    setIsRefreshing(true);
    
    // Cancel any existing fetch if forced
    if (force && abortControllerRef.current) {
      log('Cancelling previous fetch request');
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        log('Request timeout reached');
        abortControllerRef.current.abort();
      }
    }, REQUEST_TIMEOUT);
    
    try {
      log(`Fetching ${timeframe} Bitcoin data${force ? ' (forced)' : ''}`);
      lastFetchTimeRef.current = now;
      
      // Get fresh data from API
      const fetchStart = performance.now();
      const data = await getBitcoinPrice(timeframe);
      const fetchDuration = Math.round(performance.now() - fetchStart);
      
      // Clear timeout since request completed
      clearTimeout(timeoutId);
      
      // Log performance metrics
      log(`Fetch complete in ${fetchDuration}ms: $${data.price.toFixed(2)} (${data.direction === 'up' ? '+' : '-'}${data.changePercent.toFixed(2)}%)`);
      
      // Component might have unmounted during fetch
      if (!isMountedRef.current) return false;
      
      // Update state atomically to prevent race conditions
      // First update the price data
      setBitcoinData(prevData => {
        // Don't update if we switched timeframes during fetch
        if (prevData && timeframe !== prevData.timeframe) {
          log(`Timeframe changed during fetch from ${timeframe} to ${prevData.timeframe}, ignoring update`);
          return prevData;
        }
        
        // Add timeframe to data for tracking
        const enhancedData = {
          ...data,
          timeframe // Track which timeframe this data belongs to
        };
        
        // Update the previous price ref for next comparison
        const oldPrice = previousPriceRef.current;
        previousPriceRef.current = data.price;
        
        // Log significant price changes
        if (oldPrice !== null && data.price !== oldPrice) {
          log(`Price changed from $${oldPrice} to $${data.price} (${data.price > oldPrice ? 'up' : 'down'})`);
        }
        
        return enhancedData;
      });
      
      // Store for all timeframes to enable instant switching (always update cache)
      setTimeframesData(prev => ({
        ...prev,
        [timeframe]: {
          ...data,
          timeframe // Track which timeframe this data belongs to
        }
      }));
      
      // Handle price change animation with debouncing
      // Only animate if the price actually changed and we're still on the same timeframe
      if (previousPriceRef.current !== null && data.price !== previousPriceRef.current) {
        // Cancel any existing animation to prevent flicker
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = null;
        }
        
        // Determine animation direction
        const direction = data.price > previousPriceRef.current ? 'up' : 'down';
        
        // Use a functional update to ensure we don't miss updates
        setPriceChangeDirection(prev => {
          // If we're already animating in the same direction, keep it
          if (prev === direction) return prev;
          return direction;
        });
        
        // Clear animation after duration
        animationTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            // Use functional update to ensure we're resetting the correct animation
            setPriceChangeDirection(current => {
              // Only clear if the direction matches what we set
              if (current === direction) return null;
              return current;
            });
          }
        }, ANIMATION_DURATION);
      }
      
      // Update last update time
      setLastUpdateTime(now);
      
      // Clear any errors
      if (error) setError(null);
      
      return true;
    } catch (err) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      // Handle AbortController errors differently
      const isAborted = err instanceof DOMException && err.name === 'AbortError';
      const errorMessage = isAborted ? 'Request was aborted' : String(err);
      
      log(`Error fetching Bitcoin data: ${errorMessage}`, err);
      
      if (!isMountedRef.current) return false;
      
      // Set error for UI if not aborted by us during cleanup
      if (!isAborted || force) {
        // Use functional update to ensure we don't overwrite newer error states
        setError(currentError => {
          // If we already have a more recent error, don't overwrite it
          if (currentError && (currentError as any).timestamp && 
              err instanceof Error && (err as any).timestamp && 
              (currentError as any).timestamp > (err as any).timestamp) {
            return currentError;
          }
          
          // Create enhanced error with timestamp
          const enhancedError = err instanceof Error ? err : new Error(String(err));
          // Add timestamp to error object
          (enhancedError as any).timestamp = Date.now();
          return enhancedError;
        });
      }
      
      return false;
    } finally {
      // Reset flags
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
        abortControllerRef.current = null;
      }
    }
  }, [timeframe, error, log]);
  
  /**
   * Public function to manually trigger a refresh
   */
  const refreshData = useCallback(async () => {
    log('Manual refresh triggered');
    await fetchBitcoinData(true);
  }, [fetchBitcoinData, log]);
  
  /**
   * Handle timeframe switching with instant feedback
   */
  const handleTimeframeChange = useCallback((newTimeframe: TimeFrame) => {
    if (newTimeframe === timeframe) return;
    
    log(`Switching timeframe: ${timeframe} → ${newTimeframe}`);
    
    // Update the selected timeframe with functional update to avoid race conditions
    setTimeframe(current => {
      // If somehow another update occurred, avoid overwriting with stale data
      if (current !== timeframe) {
        log(`Timeframe changed during update from ${timeframe} to ${current}, using latest`);
        return current;
      }
      return newTimeframe;
    });
    
    // If we have cached data, show it immediately
    if (timeframesData[newTimeframe]) {
      log('Using cached data for immediate display');
      // Use functional updates to ensure we don't have race conditions
      setBitcoinData(current => {
        // Clear price change animation when switching timeframes
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = null;
          setPriceChangeDirection(null);
        }
        
        return timeframesData[newTimeframe];
      });
      
      // Still fetch fresh data for this timeframe in the background (non-blocking)
      // Use a safer approach than Promise.resolve().then()
      if (isMountedRef.current) {
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            fetchBitcoinData(true);
          }
        }, 0);
        
        // Store the timer to clean it up if needed
        const prevTimer = timerIdRef.current;
        timerIdRef.current = timer;
        
        // Clean up previous timer if it exists
        if (prevTimer) {
          clearTimeout(prevTimer);
        }
      }
    } else {
      // No cached data, show loading and fetch
      log('No cached data available, fetching fresh data');
      setIsLoading(true);
      fetchBitcoinData(true);
    }
  }, [timeframe, timeframesData, fetchBitcoinData, log]);
  
  /**
   * Set up precise interval timer for reliable 5-second updates
   * Uses a recursively scheduled setTimeout approach for better accuracy
   */
  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;
    log('Setting up Bitcoin price tracking with precise 5-second updates');
    
    /**
     * Recursive timer function for precise intervals
     * This approach prevents interval drift that setInterval can experience
     */
    const scheduleNextFetch = () => {
      // Clear any existing timer
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      
      // Schedule the next fetch
      timerIdRef.current = setTimeout(() => {
        // Skip fetching if page is hidden
        if (document.visibilityState === 'visible' && isMountedRef.current) {
          fetchBitcoinData()
            .finally(() => {
              // Schedule next update only after current one completes
              // This prevents overlapping requests on slow connections
              if (isMountedRef.current) {
                scheduleNextFetch();
              }
            });
        } else {
          // If page is hidden, just reschedule without fetching
          scheduleNextFetch();
        }
      }, REFRESH_INTERVAL);
    };
    
    // Initial fetch
    fetchBitcoinData(true).finally(() => {
      if (isMountedRef.current) {
        // Start the fetch cycle after initial fetch completes
        scheduleNextFetch();
      }
    });
    
    // Handle tab visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        log('Page became visible - fetching fresh data');
        
        // Immediate fetch when tab becomes visible
        fetchBitcoinData(true).finally(() => {
          if (isMountedRef.current) {
            // Reset the interval cycle
            scheduleNextFetch();
          }
        });
      } else {
        log('Page hidden - pausing updates');
        
        // Cancel any in-progress fetch
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      }
    };
    
    // Register visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up properly on unmount
    return () => {
      log('Cleaning up Bitcoin price tracking');
      
      // Mark as unmounted first to prevent any new operations
      isMountedRef.current = false;
      
      // Clear all timers (check for null to be safe)
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      
      // Abort any in-flight requests
      if (abortControllerRef.current) {
        log('Aborting in-flight request during cleanup');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Remove event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Clear any other state that might cause memory leaks
      previousPriceRef.current = null;
      isFetchingRef.current = false;
      
      // Log completion of cleanup
      log('Bitcoin price tracking cleanup complete');
    };
  }, [fetchBitcoinData, log]);
  
  // Return comprehensive interface
  return {
    timeframe,
    setTimeframe: handleTimeframeChange,
    bitcoinData,
    isLoading,
    error,
    isRefreshing,
    priceChangeDirection,
    lastUpdateTime,
    refreshData,
    diagnosticsVisible,
    setDiagnosticsVisible
  };
}