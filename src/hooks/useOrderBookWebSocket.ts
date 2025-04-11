import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderBook } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
type Exchange = 'bitfinex' | 'coinbase' | 'binance';

const BITFINEX_WEBSOCKET_URL = 'wss://api-pub.bitfinex.com/ws/2';

// Structure for Bitfinex order book entry [price, count, amount]
type BitfinexOrderBookEntry = [number, number, number];

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

/**
 * Custom hook for connecting to Bitfinex WebSocket API and retrieving order book data
 */
export function useOrderBookWebSocket(
  symbol: string = 'BTCUSD',
  exchange: Exchange = 'bitfinex',
  precision: string = 'P0', // P0 for raw, P1, P2, P3, P4 for different precisions
  frequency: string = 'F0', // F0 = real-time, F1 = 2 sec
  fpsLimit: number = 5 // Limit updates to 5 fps as per spec
): UseOrderBookWebSocketResult {
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimeoutRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const dataChangedRef = useRef<boolean>(false);
  const internalOrderBookRef = useRef<OrderBook | null>(null);
  
  // Performance tracking
  const updateTimesRef = useRef<number[]>([]);
  const updateStartTimeRef = useRef<number>(0);
  const fpsCounterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update the React state in a throttled way to respect FPS limit
  const scheduleStateUpdate = useCallback(() => {
    // If no changes were made, don't schedule an update
    if (!dataChangedRef.current) return;
    
    // Throttle updates based on FPS limit (minimum time between updates)
    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    const minUpdateInterval = 1000 / fpsLimit; // ms between updates
    
    // If an update is already scheduled, don't schedule another one
    if (updateTimeoutRef.current !== null) return;
    
    // If we have pending updates and enough time has passed, update immediately
    if (timeSinceLastUpdate >= minUpdateInterval) {
      // Update immediately
      updateState();
    } else {
      // Schedule update after the remaining time
      const timeUntilNextUpdate = minUpdateInterval - timeSinceLastUpdate;
      pendingUpdatesRef.current = true;
      
      updateTimeoutRef.current = window.setTimeout(() => {
        updateState();
        updateTimeoutRef.current = null;
      }, timeUntilNextUpdate);
    }
  }, [fpsLimit]);
  
  // Function to update the React state with current order book data
  const updateState = useCallback(() => {
    if (!internalOrderBookRef.current) return;
    
    // Start timing the update
    updateStartTimeRef.current = performance.now();
    
    setOrderBook(internalOrderBookRef.current);
    setLastUpdated(new Date());
    setIsLoading(false);
    setError(null);
    
    // Record performance metrics
    const updateEndTime = performance.now();
    const updateDuration = updateEndTime - updateStartTimeRef.current;
    updateTimesRef.current.push(updateDuration);
    
    // Only keep the last 60 updates (approximately 12 seconds at 5fps)
    if (updateTimesRef.current.length > 60) {
      updateTimesRef.current.shift();
    }
    
    lastUpdateTimeRef.current = updateEndTime;
    pendingUpdatesRef.current = false;
    dataChangedRef.current = false;
  }, []);
  
  // Process updates to the internal order book structure
  const updateInternalOrderBook = useCallback(() => {
    // Convert maps to arrays and sort
    const asks = Array.from(askMapRef.current.values())
      .map(entry => ({
        price: entry.price,
        amount: entry.amount,
        total: entry.price * entry.amount,
        sum: 0 // Will be calculated below
      }))
      .sort((a, b) => a.price - b.price); // Ascending: lowest ask price first

    const bids = Array.from(bidMapRef.current.values())
      .map(entry => ({
        price: entry.price,
        amount: entry.amount,
        total: entry.price * entry.amount,
        sum: 0 // Will be calculated below
      }))
      .sort((a, b) => b.price - a.price); // Descending: highest bid price first

    // Calculate cumulative sums
    let askSum = 0;
    asks.forEach((ask, i) => {
      askSum += ask.amount;
      asks[i].sum = askSum;
    });

    let bidSum = 0;
    bids.forEach((bid, i) => {
      bidSum += bid.amount;
      bids[i].sum = bidSum;
    });

    // Calculate spread
    const spread = asks.length > 0 && bids.length > 0 
      ? asks[0].price - bids[0].price 
      : 0;

    // Update internal order book reference
    internalOrderBookRef.current = {
      asks: asks.slice(0, 100), // Limit to prevent performance issues
      bids: bids.slice(0, 100), // Limit to prevent performance issues
      spread,
      exchange
    };
    
    // Mark that data has changed
    dataChangedRef.current = true;
    
    // Schedule a state update (respecting FPS limit)
    scheduleStateUpdate();
  }, [exchange, scheduleStateUpdate]);

  // Function to process order book data from Bitfinex
  const processOrderBookData = useCallback((data: BitfinexOrderBookEntry[]) => {
    let hasChanges = false;
    
    // Process each entry
    data.forEach(([price, count, amount]) => {
      // Bitfinex uses positive amount for bids, negative for asks
      if (amount > 0) {
        // Bid (buy order)
        if (count === 0) {
          // Count 0 means remove this price level
          if (bidMapRef.current.has(price)) {
            bidMapRef.current.delete(price);
            hasChanges = true;
          }
        } else {
          // Only update if the entry is new or has changed
          const existing = bidMapRef.current.get(price);
          if (!existing || existing.count !== count || existing.amount !== amount) {
            bidMapRef.current.set(price, { price, count, amount });
            hasChanges = true;
          }
        }
      } else if (amount < 0) {
        // Ask (sell order)
        const absAmount = Math.abs(amount);
        if (count === 0) {
          // Count 0 means remove this price level
          if (askMapRef.current.has(price)) {
            askMapRef.current.delete(price);
            hasChanges = true;
          }
        } else {
          // Only update if the entry is new or has changed
          const existing = askMapRef.current.get(price);
          if (!existing || existing.count !== count || existing.amount !== absAmount) {
            askMapRef.current.set(price, { price, count, amount: absAmount });
            hasChanges = true;
          }
        }
      }
    });

    // Only update the book if we actually had changes
    if (hasChanges) {
      updateInternalOrderBook();
    }
  }, [updateInternalOrderBook]);

  // Initialize Bitfinex WebSocket
  const initWebSocket = useCallback(() => {
    // Only implement Bitfinex for now, add others later
    if (exchange !== 'bitfinex') {
      // Use mock data for non-Bitfinex exchanges
      const mockData = getMockOrderBook(exchange);
      setOrderBook(mockData);
      setConnectionStatus('disconnected');
      setIsLoading(false);
      setError(new Error(`Live data not yet available for ${exchange}. Using mock data.`));
      return;
    }

    // Clear previous connection if exists
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Reset state
    setConnectionStatus('connecting');
    askMapRef.current.clear();
    bidMapRef.current.clear();
    channelIdRef.current = null;

    try {
      // Create new WebSocket connection
      socketRef.current = new WebSocket(BITFINEX_WEBSOCKET_URL);

      // Handle WebSocket events
      socketRef.current.onopen = () => {
        console.log('[OrderBook WebSocket] Connected to Bitfinex');
        setConnectionStatus('connected');
        setError(null);

        // Subscribe to order book
        if (socketRef.current) {
          const subscribeMsg = JSON.stringify({
            event: 'subscribe',
            channel: 'book',
            symbol: `t${symbol}`, // Bitfinex prefixes trading pairs with 't'
            prec: precision,
            freq: frequency,
            len: '25' // Number of price points on each side
          });
          socketRef.current.send(subscribeMsg);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log(`[OrderBook WebSocket] Closed (${event.code}): ${event.reason}`);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after a delay
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[OrderBook WebSocket] Attempting to reconnect...');
            initWebSocket();
          }, 5000);
        }
      };

      socketRef.current.onerror = (event) => {
        console.error('[OrderBook WebSocket] Error:', event);
        setError(new Error('WebSocket connection error'));
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.event === 'subscribed' && data.channel === 'book') {
            console.log('[OrderBook WebSocket] Subscribed to order book:', data);
            channelIdRef.current = data.chanId;
          } 
          // Handle snapshot (initial data)
          else if (Array.isArray(data) && data[0] === channelIdRef.current && Array.isArray(data[1])) {
            // Check if it's a snapshot (array of arrays)
            if (Array.isArray(data[1][0])) {
              console.log('[OrderBook WebSocket] Received order book snapshot');
              processOrderBookData(data[1]);
            } 
            // Handle update (single order book entry)
            else if (Array.isArray(data[1]) && !Array.isArray(data[1][0])) {
              processOrderBookData([data[1]]);
            }
          }
        } catch (err) {
          console.error('[OrderBook WebSocket] Failed to process message:', err, event.data);
          setError(err instanceof Error ? err : new Error('Failed to process WebSocket message'));
        }
      };
    } catch (err) {
      console.error('[OrderBook WebSocket] Failed to initialize WebSocket:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize WebSocket'));
      setConnectionStatus('disconnected');
      
      // Use mock data as fallback
      const mockData = getMockOrderBook(exchange);
      setOrderBook(mockData);
      setIsLoading(false);
    }
  }, [exchange, symbol, precision, frequency, processOrderBookData]);

  // Set up performance metrics calculation
  useEffect(() => {
    // Update performance metrics every second
    fpsCounterIntervalRef.current = setInterval(() => {
      const now = performance.now();
      const oneSecondAgo = now - 1000;
      
      // Count updates in the last second
      const recentUpdates = updateTimesRef.current.filter(time => time >= oneSecondAgo);
      const currentFps = recentUpdates.length;
      
      // Calculate average update time
      const avgUpdateTime = updateTimesRef.current.length > 0
        ? updateTimesRef.current.reduce((sum, time) => sum + time, 0) / updateTimesRef.current.length
        : 0;
      
      // Update metrics
      setPerformanceMetrics({
        fps: currentFps,
        updateCount: updateTimesRef.current.length,
        averageUpdateTime: avgUpdateTime
      });
    }, 1000);
    
    // Cleanup
    return () => {
      if (fpsCounterIntervalRef.current) {
        clearInterval(fpsCounterIntervalRef.current);
        fpsCounterIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize and clean up WebSocket connection
  useEffect(() => {
    initWebSocket();

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clear any pending updates
      if (updateTimeoutRef.current !== null) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
      // Clean up FPS counter
      if (fpsCounterIntervalRef.current) {
        clearInterval(fpsCounterIntervalRef.current);
        fpsCounterIntervalRef.current = null;
      }
      
      pendingUpdatesRef.current = false;
      dataChangedRef.current = false;
    };
  }, [initWebSocket]);

  // Use mock data as fallback for initial load
  useEffect(() => {
    if (isLoading && !orderBook) {
      const mockData = getMockOrderBook(exchange);
      
      // Store in internal state
      internalOrderBookRef.current = mockData;
      
      // Update the React state immediately for initial load
      setOrderBook(mockData);
      setLastUpdated(new Date());
      lastUpdateTimeRef.current = performance.now();
    }
  }, [isLoading, orderBook, exchange]);

  return {
    orderBook,
    connectionStatus,
    error,
    lastUpdated,
    isLoading,
    performanceMetrics
  };
}