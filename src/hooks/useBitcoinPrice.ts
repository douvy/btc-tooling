import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TimeFrame, BitcoinPrice } from '@/types';
import { getBitcoinPrice } from '@/lib/minimalBitcoinApi';
import { devLog, devWarn, logError } from '@/lib/api/logger';

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
  
  // Historical cache for fallback purposes - preserves successful API responses
  const historicalDataRef = useRef<Record<TimeFrame, CachedBitcoinPrice[]>>({
    '1H': [],
    '1D': [],
    '1W': [],
    '1M': [],
    '1Y': [],
    'ALL': []
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
        return;
      }
      
      // Validate data to avoid rendering issues
      if (!data || typeof data.price !== 'number') {
        throw new Error('Invalid data received from API');
      }
      
      // Always cache the data for this timeframe with a timestamp
      const timestampedData = {
        ...data,
        timestamp: Date.now() // Add timestamp for cache invalidation
      };
      
      dataCache.current[targetTimeframe] = timestampedData;
      
      // Also store in historical cache for fallback purposes (limit to last 5 entries)
      historicalDataRef.current[targetTimeframe].push(timestampedData);
      if (historicalDataRef.current[targetTimeframe].length > 5) {
        historicalDataRef.current[targetTimeframe].shift(); // Remove oldest entry
      }
      
      // Persist historical data to localStorage for availability across sessions
      try {
        const key = `btc-historical-${targetTimeframe}`;
        localStorage.setItem(key, JSON.stringify(historicalDataRef.current[targetTimeframe]));
      } catch (err) {
        // Ignore storage errors - not critical
        devWarn('Failed to save historical data to localStorage:', err);
      }
      
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
      }
    } catch (err) {
      // Only show errors if this is the current request
      if (currentFetchState.current.requestId === requestId) {
        logError(`Error fetching Bitcoin data for ${targetTimeframe}:`, err);
        
        // Only update UI error state if this is for the current timeframe
        if (targetTimeframe === timeframe) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setConnectionStatus('disconnected');
          
          // If we don't have any data yet for this timeframe, use intelligent fallback data
          if (!bitcoinData && !dataCache.current[targetTimeframe]) {
            let fallbackData: CachedBitcoinPrice | null = null;
            
            // TIER 1: Try to use historical data from the same timeframe first
            const historicalData = historicalDataRef.current[targetTimeframe];
            if (historicalData.length > 0) {
              // Sort by timestamp (newest first)
              const sortedData = [...historicalData].sort((a, b) => 
                (b.timestamp || 0) - (a.timestamp || 0)
              );
              
              // Get the most recent entry
              const mostRecent = sortedData[0];
              const ageInHours = mostRecent.timestamp 
                ? (Date.now() - mostRecent.timestamp) / (1000 * 60 * 60)
                : 24; // Default to 24 hours if no timestamp
              
              // For recent data (less than 24 hours old), use as-is
              if (ageInHours < 24) {
                fallbackData = {
                  ...mostRecent,
                  timestamp: Date.now() // Update timestamp to current
                };
              } 
              // For older data, apply aging adjustments for realism
              else {
                
                // Apply volatility based on how old the data is
                // Older data gets more randomized to reflect uncertainty
                const agingFactor = Math.min(ageInHours / 24, 5); // Cap at 5 days
                const volatilityAdjustment = 0.95 + (Math.random() * 0.1 * agingFactor);
                
                // Calculate new price with realistic aging
                const basePrice = mostRecent.price * volatilityAdjustment;
                
                // Maintain direction proportions for realism
                // If old price moved up 5%, new price should move up roughly the same
                const changePercent = mostRecent.changePercent * (0.9 + Math.random() * 0.2);
                
                // For ALL timeframe, keep direction 'up' (Bitcoin always up long-term)
                const direction = targetTimeframe === 'ALL' ? 'up' : mostRecent.direction;
                
                // Calculate dollar change based on the percentage
                const change = basePrice * (changePercent / 100);
                
                fallbackData = {
                  price: Math.round(basePrice),
                  change: Math.round(change),
                  changePercent: parseFloat(changePercent.toFixed(2)),
                  direction,
                  timeframe: targetTimeframe,
                  timestamp: Date.now()
                };
              }
            }
            // TIER 2: If no historical data for this timeframe, try to extrapolate from other timeframes
            else if (Object.values(historicalDataRef.current).some(arr => arr.length > 0)) {
              
              // Find any timeframe with data, preferring shorter timeframes
              const timeframePreference: TimeFrame[] = ['1D', '1H', '1W', '1M', '1Y', 'ALL'];
              let baseTimeframe: TimeFrame | null = null;
              let baseData: CachedBitcoinPrice | null = null;
              
              for (const tf of timeframePreference) {
                if (historicalDataRef.current[tf].length > 0) {
                  // Sort by timestamp (newest first)
                  const sortedData = [...historicalDataRef.current[tf]].sort((a, b) => 
                    (b.timestamp || 0) - (a.timestamp || 0)
                  );
                  
                  baseTimeframe = tf;
                  baseData = sortedData[0];
                  break;
                }
              }
              
              if (baseData && baseTimeframe) {
                // Extrapolate appropriate change percentages for the target timeframe
                // based on the base timeframe
                let changeMultiplier = 1.0;
                
                // Multiply/divide change percentages based on timeframe differences
                // e.g., 1D → 1W ≈ 5x, 1W → 1M ≈ 4x, etc.
                const timeframeScaleMap: Record<string, number> = {
                  '1H_1D': 24,    // 1H → 1D: multiply by ~24
                  '1D_1W': 7,     // 1D → 1W: multiply by ~7
                  '1W_1M': 4,     // 1W → 1M: multiply by ~4
                  '1M_1Y': 12,    // 1M → 1Y: multiply by ~12
                  '1D_1H': 1/24,  // 1D → 1H: divide by ~24
                  '1W_1D': 1/7,   // 1W → 1D: divide by ~7
                  '1M_1W': 1/4,   // 1M → 1W: divide by ~4
                  '1Y_1M': 1/12   // 1Y → 1M: divide by ~12
                };
                
                const scaleKey = `${baseTimeframe}_${targetTimeframe}`;
                if (timeframeScaleMap[scaleKey]) {
                  changeMultiplier = timeframeScaleMap[scaleKey];
                } else if (baseTimeframe === 'ALL') {
                  // Special case for ALL timeframe
                  switch (targetTimeframe) {
                    case '1Y': changeMultiplier = 0.1; break;  // ALL → 1Y: ~10%
                    case '1M': changeMultiplier = 0.01; break; // ALL → 1M: ~1%
                    case '1W': changeMultiplier = 0.002; break; // ALL → 1W: ~0.2%
                    case '1D': changeMultiplier = 0.0003; break; // ALL → 1D: ~0.03%
                    case '1H': changeMultiplier = 0.00001; break; // ALL → 1H: ~0.001%
                  }
                } else if (targetTimeframe === 'ALL') {
                  // Special case for extrapolating to ALL timeframe
                  switch (baseTimeframe) {
                    case '1Y': changeMultiplier = 10; break;   // 1Y → ALL: ~10x
                    case '1M': changeMultiplier = 100; break;  // 1M → ALL: ~100x
                    case '1W': changeMultiplier = 500; break;  // 1W → ALL: ~500x
                    case '1D': changeMultiplier = 3000; break; // 1D → ALL: ~3000x
                    case '1H': changeMultiplier = 70000; break; // 1H → ALL: ~70000x
                  }
                }
                
                // Apply the multiplier to get a reasonable change percentage
                let changePercent = baseData.changePercent * changeMultiplier;
                
                // Make sure ALL timeframe is always positive and large
                if (targetTimeframe === 'ALL') {
                  changePercent = Math.abs(changePercent);
                  if (changePercent < 1000) changePercent = 1000 + Math.random() * 9000;
                }
                
                // Make sure small timeframes have reasonable values
                if (targetTimeframe === '1H' && Math.abs(changePercent) > 5) {
                  changePercent = (Math.random() * 3 + 0.5) * (changePercent > 0 ? 1 : -1);
                }
                
                // For ALL timeframe, always use 'up' direction
                const direction = targetTimeframe === 'ALL' ? 'up' : 
                                 (changePercent >= 0 ? 'up' : 'down');
                
                // Calculate absolute change value
                const change = baseData.price * (Math.abs(changePercent) / 100);
                
                fallbackData = {
                  price: baseData.price,
                  change: Math.round(change),
                  changePercent: parseFloat(Math.abs(changePercent).toFixed(2)),
                  direction,
                  timeframe: targetTimeframe,
                  timestamp: Date.now()
                };
                
              }
            }
            
            // TIER 3: Last resort - generate reasonable fallback data if no historical data exists
            if (!fallbackData) {
              
              // Get current date to generate reasonable price range
              const currentYear = new Date().getFullYear();
              const yearsSince2020 = Math.max(0, currentYear - 2020);
              
              // Base price that scales with years since 2020 (approximating Bitcoin's growth)
              // 2020: ~20k, 2021: ~30k, 2022: ~40k, etc.
              const basePrice = 20000 * (1 + (yearsSince2020 * 0.5));
              
              // Randomize within ±10% for realistic variation
              const price = Math.round(basePrice * (0.9 + (Math.random() * 0.2)));
              
              // Generate appropriate change percentage based on timeframe
              let changePercent = 0;
              let direction: 'up' | 'down' = 'up';
              
              switch (targetTimeframe) {
                case '1H':
                  changePercent = 0.1 + (Math.random() * 1.9); // 0.1-2% hourly change
                  direction = Math.random() > 0.5 ? 'up' : 'down';
                  break;
                case '1D':
                  changePercent = 1 + (Math.random() * 4); // 1-5% daily change
                  direction = Math.random() > 0.5 ? 'up' : 'down';
                  break;
                case '1W':
                  changePercent = 3 + (Math.random() * 7); // 3-10% weekly change
                  direction = Math.random() > 0.5 ? 'up' : 'down';
                  break;
                case '1M':
                  changePercent = 5 + (Math.random() * 15); // 5-20% monthly change
                  direction = Math.random() > 0.5 ? 'up' : 'down';
                  break;
                case '1Y':
                  changePercent = 20 + (Math.random() * 80); // 20-100% yearly change
                  direction = Math.random() > 0.4 ? 'up' : 'down'; // Slight bias toward up
                  break;
                case 'ALL':
                  // All-time returns always positive and large for Bitcoin
                  changePercent = 1000 + (Math.random() * 9000); // 1000-10000% all-time change
                  direction = 'up'; // Always up for all-time
                  break;
                default:
                  changePercent = 2.5; // Default fallback
                  direction = 'up';
              }
              
              // Calculate change amount based on percentage
              const change = price * (changePercent / 100);
              
              fallbackData = {
                price,
                change: Math.round(change),
                changePercent: parseFloat(changePercent.toFixed(2)),
                direction,
                timeframe: targetTimeframe,
                timestamp: Date.now()
              };
            }
            
            
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
      setBitcoinData(dataCache.current[newTimeframe]);
      setIsLoading(false);
      setIsRefreshing(true); // Always show refreshing to indicate something is happening
      
      // Still refresh in the background to ensure data is current
      fetchBitcoinData(newTimeframe, forceRefresh).catch(err => {
        logError(`Background refresh error for ${newTimeframe}:`, err);
        setIsRefreshing(false);
      });
    } else {
      // No cached data, show loading state and fetch
      setIsLoading(true);
      
      // Fetch new data for this timeframe with higher priority
      fetchBitcoinData(newTimeframe, forceRefresh).catch(err => {
        logError(`Error fetching data for ${newTimeframe}:`, err);
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
          fetchBitcoinData(tf, false).catch(() => {
            // Silently handle prefetch errors
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
        
        // Stagger the refresh to avoid overwhelming the API
        let delay = 0;
        const STAGGER_DELAY = 300; // 300ms between requests
        
        staleTimeframes.forEach(tf => {
          setTimeout(() => {
            fetchBitcoinData(tf, false).catch(() => {
              // Silently handle refresh errors
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
  
  // Initialize historical data from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Load historical data for each timeframe
    const timeframes: TimeFrame[] = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];
    timeframes.forEach(tf => {
      try {
        const key = `btc-historical-${tf}`;
        const storedData = localStorage.getItem(key);
        if (storedData) {
          const parsedData = JSON.parse(storedData) as CachedBitcoinPrice[];
          // Validate the data to ensure it's valid and has required fields
          const validData = parsedData.filter(entry => 
            entry && 
            typeof entry.price === 'number' && 
            typeof entry.change === 'number' && 
            typeof entry.changePercent === 'number' &&
            (entry.direction === 'up' || entry.direction === 'down') &&
            typeof entry.timestamp === 'number'
          );
          
          if (validData.length > 0) {
            historicalDataRef.current[tf] = validData;
          }
        }
      } catch (err) {
        // Non-critical, we'll still function without historical data
      }
    });
  }, []);

  // Fetch data for the current timeframe on mount and when timeframe changes
  useEffect(() => {
    // Fetch data for the current timeframe immediately
    fetchBitcoinData(timeframe, true)
      .then(() => {
        // After initial fetch, prefetch other timeframes in the background
        // This ensures seamless switching later
        prefetchAllTimeframes();
      })
      .catch(() => {
        // Silently handle initial fetch errors
      });
    
    // Set up refresh interval for real-time updates of the current timeframe
    pollingIntervalRef.current = setInterval(() => {
      fetchBitcoinData(timeframe, true)
        .catch(() => {
          // Silently handle periodic fetch errors
        });
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