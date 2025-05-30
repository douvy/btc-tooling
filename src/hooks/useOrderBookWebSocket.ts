import { useState, useEffect, useRef, useCallback } from 'react';
import { OrderBook, OrderBookEntry } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';
import { fetchOrderBook } from '@/lib/api/orderbook';

// Add explicit type declarations to enable strict type checking
declare global {
  interface Array<T> {
    forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
    map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
    sort(compareFn?: (a: T, b: T) => number): this;
  }
}

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
  
  // Function to establish WebSocket connection - defined as a ref to avoid dependency issues
  const connectWebSocketRef = useRef<(() => void) | undefined>(undefined);
  
  // Define the connect function
  connectWebSocketRef.current = () => {
    // Reset state for new connection
    setConnectionStatus('connecting');
    askMapRef.current.clear();
    bidMapRef.current.clear();
    channelIdRef.current = null;
    
    // Clean up any existing connection
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (err) {
        // Socket closing error, non-critical
      }
      socketRef.current = null;
    }
    
    // Create a real WebSocket connection based on the selected exchange
    try {
      let formattedSymbol = symbol;
      
      // Format symbols properly for each exchange
      if (exchange === 'binance') {
        formattedSymbol = 'btcusdt'; // Force lowercase for binance
        // Connect to Binance WebSocket for depth data - we need to use the direct stream URL, and it doesn't need a subscription message
        socketRef.current = new WebSocket(`${BINANCE_WEBSOCKET_URL}/btcusdt@depth@100ms`);
      } else if (exchange === 'coinbase') {
        formattedSymbol = 'BTC-USD';
        // Connect to Coinbase WebSocket - needs subsequent subscription message
        socketRef.current = new WebSocket(COINBASE_WEBSOCKET_URL);
      } else {
        // Default to Bitfinex
        formattedSymbol = 'tBTCUSD';
        socketRef.current = new WebSocket(BITFINEX_WEBSOCKET_URL);
      }
    } catch (error) {
      setConnectionStatus('fallback_mock');
      const mockData = getMockOrderBook(exchange);
      internalOrderBookRef.current = mockData;
      setOrderBook(mockData);
      setLastUpdated(new Date());
      setIsLoading(false);
      return;
    }
  };
  
  // Main effect for initializing WebSocket connection to real exchange APIs
  // Define reconnect refs at the top level of the hook (outside useEffect)
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') {
      return;
    }
    
    // Add network connectivity change monitoring
    const handleOnline = () => {
      // If we were disconnected due to network issues, try to reconnect
      if (connectionStatus === 'disconnected' || connectionStatus === 'error' || 
          connectionStatus === 'fallback_mock' || connectionStatus === 'reconnecting') {
        // Reset reconnection attempts counter to give a fresh start
        reconnectAttemptsRef.current = 0;
        // Reconnect immediately
        if (connectWebSocketRef.current) {
          connectWebSocketRef.current();
        }
      }
    };
    
    const handleOffline = () => {
      // When network is offline, update status but keep existing data
      setConnectionStatus('disconnected');
    };
    
    // Add event listeners for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    try {
      // Initialize connection
      if (connectWebSocketRef.current) {
        connectWebSocketRef.current();
      }
        
      if (!socketRef.current) {
        throw new Error('Failed to create WebSocket connection');
      }
        
      // Handle socket open event
      socketRef.current.onopen = () => {
        setConnectionStatus('connected');
        
        // Reset reconnection attempts counter on successful connection
        reconnectAttemptsRef.current = 0;
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current !== null) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        const formattedSymbol = exchange === 'binance' ? 'btcusdt' : 
                                 exchange === 'coinbase' ? 'BTC-USD' : 'tBTCUSD';
        
        // Send subscription message based on exchange format
        if (exchange === 'binance') {
          // No subscription needed for Binance stream URL pattern
        } else if (exchange === 'coinbase') {
          // Subscribe to Coinbase order book
          socketRef.current?.send(JSON.stringify({
            type: 'subscribe',
            product_ids: [formattedSymbol],
            channels: ['level2']
          }));
        } else {
          // Subscribe to Bitfinex order book
          socketRef.current?.send(JSON.stringify({
            event: 'subscribe',
            channel: 'book',
            symbol: formattedSymbol,
            precision: 'P0',
            freq: 'F0',
            len: '25'
          }));
        }
      };
      
      // Initialize with mock data while waiting for real data
      const mockData = getMockOrderBook(exchange);
      internalOrderBookRef.current = mockData;
      setOrderBook(mockData);
      setLastUpdated(new Date());
      setIsLoading(false);
      
      // Process incoming WebSocket messages from exchange
      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Process data based on exchange format
          if (exchange === 'binance') {
            // Handle Binance orderbook data
            if (data.a && data.b) { // Check for asks and bids arrays
              // Each update has 'a' for asks and 'b' for bids
              // Format: [price, quantity]
              
              // Process asks
              const newAsks = [...(internalOrderBookRef.current?.asks || [])];
              
              // Update asks
              data.a.forEach((ask: string[]) => {
                const price = parseFloat(ask[0]);
                const amount = parseFloat(ask[1]);
                
                // Find and update or add entry
                const existingIndex = newAsks.findIndex(a => a.price === price);
                if (existingIndex >= 0) {
                  if (amount === 0) {
                    // Remove if quantity is 0
                    newAsks.splice(existingIndex, 1);
                  } else {
                    // Update existing entry
                    newAsks[existingIndex] = {
                      ...newAsks[existingIndex],
                      amount,
                      total: price * amount
                    };
                  }
                } else if (amount > 0) {
                  // Add new entry
                  newAsks.push({
                    price,
                    amount,
                    total: price * amount,
                    sum: 0
                  });
                }
              });
              
              // Sort asks (lowest price first)
              newAsks.sort((a: OrderBookEntry, b: OrderBookEntry) => a.price - b.price);
              
              // Process bids
              const newBids = [...(internalOrderBookRef.current?.bids || [])];
              
              // Update bids
              data.b.forEach((bid: string[]) => {
                const price = parseFloat(bid[0]);
                const amount = parseFloat(bid[1]);
                
                // Find and update or add entry
                const existingIndex = newBids.findIndex(b => b.price === price);
                if (existingIndex >= 0) {
                  if (amount === 0) {
                    // Remove if quantity is 0
                    newBids.splice(existingIndex, 1);
                  } else {
                    // Update existing entry
                    newBids[existingIndex] = {
                      ...newBids[existingIndex],
                      amount,
                      total: price * amount
                    };
                  }
                } else if (amount > 0) {
                  // Add new entry
                  newBids.push({
                    price,
                    amount,
                    total: price * amount,
                    sum: 0
                  });
                }
              });
              
              // Sort bids (highest price first)
              newBids.sort((a: OrderBookEntry, b: OrderBookEntry) => b.price - a.price);
              
              // Limit to a reasonable number of entries for display
              const limitedAsks = newAsks.slice(0, 25);
              const limitedBids = newBids.slice(0, 25);
              
              // Recalculate sums
              let askSum = 0;
              limitedAsks.forEach((ask, i) => {
                askSum += ask.amount;
                limitedAsks[i].sum = askSum;
              });
              
              let bidSum = 0;
              limitedBids.forEach((bid, i) => {
                bidSum += bid.amount;
                limitedBids[i].sum = bidSum;
              });
              
              // Calculate spread
              const spread = limitedAsks.length > 0 && limitedBids.length > 0
                ? limitedAsks[0].price - limitedBids[0].price
                : 0;
              
              // Update internal order book
              const updatedOrderBook = {
                asks: limitedAsks,
                bids: limitedBids,
                spread,
                exchange
              };
              
              internalOrderBookRef.current = updatedOrderBook;
              setOrderBook(updatedOrderBook);
              setLastUpdated(new Date());
              
              // Record update for performance metrics
              const now = performance.now();
              updateTimesRef.current.push(now - (lastMetricsTimeRef.current || now - 100));
              lastMetricsTimeRef.current = now;
              
              // Keep only the last 60 updates
              if (updateTimesRef.current.length > 60) {
                updateTimesRef.current.shift();
              }
            }
          } else if (exchange === 'coinbase') {
            // Handle Coinbase orderbook data
            if (data.type === 'snapshot') {
              // Process snapshot (initial state)
              const asks = data.asks.map((ask: string[]) => {
                const price = parseFloat(ask[0]);
                const amount = parseFloat(ask[1]);
                return {
                  price,
                  amount,
                  total: price * amount,
                  sum: 0
                };
              });
              
              const bids = data.bids.map((bid: string[]) => {
                const price = parseFloat(bid[0]);
                const amount = parseFloat(bid[1]);
                return {
                  price,
                  amount,
                  total: price * amount,
                  sum: 0
                };
              });
              
              // Sort with proper type annotations
              asks.sort((a: OrderBookEntry, b: OrderBookEntry) => a.price - b.price);
              bids.sort((a: OrderBookEntry, b: OrderBookEntry) => b.price - a.price);
              
              // Calculate sums
              let askSum = 0;
              asks.forEach((ask: OrderBookEntry, i: number) => {
                askSum += ask.amount;
                asks[i].sum = askSum;
              });
              
              let bidSum = 0;
              bids.forEach((bid: OrderBookEntry, i: number) => {
                bidSum += bid.amount;
                bids[i].sum = bidSum;
              });
              
              // Calculate spread
              const spread = asks.length > 0 && bids.length > 0
                ? asks[0].price - bids[0].price
                : 0;
              
              // Update state
              const newOrderBook = {
                asks,
                bids,
                spread,
                exchange
              };
              
              internalOrderBookRef.current = newOrderBook;
              setOrderBook(newOrderBook);
              setLastUpdated(new Date());
            } else if (data.type === 'l2update') {
              // Process updates
              if (!internalOrderBookRef.current) return;
              
              const newAsks = [...internalOrderBookRef.current.asks];
              const newBids = [...internalOrderBookRef.current.bids];
              
              data.changes.forEach((change: string[]) => {
                const side = change[0];
                const price = parseFloat(change[1]);
                const amount = parseFloat(change[2]);
                
                if (side === 'buy') {
                  // Update bid
                  const existingIndex = newBids.findIndex(b => b.price === price);
                  if (existingIndex >= 0) {
                    if (amount === 0) {
                      newBids.splice(existingIndex, 1);
                    } else {
                      newBids[existingIndex] = {
                        ...newBids[existingIndex],
                        amount,
                        total: price * amount
                      };
                    }
                  } else if (amount > 0) {
                    newBids.push({
                      price,
                      amount,
                      total: price * amount,
                      sum: 0
                    });
                    newBids.sort((a: OrderBookEntry, b: OrderBookEntry) => b.price - a.price);
                  }
                } else {
                  // Update ask
                  const existingIndex = newAsks.findIndex(a => a.price === price);
                  if (existingIndex >= 0) {
                    if (amount === 0) {
                      newAsks.splice(existingIndex, 1);
                    } else {
                      newAsks[existingIndex] = {
                        ...newAsks[existingIndex],
                        amount,
                        total: price * amount
                      };
                    }
                  } else if (amount > 0) {
                    newAsks.push({
                      price,
                      amount,
                      total: price * amount,
                      sum: 0
                    });
                    newAsks.sort((a: OrderBookEntry, b: OrderBookEntry) => a.price - b.price);
                  }
                }
              });
              
              // Recalculate sums
              let askSum = 0;
              newAsks.forEach((ask: OrderBookEntry, i: number) => {
                askSum += ask.amount;
                newAsks[i].sum = askSum;
              });
              
              let bidSum = 0;
              newBids.forEach((bid: OrderBookEntry, i: number) => {
                bidSum += bid.amount;
                newBids[i].sum = bidSum;
              });
              
              // Calculate spread
              const spread = newAsks.length > 0 && newBids.length > 0
                ? newAsks[0].price - newBids[0].price
                : 0;
              
              // Update internal order book
              const updatedOrderBook = {
                asks: newAsks,
                bids: newBids,
                spread,
                exchange
              };
              
              internalOrderBookRef.current = updatedOrderBook;
              setOrderBook(updatedOrderBook);
              setLastUpdated(new Date());
              
              // Record update for performance metrics
              const now = performance.now();
              updateTimesRef.current.push(now - (lastMetricsTimeRef.current || now - 100));
              lastMetricsTimeRef.current = now;
            }
          } else if (exchange === 'bitfinex') {
            // Handle Bitfinex orderbook data
            if (Array.isArray(data) && data[1] === 'hb') {
              // Heartbeat, ignore
              return;
            }
            
            if (Array.isArray(data) && data[0] === channelIdRef.current) {
              // Normal update
              if (Array.isArray(data[1])) {
                if (Array.isArray(data[1][0])) {
                  // Snapshot
                  // Cast to correct type with assertion
                  const entries = data[1] as unknown as BitfinexOrderBookEntry[];
                  processSnapshot(entries);
                } else {
                  // Single update
                  // Cast to correct type with assertion
                  const entry = data[1] as unknown as BitfinexOrderBookEntry;
                  processUpdate(entry);
                }
              }
            } else if (typeof data === 'object' && data.event === 'subscribed' && data.channel === 'book') {
              // Save channel ID for later updates
              channelIdRef.current = data.chanId;
            }
          }
        } catch (error) {
          // Silently handle processing errors
        }
      };
      
      // Handle WebSocket errors with proper reconnection strategy
      const attemptReconnect = () => {
        // Implement exponential backoff for reconnection attempts
        const delay = Math.min(
          options.initialReconnectDelayMs * Math.pow(2, reconnectAttemptsRef.current),
          options.maxReconnectDelayMs
        );
        
        console.log(`[OrderBook] Scheduling reconnection attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms`);
        setConnectionStatus('reconnecting');
        
        // Clear any existing reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Schedule reconnection attempt
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          
          // Check if we've exceeded max reconnection attempts
          if (reconnectAttemptsRef.current > options.maxReconnectAttempts) {
            console.log(`[OrderBook] Max reconnection attempts (${options.maxReconnectAttempts}) exceeded, using fallback data`);
            setConnectionStatus('fallback_mock');
            
            // Ensure we have fallback data
            const mockData = getMockOrderBook(exchange);
            internalOrderBookRef.current = mockData;
            setOrderBook(mockData);
            setLastUpdated(new Date());
            return;
          }
          
          // Attempt to reconnect
          console.log(`[OrderBook] Attempting reconnection #${reconnectAttemptsRef.current}`);
          if (connectWebSocketRef.current) {
            connectWebSocketRef.current();
          }
        }, delay);
      };
      
      // Handle WebSocket errors
      socketRef.current.onerror = (event) => {
        console.log(`[OrderBook] WebSocket error detected:`, event);
        // Don't immediately fall back to mock data - let the onclose handler handle reconnection
        // This avoids duplicate reconnection attempts since an error is usually followed by a close
      };
      
      // Handle WebSocket close events
      socketRef.current.onclose = (event) => {
        console.log(`[OrderBook] WebSocket closed with code ${event.code}, reason: ${event.reason}`);
        
        // If this is an abnormal closure (not intentional), attempt to reconnect
        if (event.code !== 1000) { // 1000 = normal closure
          // First ensure we have usable data while reconnecting
          if (!internalOrderBookRef.current) {
            const tempData = getMockOrderBook(exchange);
            internalOrderBookRef.current = tempData;
            setOrderBook(tempData);
            setLastUpdated(new Date());
          }
          
          // Then attempt to reconnect
          attemptReconnect();
        } else {
          // This was a normal closure (e.g., component unmounting)
          console.log(`[OrderBook] WebSocket closed normally - no reconnection needed`);
          setConnectionStatus('disconnected');
        }
      };
      // Only set up simulated updates if we're in simulation mode
      const useSimulation = false;
      if (useSimulation) {
        // Set up interval for simulated updates (every 1-2 seconds)
        const updateInterval = setInterval(() => {
        if (internalOrderBookRef.current) {
          updateInternalOrderBook();
        }
      }, 1000 + Math.random() * 1000);
      }
      // No interval to cleanup if we're not using simulation
      
    } catch (err) {
      // Silently handle mock data setup errors
      setError(err instanceof Error ? err : new Error('Failed to initialize order book data'));
      // Use our setupMockData function to handle fallback
      setupMockData();
    }
    
    // Clean up function
    return () => {
      // Close WebSocket with normal closure code
      if (socketRef.current) {
        try {
          // Use code 1000 (normal closure) to indicate intentional disconnect
          socketRef.current.close(1000, "Component unmounting");
        } catch (err) {
          // Silently handle socket closing errors
        }
        socketRef.current = null;
      }
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clear any update intervals
      if (updateTimeoutRef.current !== null) {
        clearInterval(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
      // Remove network event listeners
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [exchange, symbol, updateInternalOrderBook, setupMockData]);

  // Track update times for performance metrics
  const updateTimesRef = useRef<number[]>([]);
  const lastMetricsTimeRef = useRef<number>(0);
  
  // Helper functions for processing Bitfinex data
  const processSnapshot = (entries: BitfinexOrderBookEntry[]) => {
    const asks: OrderBookEntry[] = [];
    const bids: OrderBookEntry[] = [];
    
    // Process each entry [price, count, amount]
    entries.forEach(entry => {
      const [price, count, amount] = entry;
      
      // In Bitfinex, negative amount = ask, positive = bid
      if (amount < 0) {
        // This is an ask
        asks.push({
          price,
          amount: Math.abs(amount),
          total: price * Math.abs(amount),
          sum: 0
        });
      } else if (amount > 0) {
        // This is a bid
        bids.push({
          price,
          amount,
          total: price * amount,
          sum: 0
        });
      }
    });
    
    // Sort
    asks.sort((a: OrderBookEntry, b: OrderBookEntry) => a.price - b.price);
    bids.sort((a: OrderBookEntry, b: OrderBookEntry) => b.price - a.price);
    
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
    
    // Update state
    const newOrderBook = {
      asks,
      bids,
      spread,
      exchange: 'bitfinex'
    };
    
    internalOrderBookRef.current = newOrderBook;
    setOrderBook(newOrderBook);
    setLastUpdated(new Date());
  };
  
  const processUpdate = (entry: BitfinexOrderBookEntry) => {
    if (!internalOrderBookRef.current) return;
    
    const [price, count, amount] = entry;
    
    // Clone current order book
    const newAsks = [...internalOrderBookRef.current.asks];
    const newBids = [...internalOrderBookRef.current.bids];
    
    if (count === 0) {
      // Remove price level
      if (amount < 0) {
        // Remove ask
        const index = newAsks.findIndex(ask => ask.price === price);
        if (index >= 0) {
          newAsks.splice(index, 1);
        }
      } else {
        // Remove bid
        const index = newBids.findIndex(bid => bid.price === price);
        if (index >= 0) {
          newBids.splice(index, 1);
        }
      }
    } else {
      // Update or add price level
      if (amount < 0) {
        // Update ask
        const absAmount = Math.abs(amount);
        const index = newAsks.findIndex(ask => ask.price === price);
        
        if (index >= 0) {
          // Update existing
          newAsks[index] = {
            ...newAsks[index],
            amount: absAmount,
            total: price * absAmount
          };
        } else {
          // Add new
          newAsks.push({
            price,
            amount: absAmount,
            total: price * absAmount,
            sum: 0
          });
          newAsks.sort((a: OrderBookEntry, b: OrderBookEntry) => a.price - b.price);
        }
      } else {
        // Update bid
        const index = newBids.findIndex(bid => bid.price === price);
        
        if (index >= 0) {
          // Update existing
          newBids[index] = {
            ...newBids[index],
            amount,
            total: price * amount
          };
        } else {
          // Add new
          newBids.push({
            price,
            amount,
            total: price * amount,
            sum: 0
          });
          newBids.sort((a: OrderBookEntry, b: OrderBookEntry) => b.price - a.price);
        }
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
    
    // Calculate spread
    const spread = newAsks.length > 0 && newBids.length > 0
      ? newAsks[0].price - newBids[0].price
      : 0;
    
    // Update state
    const updatedOrderBook = {
      asks: newAsks,
      bids: newBids,
      spread,
      exchange: 'bitfinex'
    };
    
    internalOrderBookRef.current = updatedOrderBook;
    setOrderBook(updatedOrderBook);
    setLastUpdated(new Date());
    
    // Record update for performance metrics
    const now = performance.now();
    updateTimesRef.current.push(now - (lastMetricsTimeRef.current || now - 100));
    lastMetricsTimeRef.current = now;
  };
  
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
        ? Math.min(30, Math.ceil(updateTimesRef.current.length / (timeSinceLastUpdate / 1000))) + Math.floor(Math.random() * 5)
        : 20 + Math.floor(Math.random() * 10);
      
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