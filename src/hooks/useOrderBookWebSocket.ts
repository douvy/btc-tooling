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
interface CoinbaseOrderBookEntry {
  price: string;
  size: string;
  side: 'buy' | 'sell';
}

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

/**
 * Custom hook for connecting to Bitfinex WebSocket API and retrieving order book data
 */
interface FallbackOptions {
  restAttempts: number;
  restTimeoutMs: number;
  maxReconnectAttempts: number;
  initialReconnectDelayMs: number;
  maxReconnectDelayMs: number;
  cacheTimeoutMs: number;
}

export function useOrderBookWebSocket(
  symbol: string = 'BTCUSD',
  exchange: Exchange = 'bitfinex',
  precision: string = 'P0', // P0 for raw, P1, P2, P3, P4 for different precisions
  frequency: string = 'F0', // F0 = real-time, F1 = 2 sec
  fpsLimit: number = 5, // Limit updates to 5 fps as per spec
  fallbackOptions: Partial<FallbackOptions> = {}
): UseOrderBookWebSocketResult {
  // Merge default options with provided options
  const options: FallbackOptions = {
    restAttempts: 3,                   // Number of REST API fallback attempts before using cache
    restTimeoutMs: 3000,               // Timeout for REST API requests
    maxReconnectAttempts: 5,           // Maximum WebSocket reconnect attempts
    initialReconnectDelayMs: 1000,     // Initial delay before reconnecting (doubled each attempt)
    maxReconnectDelayMs: 30000,        // Maximum delay between reconnect attempts
    cacheTimeoutMs: 60000,             // How long cached data is considered "fresh"
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const restAttemptCountRef = useRef<number>(0);
  const updateTimeoutRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const dataChangedRef = useRef<boolean>(false);
  const internalOrderBookRef = useRef<OrderBook | null>(null);
  const cachedOrderBookRef = useRef<OrderBook | null>(null);
  const cacheTimestampRef = useRef<number>(0);
  
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
    
    // Clone the order book to ensure we don't have reference issues
    const orderBookToUse = { ...internalOrderBookRef.current };
    
    // Update state values
    setOrderBook(orderBookToUse);
    setLastUpdated(new Date());
    setIsLoading(false);
    setError(null);
    
    // Store in cache for fallback
    cachedOrderBookRef.current = orderBookToUse;
    cacheTimestampRef.current = Date.now();
    
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
  
  // Function to use REST API fallback when WebSocket fails
  const fetchRESTFallback = useCallback(async () => {
    // Track that we're using the REST fallback
    setConnectionStatus('fallback_rest');
    
    try {
      console.log(`[OrderBook] Using REST API fallback for ${exchange}`);
      
      // Create an abort controller for the fetch timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.restTimeoutMs);
      
      // Fetch the order book from the REST API
      const fetchPromise = fetchOrderBook(exchange, symbol);
      const fallbackData = await Promise.race([
        fetchPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('REST API request timeout')), options.restTimeoutMs);
        })
      ]);
      
      clearTimeout(timeoutId);
      
      // Reset REST attempt count on successful fetch
      restAttemptCountRef.current = 0;
      
      // Update the internal order book
      internalOrderBookRef.current = fallbackData;
      
      // Update the React state
      setOrderBook(fallbackData);
      setLastUpdated(new Date());
      setIsLoading(false);
      
      // Store in cache for future fallbacks
      cachedOrderBookRef.current = fallbackData;
      cacheTimestampRef.current = Date.now();
      
      console.log(`[OrderBook] Successfully fetched ${exchange} order book via REST API`);
      
      return true;
    } catch (err) {
      console.error(`[OrderBook] Failed to fetch ${exchange} order book via REST API:`, err);
      
      // Increment REST attempt count
      restAttemptCountRef.current++;
      
      // Check if we've exceeded the max number of REST API attempts
      if (restAttemptCountRef.current >= options.restAttempts) {
        console.log(`[OrderBook] Exceeded max REST API attempts (${options.restAttempts}), using cache`);
        return false;
      }
      
      // Try again after a delay
      setTimeout(() => fetchRESTFallback(), 1000);
      return false;
    }
  }, [exchange, symbol, options.restAttempts, options.restTimeoutMs]);
  
  // Function to use cached data as fallback
  const useCachedFallback = useCallback(() => {
    // First try to use cache if it's still fresh
    if (cachedOrderBookRef.current && Date.now() - cacheTimestampRef.current < options.cacheTimeoutMs) {
      console.log(`[OrderBook] Using cached ${exchange} order book data`);
      setConnectionStatus('fallback_cache');
      setOrderBook(cachedOrderBookRef.current);
      setLastUpdated(new Date(cacheTimestampRef.current));
      setIsLoading(false);
      return true;
    }
    
    // If cache is stale or doesn't exist, use mock data
    console.log(`[OrderBook] No fresh cache available for ${exchange}, using mock data`);
    useMockFallback();
    return false;
  }, [exchange, options.cacheTimeoutMs]);
  
  // Function to use mock data as fallback
  const useMockFallback = useCallback(() => {
    console.log(`[OrderBook] Using mock ${exchange} order book data`);
    setConnectionStatus('fallback_mock');
    const mockData = getMockOrderBook(exchange);
    setOrderBook(mockData);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [exchange]);
  
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

  // Process Coinbase order book data
  const processCoinbaseOrderBookData = useCallback((data: CoinbaseOrderBookSnapshot | CoinbaseOrderBookDelta) => {
    let hasChanges = false;
    
    // Handle snapshot message
    if (data.type === 'snapshot') {
      const snapshot = data as CoinbaseOrderBookSnapshot;
      
      // Clear current maps
      askMapRef.current.clear();
      bidMapRef.current.clear();
      
      // Process asks
      snapshot.asks.forEach(([priceStr, sizeStr]) => {
        const price = parseFloat(priceStr);
        const amount = parseFloat(sizeStr);
        if (amount > 0) {
          askMapRef.current.set(price, { price, count: 1, amount });
          hasChanges = true;
        }
      });
      
      // Process bids
      snapshot.bids.forEach(([priceStr, sizeStr]) => {
        const price = parseFloat(priceStr);
        const amount = parseFloat(sizeStr);
        if (amount > 0) {
          bidMapRef.current.set(price, { price, count: 1, amount });
          hasChanges = true;
        }
      });
    }
    // Handle update message (l2update)
    else if (data.type === 'l2update') {
      const delta = data as CoinbaseOrderBookDelta;
      
      // Process changes
      delta.changes.forEach(([side, priceStr, sizeStr]) => {
        const price = parseFloat(priceStr);
        const amount = parseFloat(sizeStr);
        
        if (side === 'buy') {
          // Update bids
          if (amount === 0) {
            if (bidMapRef.current.has(price)) {
              bidMapRef.current.delete(price);
              hasChanges = true;
            }
          } else {
            const existingBid = bidMapRef.current.get(price);
            if (!existingBid || existingBid.amount !== amount) {
              bidMapRef.current.set(price, { price, count: 1, amount });
              hasChanges = true;
            }
          }
        } else if (side === 'sell') {
          // Update asks
          if (amount === 0) {
            if (askMapRef.current.has(price)) {
              askMapRef.current.delete(price);
              hasChanges = true;
            }
          } else {
            const existingAsk = askMapRef.current.get(price);
            if (!existingAsk || existingAsk.amount !== amount) {
              askMapRef.current.set(price, { price, count: 1, amount });
              hasChanges = true;
            }
          }
        }
      });
    }
    
    // Update internal book if any changes were made
    if (hasChanges) {
      updateInternalOrderBook();
    }
  }, [updateInternalOrderBook]);
  
  // Process Binance order book data
  const processBinanceOrderBookData = useCallback((data: BinanceOrderBookSnapshot | BinanceOrderBookDelta) => {
    let hasChanges = false;
    
    // Handle snapshot message
    if ('lastUpdateId' in data) {
      const snapshot = data as BinanceOrderBookSnapshot;
      
      // Clear current maps
      askMapRef.current.clear();
      bidMapRef.current.clear();
      
      // Process asks
      snapshot.asks.forEach(([priceStr, amountStr]) => {
        const price = parseFloat(priceStr);
        const amount = parseFloat(amountStr);
        if (amount > 0) {
          askMapRef.current.set(price, { price, count: 1, amount });
          hasChanges = true;
        }
      });
      
      // Process bids
      snapshot.bids.forEach(([priceStr, amountStr]) => {
        const price = parseFloat(priceStr);
        const amount = parseFloat(amountStr);
        if (amount > 0) {
          bidMapRef.current.set(price, { price, count: 1, amount });
          hasChanges = true;
        }
      });
    }
    // Handle update message (depth update)
    else if ('e' in data && data.e === 'depthUpdate') {
      const delta = data as BinanceOrderBookDelta;
      
      // Process asks
      delta.a.forEach(([priceStr, amountStr]) => {
        const price = parseFloat(priceStr);
        const amount = parseFloat(amountStr);
        
        if (amount === 0) {
          if (askMapRef.current.has(price)) {
            askMapRef.current.delete(price);
            hasChanges = true;
          }
        } else {
          const existingAsk = askMapRef.current.get(price);
          if (!existingAsk || existingAsk.amount !== amount) {
            askMapRef.current.set(price, { price, count: 1, amount });
            hasChanges = true;
          }
        }
      });
      
      // Process bids
      delta.b.forEach(([priceStr, amountStr]) => {
        const price = parseFloat(priceStr);
        const amount = parseFloat(amountStr);
        
        if (amount === 0) {
          if (bidMapRef.current.has(price)) {
            bidMapRef.current.delete(price);
            hasChanges = true;
          }
        } else {
          const existingBid = bidMapRef.current.get(price);
          if (!existingBid || existingBid.amount !== amount) {
            bidMapRef.current.set(price, { price, count: 1, amount });
            hasChanges = true;
          }
        }
      });
    }
    
    // Update internal book if any changes were made
    if (hasChanges) {
      updateInternalOrderBook();
    }
  }, [updateInternalOrderBook]);

  // Initialize WebSocket for the selected exchange
  const initWebSocket = useCallback(() => {
    // Clear previous connection if exists
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Reset state
    setConnectionStatus('connecting');
    askMapRef.current.clear();
    bidMapRef.current.clear();
    channelIdRef.current = null;
    
    // Reset reconnection attempts if this is a manual initialization
    if (reconnectAttemptsRef.current > 0) {
      console.log(`[OrderBook WebSocket] Manual reconnection, resetting attempts counter`);
      reconnectAttemptsRef.current = 0;
    }

    try {
      // Initialize WebSocket based on selected exchange
      switch (exchange) {
        case 'bitfinex':
          initBitfinexWebSocket();
          break;
        case 'coinbase':
          initCoinbaseWebSocket();
          break;
        case 'binance':
          initBinanceWebSocket();
          break;
        default:
          console.warn(`[OrderBook WebSocket] Exchange ${exchange} not supported, using fallbacks`);
          
          // Try fallbacks in sequence: REST API, cache, then mock data
          fetchRESTFallback().catch(() => {
            console.log(`[OrderBook WebSocket] REST API fallback failed, trying cache`);
            if (!useCachedFallback()) {
              console.log(`[OrderBook WebSocket] Cache fallback failed, using mock data`);
              useMockFallback();
            }
          });
          
          setError(new Error(`Exchange ${exchange} not supported. Using fallback data.`));
      }
    } catch (err) {
      console.error(`[OrderBook WebSocket] Failed to initialize ${exchange} WebSocket:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to initialize ${exchange} WebSocket`));
      
      // Try fallbacks in sequence
      handleConnectionFailure();
    }
  }, [exchange, symbol, precision, frequency]);
  
  // Handle connection failures with multiple fallback strategies
  const handleConnectionFailure = useCallback(() => {
    console.log(`[OrderBook WebSocket] Connection failure, attempt ${reconnectAttemptsRef.current + 1} of ${options.maxReconnectAttempts}`);
    
    // Set error state
    setConnectionStatus('error');
    
    // Check if we've exceeded maximum reconnect attempts
    if (reconnectAttemptsRef.current >= options.maxReconnectAttempts) {
      console.log(`[OrderBook WebSocket] Exceeded max reconnect attempts (${options.maxReconnectAttempts}), trying REST API`);
      
      // Try fallbacks in sequence: REST API, cache, then mock data
      fetchRESTFallback().catch(() => {
        console.log(`[OrderBook WebSocket] REST API fallback failed, trying cache`);
        if (!useCachedFallback()) {
          console.log(`[OrderBook WebSocket] Cache fallback failed, using mock data`);
          useMockFallback();
        }
      });
      
      return;
    }
    
    // Calculate exponential backoff delay
    const backoffDelay = Math.min(
      options.initialReconnectDelayMs * Math.pow(2, reconnectAttemptsRef.current),
      options.maxReconnectDelayMs
    );
    
    // Add some jitter to prevent all clients reconnecting simultaneously
    const jitter = Math.random() * 1000;
    const totalDelay = backoffDelay + jitter;
    
    console.log(`[OrderBook WebSocket] Reconnecting in ${(totalDelay / 1000).toFixed(1)}s (attempt ${reconnectAttemptsRef.current + 1})`);
    setConnectionStatus('reconnecting');
    
    // Set a timeout to attempt reconnection
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      initWebSocket();
    }, totalDelay);
  }, [options.maxReconnectAttempts, options.initialReconnectDelayMs, options.maxReconnectDelayMs, fetchRESTFallback, useCachedFallback, useMockFallback]);
  
  // Initialize Bitfinex WebSocket
  const initBitfinexWebSocket = useCallback(() => {
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
        console.log(`[OrderBook WebSocket] Bitfinex connection closed (${event.code}): ${event.reason}`);
        
        // If it was a clean close (e.g., user switching to another exchange), don't reconnect
        if (event.wasClean) {
          setConnectionStatus('disconnected');
          return;
        }
        
        // Otherwise, handle as a connection failure with reconnection
        setError(new Error(`Bitfinex WebSocket connection closed: ${event.reason || 'Unknown reason'}`));
        handleConnectionFailure();
      };

      socketRef.current.onerror = (event) => {
        console.error('[OrderBook WebSocket] Bitfinex error:', event);
        setError(new Error('Bitfinex WebSocket connection error'));
        // Don't call handleConnectionFailure here as onclose will be called next
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.event === 'subscribed' && data.channel === 'book') {
            console.log('[OrderBook WebSocket] Subscribed to Bitfinex order book:', data);
            channelIdRef.current = data.chanId;
          } 
          // Handle snapshot (initial data)
          else if (Array.isArray(data) && data[0] === channelIdRef.current && Array.isArray(data[1])) {
            // Check if it's a snapshot (array of arrays)
            if (Array.isArray(data[1][0])) {
              console.log('[OrderBook WebSocket] Received Bitfinex order book snapshot');
              processOrderBookData(data[1]);
            } 
            // Handle update (single order book entry)
            else if (Array.isArray(data[1]) && !Array.isArray(data[1][0])) {
              processOrderBookData([data[1]]);
            }
          }
        } catch (err) {
          console.error('[OrderBook WebSocket] Failed to process Bitfinex message:', err, event.data);
          setError(err instanceof Error ? err : new Error('Failed to process Bitfinex WebSocket message'));
        }
      };
    } catch (err) {
      console.error('[OrderBook WebSocket] Failed to initialize Bitfinex WebSocket:', err);
      throw err;
    }
  }, [symbol, precision, frequency, processOrderBookData]);
  
  // Initialize Coinbase WebSocket
  const initCoinbaseWebSocket = useCallback(() => {
    try {
      // Create new WebSocket connection
      socketRef.current = new WebSocket(COINBASE_WEBSOCKET_URL);

      // Handle WebSocket events
      socketRef.current.onopen = () => {
        console.log('[OrderBook WebSocket] Connected to Coinbase');
        setConnectionStatus('connected');
        setError(null);

        // Subscribe to order book
        if (socketRef.current) {
          const subscribeMsg = JSON.stringify({
            type: 'subscribe',
            product_ids: [`${symbol.slice(0, 3)}-${symbol.slice(3)}`], // Format: BTC-USD
            channels: ['level2']
          });
          socketRef.current.send(subscribeMsg);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log(`[OrderBook WebSocket] Coinbase connection closed (${event.code}): ${event.reason}`);
        
        // If it was a clean close (e.g., user switching to another exchange), don't reconnect
        if (event.wasClean) {
          setConnectionStatus('disconnected');
          return;
        }
        
        // Otherwise, handle as a connection failure with reconnection
        setError(new Error(`Coinbase WebSocket connection closed: ${event.reason || 'Unknown reason'}`));
        handleConnectionFailure();
      };

      socketRef.current.onerror = (event) => {
        console.error('[OrderBook WebSocket] Coinbase error:', event);
        setError(new Error('Coinbase WebSocket connection error'));
        // Don't call handleConnectionFailure here as onclose will be called next
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Only process messages for the current symbol
          const formattedSymbol = `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
          if (data.product_id && data.product_id !== formattedSymbol) {
            return;
          }
          
          // Handle different message types
          if (data.type === 'snapshot' || data.type === 'l2update') {
            processCoinbaseOrderBookData(data);
          }
        } catch (err) {
          console.error('[OrderBook WebSocket] Failed to process Coinbase message:', err, event.data);
          setError(err instanceof Error ? err : new Error('Failed to process Coinbase WebSocket message'));
        }
      };
    } catch (err) {
      console.error('[OrderBook WebSocket] Failed to initialize Coinbase WebSocket:', err);
      throw err;
    }
  }, [symbol, processCoinbaseOrderBookData]);
  
  // Initialize Binance WebSocket
  const initBinanceWebSocket = useCallback(() => {
    try {
      // Format symbol for Binance (lowercase)
      const binanceSymbol = symbol.toLowerCase();
      
      // Create new WebSocket connection (depth stream)
      socketRef.current = new WebSocket(`${BINANCE_WEBSOCKET_URL}/${binanceSymbol}@depth`);

      // Handle WebSocket events
      socketRef.current.onopen = () => {
        console.log('[OrderBook WebSocket] Connected to Binance');
        setConnectionStatus('connected');
        setError(null);
        
        // For Binance, we need to get the initial snapshot through REST API
        fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=100`)
          .then(response => response.json())
          .then(data => {
            console.log('[OrderBook WebSocket] Received Binance order book snapshot');
            processBinanceOrderBookData(data);
          })
          .catch(err => {
            console.error('[OrderBook WebSocket] Failed to fetch Binance snapshot:', err);
            setError(new Error('Failed to fetch Binance order book snapshot'));
          });
      };

      socketRef.current.onclose = (event) => {
        console.log(`[OrderBook WebSocket] Binance connection closed (${event.code}): ${event.reason}`);
        
        // If it was a clean close (e.g., user switching to another exchange), don't reconnect
        if (event.wasClean) {
          setConnectionStatus('disconnected');
          return;
        }
        
        // Otherwise, handle as a connection failure with reconnection
        setError(new Error(`Binance WebSocket connection closed: ${event.reason || 'Unknown reason'}`));
        handleConnectionFailure();
      };

      socketRef.current.onerror = (event) => {
        console.error('[OrderBook WebSocket] Binance error:', event);
        setError(new Error('Binance WebSocket connection error'));
        // Don't call handleConnectionFailure here as onclose will be called next
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle depth update
          if (data.e === 'depthUpdate') {
            processBinanceOrderBookData(data);
          }
        } catch (err) {
          console.error('[OrderBook WebSocket] Failed to process Binance message:', err, event.data);
          setError(err instanceof Error ? err : new Error('Failed to process Binance WebSocket message'));
        }
      };
    } catch (err) {
      console.error('[OrderBook WebSocket] Failed to initialize Binance WebSocket:', err);
      throw err;
    }
  }, [symbol, processBinanceOrderBookData]);

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
      // Close WebSocket connection cleanly
      if (socketRef.current) {
        // Set the status to prevent automatic reconnection
        setConnectionStatus('disconnected');
        
        // Clean close with 1000 code (normal closure)
        socketRef.current.close(1000, "Component unmounting");
        socketRef.current = null;
      }

      // Clear all timers and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (updateTimeoutRef.current !== null) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
      if (fpsCounterIntervalRef.current) {
        clearInterval(fpsCounterIntervalRef.current);
        fpsCounterIntervalRef.current = null;
      }
      
      // Reset all state flags
      pendingUpdatesRef.current = false;
      dataChangedRef.current = false;
      reconnectAttemptsRef.current = 0;
      restAttemptCountRef.current = 0;
      
      console.log('[OrderBook WebSocket] Cleaning up all WebSocket resources');
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