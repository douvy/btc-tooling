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
  
  const socketRef = useRef<Socket | null>(null);
  const requestTimeRef = useRef<number>(0);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const socketInitializedRef = useRef<boolean>(false);
  
  // Fallback to REST API if WebSocket fails
  const fetchFallbackData = useCallback(async () => {
    try {
      console.log('[WebSocket] Using fallback REST API');
      const startTime = performance.now();
      const data = await getBitcoinPrice(timeframe);
      const endTime = performance.now();
      
      // Track latency for the REST API as well
      setLatency(Math.round(endTime - startTime));
      setBitcoinData(data);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch Bitcoin data'));
      setIsLoading(false);
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
              fetchFallbackData();
            }, 2000);
          }
        });
        
        socket.on('connect_error', (err) => {
          if (!mounted) return;
          
          console.error('[WebSocket] Connection error:', err);
          setConnectionStatus('disconnected');
          setError(new Error(`WebSocket connection error: ${err.message}`));
          
          // Use fallback REST API
          fetchFallbackData();
        });
        
        socket.on('crypto_update', (message) => {
          if (!mounted) return;
          
          // Calculate latency
          const receiveTime = Date.now();
          const latencyValue = receiveTime - requestTimeRef.current;
          setLatency(latencyValue);
          
          // Process the data
          try {
            console.log('[WebSocket] Received update for', message.timeframe, 'timeframe');
            
            if (message.data && message.timeframe === timeframe) {
              const extractedData = extractTimeframeData(message.data, timeframe);
              setBitcoinData(extractedData);
              setIsLoading(false);
              setError(null);
            }
          } catch (err) {
            console.error('[WebSocket] Error processing data:', err);
            setError(err instanceof Error ? err : new Error('Failed to process data'));
          }
        });
        
        socket.on('error', (errorData) => {
          if (!mounted) return;
          
          console.error('[WebSocket] Error event:', errorData);
          setError(new Error(errorData.message || 'Unknown WebSocket error'));
          
          // Use fallback REST API
          fetchFallbackData();
        });
        
      } catch (err) {
        console.error('[WebSocket] Setup error:', err);
        fetchFallbackData();
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
  }, [timeframe, fetchFallbackData]);
  
  // Handle timeframe changes
  const handleTimeframeChange = useCallback((newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe);
    setIsLoading(true);
    
    // Request new data for the timeframe via WebSocket
    if (socketRef.current && socketRef.current.connected) {
      console.log('[WebSocket] Requesting new timeframe:', newTimeframe);
      requestTimeRef.current = Date.now();
      socketRef.current.emit('subscribe', newTimeframe);
    } else {
      // Fallback to REST API if WebSocket is not connected
      fetchFallbackData();
    }
  }, [fetchFallbackData]);
  
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