import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TimeFrame, BitcoinPrice } from '@/types';
import { getBitcoinPrice } from '@/lib/minimalBitcoinApi';

const ANIMATION_DURATION = 1500;
const REFRESH_INTERVAL = 5000; // 5 seconds between refreshes - using Coinbase WebSocket API

interface UseBitcoinPriceResult {
  timeframe: TimeFrame;
  setTimeframe: (timeframe: TimeFrame) => void;
  bitcoinData: BitcoinPrice | null;
  isLoading: boolean;
  error: Error | null;
  isRefreshing: boolean;
  priceChangeDirection: 'up' | 'down' | null;
  lastUpdateTime: number;
  refreshData: () => Promise<void>;
  latency: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

// For tracking request lifecycle
interface FetchState {
  inProgress: boolean;
  controller: AbortController | null;
  timeframe: TimeFrame;
  requestId: number;
}

/**
 * Enhanced hook for Bitcoin price data with all timeframes
 * Uses the new polling-based approach with complete timeframe data
 */
export function useBitcoinPrice(initialTimeframe: TimeFrame = '1D'): UseBitcoinPriceResult {
  // State for UI display
  const [timeframe, setTimeframe] = useState<TimeFrame>(initialTimeframe);
  const [bitcoinData, setBitcoinData] = useState<BitcoinPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [latency, setLatency] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  // Extended BitcoinPrice type with timestamp for cache management
  interface CachedBitcoinPrice extends BitcoinPrice {
    timestamp?: number;
  }
  
  // Cache data for all timeframes to enable seamless switching
  const dataCache = useRef<Record<TimeFrame, CachedBitcoinPrice | null>>({
    '1H': null,
    '1D': null,
    '1W': null,
    '1M': null,
    '1Y': null,
    'ALL': null
  });
  
  // Request tracking for better race condition handling
  const requestCounter = useRef<number>(0);
  const currentFetchState = useRef<FetchState>({
    inProgress: false,
    controller: null,
    timeframe: initialTimeframe,
    requestId: 0
  });
  
  // Additional refs for tracking state between renders
  const prevPriceRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Fetch Bitcoin data for a specific timeframe with enhanced request tracking
   */
  const fetchBitcoinData = useCallback(async (targetTimeframe: TimeFrame, force = false): Promise<void> => {
    // Generate a unique ID for this request to track its lifecycle
    const requestId = ++requestCounter.current;
    
    // If there's already a fetch in progress for this timeframe and not forced, wait for it
    if (currentFetchState.current.inProgress && 
        currentFetchState.current.timeframe === targetTimeframe && 
        !force) {
      return;
    }
    
    // If there's a fetch in progress for a different timeframe, abort it
    if (currentFetchState.current.inProgress && 
        currentFetchState.current.controller && 
        currentFetchState.current.timeframe !== targetTimeframe) {
      console.log(`Aborting request for ${currentFetchState.current.timeframe} to fetch ${targetTimeframe}`);
      currentFetchState.current.controller.abort();
    }
    
    // Create a new abort controller for this request
    const controller = new AbortController();
    
    // Update the fetch state to track this request
    currentFetchState.current = {
      inProgress: true,
      controller,
      timeframe: targetTimeframe,
      requestId
    };
    
    // Only show refreshing UI state if we don't have cached data for this timeframe
    if (!dataCache.current[targetTimeframe]) {
      setIsRefreshing(true);
    }
    
    const startTime = performance.now();
    let fetchTimeout: NodeJS.Timeout | null = null;
    
    // Set a timeout to prevent hanging on API calls
    const timeoutPromise = new Promise<void>((_, reject) => {
      fetchTimeout = setTimeout(() => {
        if (currentFetchState.current.requestId === requestId) {
          controller.abort();
          reject(new Error("Request timed out after 10 seconds"));
        }
      }, 10000); // 10 second timeout
    });
    
    try {
      // Race between the actual fetch and the timeout
      const data = await Promise.race([
        getBitcoinPrice(targetTimeframe),
        timeoutPromise
      ]) as BitcoinPrice;
      
      const endTime = performance.now();
      
      // Clear the timeout if the fetch succeeded
      if (fetchTimeout) clearTimeout(fetchTimeout);
      
      // Make sure this is still the current request for this timeframe
      // This prevents race conditions where an older request completes after a newer one
      if (currentFetchState.current.requestId !== requestId) {
        console.log(`Ignoring outdated response for ${targetTimeframe}, request #${requestId}`);
        return;
      }
      
      // Validate data to avoid rendering issues
      if (!data || typeof data.price !== 'number') {
        throw new Error('Invalid data received from API');
      }
      
      // Always cache the data for this timeframe with a timestamp
      dataCache.current[targetTimeframe] = {
        ...data,
        timestamp: Date.now() // Add timestamp for cache invalidation
      };
      
      // Only update the UI if this is for the currently selected timeframe
      if (targetTimeframe === timeframe) {
        // Update the UI with the new data
        setBitcoinData(data);
        setLatency(Math.round(endTime - startTime));
        setConnectionStatus('connected');
        
        // Handle price change animation
        if (prevPriceRef.current !== null && data.price !== prevPriceRef.current) {
          if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
          
          const direction = data.price > prevPriceRef.current ? 'up' : 'down';
          setPriceChangeDirection(direction);
          
          animationTimeoutRef.current = setTimeout(() => {
            setPriceChangeDirection(null);
          }, ANIMATION_DURATION);
        }
        
        // Update reference values
        prevPriceRef.current = data.price;
        setLastUpdateTime(Date.now());
        if (error) setError(null);
      } else {
        console.log(`Cached data for ${targetTimeframe} but not displaying (current: ${timeframe})`);
      }
    } catch (err) {
      // Only show errors if this is the current request
      if (currentFetchState.current.requestId === requestId) {
        console.error(`Error fetching Bitcoin data for ${targetTimeframe}:`, err);
        
        // Only update UI error state if this is for the current timeframe
        if (targetTimeframe === timeframe) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setConnectionStatus('disconnected');
          
          // If we don't have any data yet for this timeframe, use fallback data
          if (!bitcoinData && !dataCache.current[targetTimeframe]) {
            const fallbackData: CachedBitcoinPrice = {
              price: 75000,
              change: 2000,
              changePercent: 2.5,
              direction: 'up', // Using literal 'up' to satisfy TS type
              timeframe: targetTimeframe,
              timestamp: Date.now()
            };
            
            // Cache the fallback data
            dataCache.current[targetTimeframe] = fallbackData;
            
            // Only update UI if this is the current timeframe
            if (targetTimeframe === timeframe) {
              setBitcoinData(fallbackData);
            }
          }
        }
      }
    } finally {
      // Clear the timeout if it's still active
      if (fetchTimeout) clearTimeout(fetchTimeout);
      
      // Only clear fetch state if this is still the current request
      if (currentFetchState.current.requestId === requestId) {
        currentFetchState.current.inProgress = false;
        currentFetchState.current.controller = null;
        
        // Only update UI states if this is for the current timeframe
        if (targetTimeframe === timeframe) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }
  }, [timeframe, error, bitcoinData]);
  
  /**
   * Manual refresh function
   */
  const refreshData = useCallback(async (): Promise<void> => {
    await fetchBitcoinData(timeframe, true);
  }, [fetchBitcoinData, timeframe]);
  
  /**
   * Seamless timeframe transition with instant UI update
   */
  const handleTimeframeChange = useCallback((newTimeframe: TimeFrame) => {
    if (newTimeframe === timeframe) return;
    
    console.log(`Changing timeframe: ${timeframe} → ${newTimeframe}`);
    
    // IMPORTANT: Cancel any pending requests to prevent race conditions
    if (currentFetchState.current.controller) {
      currentFetchState.current.controller.abort();
      currentFetchState.current.inProgress = false;
    }
    
    // Update the timeframe state immediately for UI feedback
    setTimeframe(newTimeframe);
    
    // Critical fix: Ensure we always make a fresh request on first click
    // Handle edge case where first click might not trigger data update
    const forceRefresh = true;
    
    // If we have cached data for this timeframe, show it immediately
    if (dataCache.current[newTimeframe]) {
      console.log(`Using cached data for ${newTimeframe}`);
      setBitcoinData(dataCache.current[newTimeframe]);
      setIsLoading(false);
      setIsRefreshing(true); // Always show refreshing to indicate something is happening
      
      // Still refresh in the background to ensure data is current
      fetchBitcoinData(newTimeframe, forceRefresh).catch(err => {
        console.error(`Background refresh error for ${newTimeframe}:`, err);
        setIsRefreshing(false);
      });
    } else {
      // No cached data, show loading state and fetch
      console.log(`No cached data for ${newTimeframe}, fetching...`);
      setIsLoading(true);
      
      // Fetch new data for this timeframe with higher priority
      fetchBitcoinData(newTimeframe, forceRefresh).catch(err => {
        console.error(`Error fetching data for ${newTimeframe}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
    }
  }, [timeframe, fetchBitcoinData]);
  
  // Prefetch data for all timeframes to enable seamless switching
  const prefetchAllTimeframes = useCallback(() => {
    const allTimeframes: TimeFrame[] = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];
    
    // Stagger the prefetch requests to avoid overwhelming the API
    let delay = 0;
    const STAGGER_DELAY = 300; // 300ms between prefetch requests
    
    // Fetch data for all timeframes in the background with staggered timing
    allTimeframes.forEach(tf => {
      // Don't prefetch the current timeframe, it's already being fetched
      if (tf !== timeframe) {
        // Stagger the requests to prevent overwhelming the API
        setTimeout(() => {
          console.log(`Prefetching data for ${tf} timeframe`);
          fetchBitcoinData(tf, false).catch(err => {
            console.error(`Error prefetching ${tf}:`, err);
          });
        }, delay);
        
        delay += STAGGER_DELAY;
      }
    });
  }, [timeframe, fetchBitcoinData]);
  
  // Clear cached data when it becomes stale
  useEffect(() => {
    const clearStaleCache = () => {
      const MAX_CACHE_AGE = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      
      // Get all timeframes that need refreshing
      const staleTimeframes: TimeFrame[] = [];
      
      // Check each timeframe's cache timestamp and mark stale ones
      Object.keys(dataCache.current).forEach(tf => {
        const cachedData = dataCache.current[tf as TimeFrame];
        if (cachedData && (now - (cachedData.timestamp || 0) > MAX_CACHE_AGE)) {
          staleTimeframes.push(tf as TimeFrame);
        }
      });
      
      // Refresh stale timeframes in the background
      if (staleTimeframes.length > 0) {
        console.log(`Refreshing stale data for timeframes: ${staleTimeframes.join(', ')}`);
        
        // Stagger the refresh to avoid overwhelming the API
        let delay = 0;
        const STAGGER_DELAY = 300; // 300ms between requests
        
        staleTimeframes.forEach(tf => {
          setTimeout(() => {
            fetchBitcoinData(tf, false).catch(err => {
              console.error(`Error refreshing stale data for ${tf}:`, err);
            });
          }, delay);
          
          delay += STAGGER_DELAY;
        });
      }
    };
    
    // Set up an interval to periodically check and clear stale cache
    const cacheCheckInterval = setInterval(clearStaleCache, 60000); // Check every minute
    
    return () => {
      clearInterval(cacheCheckInterval);
    };
  }, [fetchBitcoinData]);
  
  // Fetch data for the current timeframe on mount and when timeframe changes
  useEffect(() => {
    // Add debug log for production
    console.log('Setting up Bitcoin price polling in', process.env.NODE_ENV);
    
    // Fetch data for the current timeframe immediately
    console.log(`Starting initial Bitcoin price fetch for ${timeframe}`);
    fetchBitcoinData(timeframe, true)
      .then(() => {
        console.log(`Initial Bitcoin price fetch complete for ${timeframe}`);
        
        // After initial fetch, prefetch other timeframes in the background
        // This ensures seamless switching later
        prefetchAllTimeframes();
      })
      .catch(err => console.error(`Error in initial price fetch for ${timeframe}:`, err));
    
    // Set up refresh interval for real-time updates of the current timeframe
    pollingIntervalRef.current = setInterval(() => {
      console.log(`Executing periodic Bitcoin price refresh for ${timeframe}`);
      fetchBitcoinData(timeframe, true)
        .catch(err => console.error(`Error in periodic price fetch for ${timeframe}:`, err));
    }, REFRESH_INTERVAL);
    
    // Cleanup on unmount
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      
      // Cancel any in-flight requests
      if (currentFetchState.current.controller) {
        currentFetchState.current.controller.abort();
      }
    };
  }, [fetchBitcoinData, timeframe, prefetchAllTimeframes]);
  
  // Return the hook interface
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
    latency,
    connectionStatus
  };
}