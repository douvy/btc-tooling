import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderBook } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';
import { fetchOrderBook } from '@/lib/api/orderbook';

type ConnectionStatus = 
  | 'connected'      // WebSocket is connected and receiving data
  | 'connecting'     // Initial connection attempt
  | 'reconnecting'   // Reconnection attempt after failure
  | 'disconnected'   // Disconnected, not trying to reconnect
  | 'error'          // Error state, will try to reconnect
  | 'fallback_rest'  // Using REST API fallback
  | 'fallback_cache' // Using cached data fallback
  | 'fallback_mock'; // Using mock data fallback
type Exchange = 'bitfinex' | 'coinbase' | 'binance';

// WebSocket URLs for different exchanges
const BITFINEX_WEBSOCKET_URL = 'wss://api-pub.bitfinex.com/ws/2';
const COINBASE_WEBSOCKET_URL = 'wss://ws-feed.exchange.coinbase.com';
const BINANCE_WEBSOCKET_URL = 'wss://stream.binance.com:9443/ws';

// Structure for Bitfinex order book entry [price, count, amount]
type BitfinexOrderBookEntry = [number, number, number];

// Structure for Coinbase order book - different format
interface CoinbaseOrderBookSnapshot {
  type: string;
  product_id: string;
  asks: string[][];
  bids: string[][];
}

interface CoinbaseOrderBookDelta {
  type: string;
  product_id: string;
  changes: string[][];
}

// Structure for Binance order book - different format
interface BinanceOrderBookSnapshot {
  lastUpdateId: number;
  bids: string[][];
  asks: string[][];
}

interface BinanceOrderBookDelta {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: string[][]; // Bids to be updated
  a: string[][]; // Asks to be updated
}

interface PerformanceMetrics {
  fps: number;
  updateCount: number;
  averageUpdateTime: number;
}

interface UseOrderBookWebSocketResult {
  orderBook: OrderBook | null;
  connectionStatus: ConnectionStatus;
  error: Error | null;
  lastUpdated: Date;
  isLoading: boolean;
  performanceMetrics: PerformanceMetrics;
}

interface FallbackOptions {
  restAttempts: number;
  restTimeoutMs: number;
  maxReconnectAttempts: number;
  initialReconnectDelayMs: number;
  maxReconnectDelayMs: number;
  cacheTimeoutMs: number;
}

/**
 * Custom hook for connecting to WebSocket APIs and retrieving order book data
 */
export function useOrderBookWebSocket(
  symbol: string = 'BTCUSD',
  exchange: Exchange = 'bitfinex',
  precision: string = 'P0',
  frequency: string = 'F0',
  fpsLimit: number = 5,
  fallbackOptions: Partial<FallbackOptions> = {}
): UseOrderBookWebSocketResult {
  // Merge default options with provided options
  const options: FallbackOptions = {
    restAttempts: 3,
    restTimeoutMs: 3000,
    maxReconnectAttempts: 5,
    initialReconnectDelayMs: 1000,
    maxReconnectDelayMs: 30000,
    cacheTimeoutMs: 60000,
    ...fallbackOptions
  };

  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    updateCount: 0,
    averageUpdateTime: 0
  });
  
  const socketRef = useRef<WebSocket | null>(null);
  const askMapRef = useRef<Map<number, { price: number, count: number, amount: number }>>(new Map());
  const bidMapRef = useRef<Map<number, { price: number, count: number, amount: number }>>(new Map());
  const channelIdRef = useRef<number | null>(null);
  const updateTimeoutRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const dataChangedRef = useRef<boolean>(false);
  const internalOrderBookRef = useRef<OrderBook | null>(null);
  const cachedOrderBookRef = useRef<OrderBook | null>(null);
  const cacheTimestampRef = useRef<number>(0);

  // Function to use mock data as fallback
  const useMockFallback = useCallback(() => {
    console.log(`[OrderBook] Using mock ${exchange} order book data`);
    setConnectionStatus('fallback_mock');
    const mockData = getMockOrderBook(exchange);
    setOrderBook(mockData);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [exchange]);

  // Main effect for initializing WebSocket connection or using mock data
  useEffect(() => {
    console.log(`[OrderBook] Initializing ${exchange} order book data`);
    
    // Clean up any existing connection
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    // Reset state for new connection
    setConnectionStatus('connecting');
    askMapRef.current.clear();
    bidMapRef.current.clear();
    channelIdRef.current = null;
    
    // Use mock data for simplicity
    const mockData = getMockOrderBook(exchange);
    setOrderBook(mockData);
    setConnectionStatus('fallback_mock');
    setLastUpdated(new Date());
    setIsLoading(false);
    
    // We'll implement a proper WebSocket connection in a future update
    
    // Clean up function
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      if (updateTimeoutRef.current !== null) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, [exchange, symbol]);

  // Update performance metrics occasionally
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics({
        fps: Math.floor(Math.random() * 5) + 1,  // Mock FPS value between 1-5
        updateCount: performanceMetrics.updateCount + 1,
        averageUpdateTime: Math.floor(Math.random() * 10) + 5  // Mock average time between 5-15ms
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [performanceMetrics.updateCount]);

  return {
    orderBook,
    connectionStatus,
    error,
    lastUpdated,
    isLoading,
    performanceMetrics
  };
}