import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeFrame, BitcoinPrice } from '@/types';
import { getBitcoinPrice } from '@/lib/api';

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
    setTimeframe(newTimeframe);
    
    if (timeframesCache[newTimeframe]) {
      setBitcoinData(timeframesCache[newTimeframe]);
      Promise.resolve().then(() => fetchBitcoinData(true));
    } else {
      setIsLoading(true);
      fetchBitcoinData(true);
    }
  }, [timeframe, timeframesCache, fetchBitcoinData]);
  
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