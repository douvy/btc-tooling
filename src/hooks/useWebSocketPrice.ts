import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { TimeFrame, BitcoinPrice } from '@/types';
import { extractTimeframeData } from '@/lib/priceUtils';
import { getBitcoinPrice } from '@/lib/api';

interface UseWebSocketPriceResult {
  bitcoinData: BitcoinPrice | null;
  isLoading: boolean;
  error: Error | null;
  latency: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  setTimeframe: (timeframe: TimeFrame) => void;
  timeframe: TimeFrame;
}

// Cache for timeframe data to make switching faster
interface TimeframeCache {
  [key: string]: BitcoinPrice;
}

/**
 * Ensures the WebSocket server is initialized before connecting
 */
const initializeWebSocketServer = async (): Promise<void> => {
  // Send a GET request to the socket endpoint to initialize the server
  await fetch('/api/socket');
};

export function useWebSocketPrice(initialTimeframe: TimeFrame = '1D'): UseWebSocketPriceResult {
  const [bitcoinData, setBitcoinData] = useState<BitcoinPrice | null>(null);
  const [timeframe, setTimeframe] = useState<TimeFrame>(initialTimeframe);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  // Store full raw data for quick timeframe recalculation
  const rawDataRef = useRef<any>(null);
  // Store processed data for each timeframe to avoid recalculation
  const timeframeCacheRef = useRef<TimeframeCache>({});
  
  const socketRef = useRef<Socket | null>(null);
  const requestTimeRef = useRef<number>(0);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const socketInitializedRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  
  // Enhanced direct API data fetch with proper error handling and loading state management
  const fetchFallbackData = useCallback(async (forceLoading = false, specificTimeframe?: TimeFrame) => {
    // Prevent concurrent fetch requests
    if (isProcessingRef.current) {
      console.log('[WebSocket] Already processing a fetch request, skipping duplicate');
      return;
    }
    
    isProcessingRef.current = true;
    const targetTimeframe = specificTimeframe || timeframe;
    
    try {
      console.log(`[WebSocket] Directly fetching fresh data for ${targetTimeframe} from API`);
      
      // Show loading state if forced (for initial load, not timeframe changes)
      if (forceLoading) {
        setIsLoading(true);
      }
      
      // Track API request time
      const startTime = performance.now();
      
      // Get fresh data for the current timeframe
      const data = await getBitcoinPrice(targetTimeframe);
      const endTime = performance.now();
      
      // Calculate and track API latency
      const requestLatency = Math.round(endTime - startTime);
      setLatency(requestLatency);
      
      console.log(`[WebSocket] Got fresh data from API in ${requestLatency}ms for timeframe ${targetTimeframe}`);
      
      // Verify the data is valid before updating state
      if (data && typeof data.price === 'number' && typeof data.changePercent === 'number') {
        console.log(`[WebSocket] Data values: $${data.price.toFixed(2)}, ${data.changePercent.toFixed(2)}%, $${data.change.toFixed(2)}`);
        
        // Store this timeframe's processed data in the cache
        timeframeCacheRef.current[targetTimeframe] = data;
        
        // Only update state if this is for the current timeframe or if target was specified
        if (targetTimeframe === timeframe) {
          // Update Bitcoin data state with fresh values
          setBitcoinData(data);
          
          // Clear any previous errors
          setError(null);
        }
      } else {
        // Invalid data format, handled silently
        if (targetTimeframe === timeframe) {
          setError(new Error('Invalid data format from API'));
        }
      }
      
      // Always clear loading state when done (for the current timeframe)
      if (targetTimeframe === timeframe) {
        setIsLoading(false);
      }
    } catch (err) {
      if (targetTimeframe === timeframe) {
        setError(err instanceof Error ? err : new Error('Failed to fetch Bitcoin data'));
        setIsLoading(false);
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [timeframe]);
  
  // Initialize and manage WebSocket connection
  useEffect(() => {
    let mounted = true;
    
    const setupSocket = async () => {
      try {
        // Initialize the WebSocket server if not already done
        if (!socketInitializedRef.current) {
          await initializeWebSocketServer();
          socketInitializedRef.current = true;
        }
        
        // Create socket connection if it doesn't exist
        if (!socketRef.current) {
          // Use absolute URL for WebSocket to ensure it works in production
          const socketUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
          
          console.log('[WebSocket] Connecting to WebSocket server...');
          setConnectionStatus('connecting');
          
          // Connect to the WebSocket server
          socketRef.current = io(socketUrl, {
            path: '/api/socket',
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
          });
        }

        const socket = socketRef.current;
        
        // Handle WebSocket events
        socket.on('connect', () => {
          if (!mounted) return;
          
          console.log('[WebSocket] Connected successfully');
          setConnectionStatus('connected');
          setError(null);
          
          // Subscribe to the current timeframe
          requestTimeRef.current = Date.now();
          socket.emit('subscribe', timeframe);
        });
        
        socket.on('disconnect', () => {
          if (!mounted) return;
          
          console.log('[WebSocket] Disconnected');
          setConnectionStatus('disconnected');
          
          // Start fallback REST API timer
          if (!fallbackTimerRef.current) {
            fallbackTimerRef.current = setTimeout(() => {
              fetchFallbackData(true);
            }, 2000);
          }
        });
        
        socket.on('connect_error', (err: Error) => {
          if (!mounted) return;
          
          setConnectionStatus('disconnected');
          setError(new Error(`WebSocket connection error: ${err.message}`));
          
          // Use fallback REST API
          fetchFallbackData(true);
        });
        
        socket.on('crypto_update', (message: {timeframe: TimeFrame, data: any}) => {
          if (!mounted) return;
          
          // Calculate latency
          const receiveTime = Date.now();
          const latencyValue = receiveTime - requestTimeRef.current;
          setLatency(latencyValue);
          
          // Process the data
          try {
            console.log('[WebSocket] Received update for', message.timeframe, 'timeframe');
            
            if (message.data && message.data.market_data) {
              // Store the full raw data for all timeframe calculations
              rawDataRef.current = message.data;
              
              // Log the current price from the data for debugging
              const price = message.data.market_data?.current_price?.usd;
              if (price) {
                console.log(`[WebSocket] Received current price: $${price.toFixed(2)}`);
              }
              
              // Pre-calculate data for all timeframes and store in cache
              // This enables instant timeframe switching
              const timeframes: TimeFrame[] = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];
              
              timeframes.forEach(tf => {
                try {
                  const extractedData = extractTimeframeData(message.data, tf);
                  timeframeCacheRef.current[tf] = extractedData;
                  
                  // If this is our current timeframe, update the displayed data
                  if (tf === timeframe) {
                    setBitcoinData(extractedData);
                    setIsLoading(false);
                    setError(null);
                  }
                } catch (err) {
                }
              });
            }
          } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to process data'));
          }
        });
        
        socket.on('error', (errorData: {message?: string}) => {
          if (!mounted) return;
          
          setError(new Error(errorData.message || 'Unknown WebSocket error'));
          
          // Use fallback REST API
          fetchFallbackData(true);
        });
        
      } catch (err) {
        fetchFallbackData(true);
      }
    };
    
    setupSocket();
    
    // Cleanup on unmount
    return () => {
      mounted = false;
      
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      
      if (socketRef.current) {
        console.log('[WebSocket] Disconnecting on unmount');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [fetchFallbackData]); // Remove timeframe from dependencies to prevent reconnection on timeframe change
  
  // Pre-fetch data for all timeframes when connected
  useEffect(() => {
    // Only run once when connected
    if (connectionStatus === 'connected' && !isLoading && bitcoinData) {
      // Get data for all timeframes to populate the cache
      const timeframes: TimeFrame[] = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];
      
      // Filter out the current timeframe as we already have that data
      const timeframesToFetch = timeframes.filter(tf => tf !== timeframe);
      
      // Check if we have raw data to calculate from
      if (rawDataRef.current) {
        console.log('[WebSocket] Calculating data for all timeframes from raw data');
        timeframesToFetch.forEach(tf => {
          try {
            const calculatedData = extractTimeframeData(rawDataRef.current, tf);
            timeframeCacheRef.current[tf] = calculatedData;
          } catch (err) {
          }
        });
      } else {
        // If we don't have raw data, fetch each timeframe in the background
        timeframesToFetch.forEach(tf => {
          console.log(`[WebSocket] Background fetching data for ${tf} timeframe`);
          // Use setTimeout to stagger requests and avoid overwhelming the API
          setTimeout(() => {
            fetchFallbackData(false, tf);
          }, 200 * timeframesToFetch.indexOf(tf)); // Stagger requests by 200ms each
        });
      }
    }
  }, [connectionStatus, isLoading, bitcoinData, timeframe, fetchFallbackData]);
  
  // SIMPLE and DIRECT timeframe switching for maximum reliability
  const handleTimeframeChange = useCallback((newTimeframe: TimeFrame) => {
    if (newTimeframe === timeframe) return;
    
    console.log(`🔄 TIMEFRAME CHANGE: ${timeframe} → ${newTimeframe}`);
    
    // 1. Update timeframe state immediately
    setTimeframe(newTimeframe);
    
    // 2. Show loading indicator briefly - better than showing wrong data
    setIsLoading(true);
    
    // 3. DIRECT API CALL - most reliable method
    // Skip all the fancy caching/calculation logic and just get fresh data
    fetchFallbackData(true, newTimeframe)
      .then(() => {
        // Done loading
        setIsLoading(false);
        
        // Also update socket subscription for ongoing updates
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('subscribe', newTimeframe);
        }
      })
      .catch(err => {
        setIsLoading(false);
        setError(new Error(`Failed to load ${newTimeframe} data`));
      });
  }, [timeframe, fetchFallbackData]);
  
  return {
    bitcoinData,
    isLoading,
    error,
    latency,
    connectionStatus,
    setTimeframe: handleTimeframeChange,
    timeframe
  };
}