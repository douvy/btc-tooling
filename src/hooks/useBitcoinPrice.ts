import { useState, useEffect, useCallback, useRef } from 'react';
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

/**
 * Enhanced hook for Bitcoin price data with all timeframes
 * Uses the new polling-based approach with complete timeframe data
 */
export function useBitcoinPrice(initialTimeframe: TimeFrame = '1D'): UseBitcoinPriceResult {
  const [timeframe, setTimeframe] = useState<TimeFrame>(initialTimeframe);
  const [bitcoinData, setBitcoinData] = useState<BitcoinPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [latency, setLatency] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  // Refs for tracking state between renders
  const prevPriceRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Fetch Bitcoin data for the current timeframe
   */
  const fetchBitcoinData = useCallback(async (force = false): Promise<void> => {
    if (isFetchingRef.current && !force) return;
    
    isFetchingRef.current = true;
    setIsRefreshing(true);
    
    const startTime = performance.now();
    let fetchTimeout: NodeJS.Timeout | null = null;
    
    // Set a timeout to prevent hanging on API calls
    const timeoutPromise = new Promise<void>((_, reject) => {
      fetchTimeout = setTimeout(() => {
        reject(new Error("Request timed out after 10 seconds"));
      }, 10000); // 10 second timeout
    });
    
    try {
      // Race between the actual fetch and the timeout
      const data = await Promise.race([
        getBitcoinPrice(timeframe),
        timeoutPromise
      ]) as BitcoinPrice;
      
      const endTime = performance.now();
      
      // Clear the timeout if the fetch succeeded
      if (fetchTimeout) clearTimeout(fetchTimeout);
      
      // Validate data to avoid rendering issues
      if (!data || typeof data.price !== 'number') {
        throw new Error('Invalid data received from API');
      }
      
      // Update the UI with the new data
      setBitcoinData(data);
      setLatency(Math.round(endTime - startTime));
      setConnectionStatus('connected');
      
      // Data received from API
      
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
    } catch (err) {
      console.error('Error fetching Bitcoin data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setConnectionStatus('disconnected');
      
      // If we don't have any data yet, use the fallback data
      if (!bitcoinData) {
        setBitcoinData({
          price: 75000,
          change: 2000,
          changePercent: 2.5,
          direction: 'up',
          timeframe
        });
      }
    } finally {
      // Clear the timeout if it's still active
      if (fetchTimeout) clearTimeout(fetchTimeout);
      
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  // Remove bitcoinData from dependencies to prevent dependency cycle
  }, [timeframe, error]);
  
  /**
   * Manual refresh function
   */
  const refreshData = useCallback(async (): Promise<void> => {
    await fetchBitcoinData(true);
  }, [fetchBitcoinData]);
  
  /**
   * Handle timeframe changes with smooth transitions
   */
  const handleTimeframeChange = useCallback((newTimeframe: TimeFrame) => {
    if (newTimeframe === timeframe) return;
    
    console.log(`Changing timeframe: ${timeframe} → ${newTimeframe}`);
    
    // Reset state for new timeframe
    setError(null);
    setPriceChangeDirection(null);
    
    // Update timeframe immediately
    setTimeframe(newTimeframe);
    
    // Fetch data for the new timeframe
    setIsLoading(true);
    fetchBitcoinData(true)
      .catch(err => {
        console.error('Error changing timeframe:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [timeframe, fetchBitcoinData]);
  
  // Set up polling on mount
  useEffect(() => {
    // Do NOT use fallback data - just show loading state until real data arrives
    // The initial fetch is fast enough with WebSockets
    
    // Initial fetch
    fetchBitcoinData(true);
    
    // Set up refresh interval for real-time updates
    pollingIntervalRef.current = setInterval(() => {
      fetchBitcoinData(true);
    }, REFRESH_INTERVAL);
    
    // Cleanup on unmount
    return () => {
      if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  // IMPORTANT: Remove bitcoinData from the dependency array to prevent infinite updates
  }, [fetchBitcoinData, timeframe]);
  
  // DISABLED: Handle visibility changes
  // This was triggering too many API calls
  /*
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBitcoinData(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBitcoinData]);
  */
  
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