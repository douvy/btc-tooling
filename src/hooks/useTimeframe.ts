import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeFrame, BitcoinPrice } from '@/types';
import { getBitcoinPrice, clearAPICache } from '@/lib/api';

const REFRESH_INTERVAL = 5000;
const ANIMATION_DURATION = 1500;
const REQUEST_TIMEOUT = 8000;

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

type TimeframesCache = Record<string, BitcoinPrice>;

export function useTimeframe(initialTimeframe: TimeFrame = '1D'): UseTimeframeResult {
  const [timeframe, setTimeframe] = useState<TimeFrame>(initialTimeframe);
  const [bitcoinData, setBitcoinData] = useState<BitcoinPrice | null>(null);
  const [timeframesCache, setTimeframesCache] = useState<TimeframesCache>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [diagnosticsVisible, setDiagnosticsVisible] = useState(true);
  
  const prevPriceRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
 * Fetch Bitcoin data for the current timeframe
 * This uses our enhanced API with all timeframes properly filled in
 */
const fetchBitcoinData = useCallback(async (force = false): Promise<boolean> => {
    if (isFetchingRef.current && !force) return false;
    if (!isMountedRef.current) return false;
    if (!force && Date.now() - lastFetchTimeRef.current < 3000) return false;
    
    isFetchingRef.current = true;
    setIsRefreshing(true);
    
    if (force && abortControllerRef.current) abortControllerRef.current.abort();
    
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    }, REQUEST_TIMEOUT);
    
    try {
      lastFetchTimeRef.current = Date.now();
      const data = await getBitcoinPrice(timeframe);
      if (!isMountedRef.current) return false;
      
      setBitcoinData(data);
      setTimeframesCache(prev => ({ ...prev, [timeframe]: data }));
      
      if (prevPriceRef.current !== null && data.price !== prevPriceRef.current) {
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        
        const direction = data.price > prevPriceRef.current ? 'up' : 'down';
        setPriceChangeDirection(direction);
        
        animationTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setPriceChangeDirection(null);
        }, ANIMATION_DURATION);
      }
      
      prevPriceRef.current = data.price;
      setLastUpdateTime(Date.now());
      if (error) setError(null);
      
      return true;
    } catch (err) {
      clearTimeout(timeoutId);
      const isAborted = err instanceof DOMException && err.name === 'AbortError';
      if (!isAborted || force) setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
        isFetchingRef.current = false;
        abortControllerRef.current = null;
      }
      clearTimeout(timeoutId);
    }
  }, [timeframe, error]);
  
  const refreshData = useCallback(async (): Promise<void> => {
    await fetchBitcoinData(true);
  }, [fetchBitcoinData]);
  
  const handleTimeframeChange = useCallback((newTimeframe: TimeFrame) => {
    if (newTimeframe === timeframe) return;
    
    // Clear any previous error state
    setError(null);
    
    // Update timeframe immediately
    setTimeframe(newTimeframe);
    
    // For better UX, immediately clear any stored animation state
    setPriceChangeDirection(null);
    
    // GUARANTEED IMMEDIATE RECALCULATION:
    // If we have any bitcoin data at all, we can just recalculate for the new timeframe
    // Rather than making a network request
    try {
      // Import the calculation function directly
      const { extractTimeframeData } = require('@/lib/priceUtils');
      
      console.log(`⚡ IMMEDIATE TIMEFRAME SWITCH: ${timeframe} → ${newTimeframe}`);
      
      // Try different data sources in order of preference
      let rawData = null;
      
      // 1. Try API cache first
      try {
        const { getApiCache } = require('@/lib/api/cache');
        const cache = getApiCache();
        if (cache && cache.data) {
          console.log('Using API cache for immediate recalculation');
          rawData = cache.data;
        }
      } catch (e) {
        console.warn('Error accessing API cache:', e);
      }
      
      // 2. If no API cache, try to construct from current bitcoin data
      if (!rawData && bitcoinData && bitcoinData.price) {
        console.log('Constructing data object from current bitcoin data');
        
        // Create a data structure that matches what the extractTimeframeData function expects
        rawData = {
          market_data: {
            current_price: { usd: bitcoinData.price },
            // Use the existing percentage changes as starting points
            price_change_percentage_1h_in_currency: { usd: bitcoinData.timeframe === '1H' ? bitcoinData.changePercent * (bitcoinData.direction === 'up' ? 1 : -1) : 0 },
            price_change_percentage_24h_in_currency: { usd: bitcoinData.timeframe === '1D' ? bitcoinData.changePercent * (bitcoinData.direction === 'up' ? 1 : -1) : 0 },
            price_change_percentage_7d_in_currency: { usd: bitcoinData.timeframe === '1W' ? bitcoinData.changePercent * (bitcoinData.direction === 'up' ? 1 : -1) : 0 },
            price_change_percentage_30d_in_currency: { usd: bitcoinData.timeframe === '1M' ? bitcoinData.changePercent * (bitcoinData.direction === 'up' ? 1 : -1) : 0 },
            price_change_percentage_1y_in_currency: { usd: bitcoinData.timeframe === '1Y' ? bitcoinData.changePercent * (bitcoinData.direction === 'up' ? 1 : -1) : 0 },
            last_updated_at: Math.floor(Date.now() / 1000)
          }
        };
      }
      
      // 3. Try to use the timeframes cache
      if (!rawData && Object.keys(timeframesCache).length > 0) {
        console.log('Attempting to build from timeframes cache');
        
        // Find any timeframe data we can use
        const anyTimeframeData = Object.values(timeframesCache)[0];
        if (anyTimeframeData && anyTimeframeData.price) {
          rawData = {
            market_data: {
              current_price: { usd: anyTimeframeData.price },
              // Use zeros as placeholders since we don't know the other timeframes
              price_change_percentage_1h_in_currency: { usd: 0 },
              price_change_percentage_24h_in_currency: { usd: 0 },
              price_change_percentage_7d_in_currency: { usd: 0 },
              price_change_percentage_30d_in_currency: { usd: 0 },
              price_change_percentage_1y_in_currency: { usd: 0 },
              last_updated_at: Math.floor(Date.now() / 1000)
            }
          };
        }
      }
      
      // If we have any data to work with, recalculate immediately
      if (rawData && rawData.market_data && rawData.market_data.current_price) {
        console.log('Recalculating with current price:', rawData.market_data.current_price.usd);
        
        // Perform the calculation for new timeframe
        const recalculatedData = extractTimeframeData(rawData, newTimeframe);
        
        // Update UI immediately
        setBitcoinData(recalculatedData);
        setTimeframesCache(prev => ({ ...prev, [newTimeframe]: recalculatedData }));
        
        // Request fresh data in the background
        fetchBitcoinData(true);
        
        // We're done - user sees results immediately
        return;
      } else {
        console.log('No usable data available for immediate recalculation');
      }
    } catch (err) {
      console.warn('Error during immediate timeframe calculation:', err);
      // Continue with fallback approach
    }
    
    // FALLBACK: If we couldn't do immediate calculation, try the API
    console.log('Falling back to API call for timeframe change');
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Show loading state
    setIsLoading(true);
    
    // Fetch data from API
    fetchBitcoinData(true)
      .catch(err => {
        console.error('Error changing timeframe:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [timeframe, fetchBitcoinData]);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    const scheduleNextFetch = () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      
      timerIdRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible' && isMountedRef.current) {
          fetchBitcoinData().finally(() => isMountedRef.current && scheduleNextFetch());
        } else {
          scheduleNextFetch();
        }
      }, REFRESH_INTERVAL);
    };
    
    fetchBitcoinData(true).finally(() => isMountedRef.current && scheduleNextFetch());
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBitcoinData(true).finally(() => isMountedRef.current && scheduleNextFetch());
      } else if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      isMountedRef.current = false;
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBitcoinData]);
  
  return {
    timeframe, setTimeframe: handleTimeframeChange, bitcoinData, isLoading,
    error, isRefreshing, priceChangeDirection, lastUpdateTime,
    refreshData, diagnosticsVisible, setDiagnosticsVisible
  };
}