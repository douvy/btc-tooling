import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderBook } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
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
          // Use mock data as fallback
          const mockData = getMockOrderBook(exchange);
          setOrderBook(mockData);
          setConnectionStatus('disconnected');
          setIsLoading(false);
          setError(new Error(`Exchange ${exchange} not supported. Using mock data.`));
      }
    } catch (err) {
      console.error(`[OrderBook WebSocket] Failed to initialize ${exchange} WebSocket:`, err);
      setError(err instanceof Error ? err : new Error(`Failed to initialize ${exchange} WebSocket`));
      setConnectionStatus('disconnected');
      
      // Use mock data as fallback
      const mockData = getMockOrderBook(exchange);
      setOrderBook(mockData);
      setIsLoading(false);
    }
  }, [exchange, symbol, precision, frequency, processOrderBookData]);
  
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
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after a delay
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[OrderBook WebSocket] Attempting to reconnect to Bitfinex...');
            initWebSocket();
          }, 5000);
        }
      };

      socketRef.current.onerror = (event) => {
        console.error('[OrderBook WebSocket] Bitfinex error:', event);
        setError(new Error('Bitfinex WebSocket connection error'));
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
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after a delay
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[OrderBook WebSocket] Attempting to reconnect to Coinbase...');
            initWebSocket();
          }, 5000);
        }
      };

      socketRef.current.onerror = (event) => {
        console.error('[OrderBook WebSocket] Coinbase error:', event);
        setError(new Error('Coinbase WebSocket connection error'));
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
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after a delay
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[OrderBook WebSocket] Attempting to reconnect to Binance...');
            initWebSocket();
          }, 5000);
        }
      };

      socketRef.current.onerror = (event) => {
        console.error('[OrderBook WebSocket] Binance error:', event);
        setError(new Error('Binance WebSocket connection error'));
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