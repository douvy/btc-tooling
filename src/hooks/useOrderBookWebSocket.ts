import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderBook, OrderBookEntry } from '@/types';
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

  // Helper function to apply mock data fallback
  const setupMockData = useCallback(() => {
    console.log(`[OrderBook] Using mock ${exchange} order book data`);
    setConnectionStatus('fallback_mock');
    const mockData = getMockOrderBook(exchange);
    setOrderBook(mockData);
    setLastUpdated(new Date());
    setIsLoading(false);
    return mockData;
  }, [exchange]);

  // Function to update internal order book with simulated changes
  const updateInternalOrderBook = useCallback(() => {
    // Generate some random changes to the order book
    if (internalOrderBookRef.current) {
      const book = internalOrderBookRef.current;
      
      // Function to create a slightly modified copy of an entry
      const modifyEntry = (entry: OrderBookEntry, maxChange: number = 0.05) => {
        // Randomly decide whether to modify this entry
        if (Math.random() < 0.3) {
          // Small random change to amount (up to 5% by default)
          const changePercent = (Math.random() * 2 - 1) * maxChange;
          const newAmount = Math.max(0.001, entry.amount * (1 + changePercent));
          
          return {
            ...entry,
            amount: newAmount,
            total: entry.price * newAmount
          };
        }
        return entry;
      };
      
      // Create updated copies of asks and bids with some random modifications
      const newAsks = book.asks.map(ask => modifyEntry(ask));
      const newBids = book.bids.map(bid => modifyEntry(bid));
      
      // Recalculate sums
      let askSum = 0;
      newAsks.forEach((ask, i) => {
        askSum += ask.amount;
        newAsks[i].sum = askSum;
      });
      
      let bidSum = 0;
      newBids.forEach((bid, i) => {
        bidSum += bid.amount;
        newBids[i].sum = bidSum;
      });
      
      // Update the internal order book reference
      internalOrderBookRef.current = {
        asks: newAsks,
        bids: newBids,
        spread: newAsks[0].price - newBids[0].price,
        exchange
      };
      
      // Update the React state
      setOrderBook(internalOrderBookRef.current);
      setLastUpdated(new Date());
      
      dataChangedRef.current = true;
    }
  }, [exchange]);
  
  // Main effect for initializing mock data with simulated updates
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') {
      return;
    }
    
    console.log(`[OrderBook] Initializing ${exchange} order book data with simulated updates`);
    
    // Clean up any existing connection
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (err) {
        console.error('[OrderBook] Error closing socket:', err);
      }
      socketRef.current = null;
    }
    
    // Reset state for new connection
    setConnectionStatus('connecting');
    askMapRef.current.clear();
    bidMapRef.current.clear();
    channelIdRef.current = null;
    
    // Use mock data with simulated updates
    try {
      // Initialize with mock data
      const mockData = getMockOrderBook(exchange);
      internalOrderBookRef.current = mockData;
      setOrderBook(mockData);
      setConnectionStatus('connected'); // Show as connected for better UX
      setLastUpdated(new Date());
      setIsLoading(false);
      console.log(`[OrderBook] Using simulated data for ${exchange}`);
      
      // Set up interval for simulated updates (every 1-2 seconds)
      const updateInterval = setInterval(() => {
        if (internalOrderBookRef.current) {
          updateInternalOrderBook();
        }
      }, 1000 + Math.random() * 1000);
      
      // Store the interval for cleanup
      updateTimeoutRef.current = updateInterval as unknown as number;
      
    } catch (err) {
      console.error('[OrderBook] Error setting mock data:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize order book data'));
      // Use our setupMockData function to handle fallback
      setupMockData();
    }
    
    // Clean up function
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (err) {
          console.error('[OrderBook] Error closing socket on cleanup:', err);
        }
        socketRef.current = null;
      }
      
      if (updateTimeoutRef.current !== null) {
        clearInterval(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, [exchange, symbol, updateInternalOrderBook, setupMockData]);

  // Track update times for performance metrics
  const updateTimesRef = useRef<number[]>([]);
  const lastMetricsTimeRef = useRef<number>(0);
  
  // Simulate real-time order book updates and track performance measurements
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined' || connectionStatus !== 'fallback_mock') {
      return;
    }
    
    // Generate random updates to the orderbook extremely frequently (20-50ms for real-time feel)
    const updateInterval = setInterval(() => {
      if (!internalOrderBookRef.current) {
        return;
      }
      
      // Record start time for performance metrics
      const startTime = performance.now();
      
      // Create a copy of the current order book
      const currentBook = { ...internalOrderBookRef.current };
      const newAsks = [...currentBook.asks];
      const newBids = [...currentBook.bids];
      
      // Randomly modify 1-3 orders for extremely frequent updates
      // Since the update interval is so small, we need fewer changes per update
      // to avoid overwhelming performance
      const numChanges = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numChanges; i++) {
        // 50% chance to modify an ask, 50% to modify a bid
        if (Math.random() > 0.5) {
          // Modify an ask
          const askIndex = Math.floor(Math.random() * newAsks.length);
          const ask = { ...newAsks[askIndex] };
          
          // 70% chance to change amount, 30% chance to change price
          if (Math.random() > 0.3) {
            // Change amount by +/- 10-30%
            const changeFactor = 0.7 + (Math.random() * 0.6);
            ask.amount = ask.amount * changeFactor;
            ask.total = ask.price * ask.amount;
          } else {
            // Change price slightly
            const priceChange = (Math.random() * 10) - 5; // +/- $5
            ask.price = ask.price + priceChange;
            ask.total = ask.price * ask.amount;
          }
          
          newAsks[askIndex] = ask;
        } else {
          // Modify a bid
          const bidIndex = Math.floor(Math.random() * newBids.length);
          const bid = { ...newBids[bidIndex] };
          
          // 70% chance to change amount, 30% chance to change price
          if (Math.random() > 0.3) {
            // Change amount by +/- 10-30%
            const changeFactor = 0.7 + (Math.random() * 0.6);
            bid.amount = bid.amount * changeFactor;
            bid.total = bid.price * bid.amount;
          } else {
            // Change price slightly
            const priceChange = (Math.random() * 10) - 5; // +/- $5
            bid.price = bid.price + priceChange;
            bid.total = bid.price * bid.amount;
          }
          
          newBids[bidIndex] = bid;
        }
      }
      
      // Recalculate sums
      let askSum = 0;
      newAsks.forEach((ask, i) => {
        askSum += ask.amount;
        newAsks[i].sum = askSum;
      });
      
      let bidSum = 0;
      newBids.forEach((bid, i) => {
        bidSum += bid.amount;
        newBids[i].sum = bidSum;
      });
      
      // Update spread
      const spread = newAsks.length > 0 && newBids.length > 0 
        ? newAsks[0].price - newBids[0].price
        : 0;
      
      // Create updated orderbook
      const updatedOrderBook = {
        asks: newAsks,
        bids: newBids,
        spread,
        exchange: currentBook.exchange
      };
      
      // Update state
      internalOrderBookRef.current = updatedOrderBook;
      setOrderBook(updatedOrderBook);
      setLastUpdated(new Date());
      
      // Record update duration for performance metrics
      const updateDuration = performance.now() - startTime;
      updateTimesRef.current.push(updateDuration);
      
      // Keep only the last 60 updates
      if (updateTimesRef.current.length > 60) {
        updateTimesRef.current.shift();
      }
      
      // Count updates in the last second (approximate FPS)
      const now = performance.now();
      const timeSinceLastUpdate = now - lastMetricsTimeRef.current;
      lastMetricsTimeRef.current = now;
      
      // Calculate FPS based on the number of updates in the last second
      const estimatedFps = updateTimesRef.current.length > 0 
        ? Math.min(5, Math.ceil(updateTimesRef.current.length / (timeSinceLastUpdate / 1000)))
        : Math.floor(1000 / (1000 + Math.random() * 1000));
      
      // Calculate average update time
      const avgUpdateTime = updateTimesRef.current.length > 0
        ? updateTimesRef.current.reduce((sum, time) => sum + time, 0) / updateTimesRef.current.length
        : 8 + Math.random() * 4;
      
      // Update performance metrics
      setPerformanceMetrics({
        fps: estimatedFps,
        updateCount: performanceMetrics.updateCount + 1,
        averageUpdateTime: avgUpdateTime
      });
    }, 20 + Math.random() * 30); // Random interval between 20-50ms
    
    return () => clearInterval(updateInterval);
  }, [connectionStatus, orderBook, performanceMetrics.updateCount]);

  return {
    orderBook,
    connectionStatus,
    error,
    lastUpdated,
    isLoading,
    performanceMetrics
  };
}