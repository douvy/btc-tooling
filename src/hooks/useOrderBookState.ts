import { useState, useEffect } from 'react';
import { OrderBook as OrderBookType, OrderBookEntry } from '@/types';
import { useOrderBookWebSocket } from '@/hooks/useOrderBookWebSocket';
import { getMockOrderBook } from '@/lib/mockData';

// Type definitions for the hook's return value
interface UseOrderBookStateReturn {
  /** The current state of the order book with processed data */
  localOrderBook: OrderBookType | null;
  /** Current connection status to the WebSocket */
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' | 'fallback_rest' | 'fallback_cache';
  /** Record of which ask orders are currently animating due to updates */
  animatingAsks: Record<number, boolean>;
  animatingBids: Record<number, boolean>;
  lastUpdated: Date;
  isLoading: boolean;
  performanceMetrics: {
    fps: number;
    updateCount: number;
    averageUpdateTime: number;
  };
}

/**
 * Custom hook to manage the order book state, including data loading,
 * real-time updates, animations, and performance metrics.
 * 
 * @param propOrderBook - Optional initial order book data
 * @param currentPrice - Current Bitcoin price for calculations
 * @param onError - Optional error handler callback
 * @returns Processed order book data with animation states
 */
export function useOrderBookState(
  propOrderBook?: OrderBookType,
  currentPrice?: number,
  onError?: (error: Error) => void
): UseOrderBookStateReturn {
  // Fixed to 'bitfinex' exchange as per component requirements
  const selectedExchange = 'bitfinex';
  
  // State for tracking animating rows
  const [animatingAsks, setAnimatingAsks] = useState<Record<number, boolean>>({});
  const [animatingBids, setAnimatingBids] = useState<Record<number, boolean>>({});

  // Local order book state
  const [localOrderBook, setLocalOrderBook] = useState<OrderBookType | null>(null);

  // Get data from WebSocket hook
  const {
    orderBook: wsOrderBook,
    connectionStatus,
    lastUpdated,
    isLoading: wsLoading,
    performanceMetrics
  } = useOrderBookWebSocket('BTCUSD', selectedExchange);

  // Effect to update order book data and handle animations
  useEffect(() => {
    // First priority: Use prop data if available
    if (propOrderBook) {
      // Track which orders have changed to animate them
      const newAnimatingAsks: Record<number, boolean> = {};
      const newAnimatingBids: Record<number, boolean> = {};
      
      if (localOrderBook) {
        // Find changed asks
        propOrderBook.asks.forEach(ask => {
          const existingAsk = localOrderBook.asks.find(a => a.price === ask.price);
          if (!existingAsk || existingAsk.amount !== ask.amount) {
            newAnimatingAsks[ask.price] = true;
          }
        });
        
        // Find changed bids
        propOrderBook.bids.forEach(bid => {
          const existingBid = localOrderBook.bids.find(b => b.price === bid.price);
          if (!existingBid || existingBid.amount !== bid.amount) {
            newAnimatingBids[bid.price] = true;
          }
        });
      }
      
      setAnimatingAsks(newAnimatingAsks);
      setAnimatingBids(newAnimatingBids);
      setLocalOrderBook(propOrderBook);
      
      // Clear animations after a very short delay (100ms)
      setTimeout(() => {
        setAnimatingAsks({});
        setAnimatingBids({});
      }, 100);
      
      return;
    }
    
    // Second priority: Use WebSocket data
    if (wsOrderBook) {
      // Track which orders have changed to animate them
      const newAnimatingAsks: Record<number, boolean> = {};
      const newAnimatingBids: Record<number, boolean> = {};
      
      if (localOrderBook) {
        // Find changed asks
        wsOrderBook.asks.forEach(ask => {
          const existingAsk = localOrderBook.asks.find(a => a.price === ask.price);
          if (!existingAsk || existingAsk.amount !== ask.amount) {
            newAnimatingAsks[ask.price] = true;
          }
        });
        
        // Find changed bids
        wsOrderBook.bids.forEach(bid => {
          const existingBid = localOrderBook.bids.find(b => b.price === bid.price);
          if (!existingBid || existingBid.amount !== bid.amount) {
            newAnimatingBids[bid.price] = true;
          }
        });
      }
      
      setAnimatingAsks(newAnimatingAsks);
      setAnimatingBids(newAnimatingBids);
      setLocalOrderBook(wsOrderBook);
      
      // Clear animations after a very short delay (100ms)
      setTimeout(() => {
        setAnimatingAsks({});
        setAnimatingBids({});
      }, 100);
      
      return;
    } 
    
    // If we still don't have any order book data at all, DON'T use mock data
    // Instead, show loading state until real data arrives
    // REMOVED: if (!localOrderBook) {
    //   const newOrderBook = getMockOrderBook(selectedExchange);
    //   setLocalOrderBook(newOrderBook);
    // }
  }, [propOrderBook, wsOrderBook, selectedExchange, localOrderBook]);

  // Map connection status to our supported types
  let mappedStatus: UseOrderBookStateReturn['connectionStatus'] = 
    connectionStatus === 'reconnecting' ? 'connecting' : connectionStatus;
  
  return {
    localOrderBook,
    connectionStatus: mappedStatus,
    animatingAsks,
    animatingBids,
    lastUpdated,
    isLoading: wsLoading && !localOrderBook,
    performanceMetrics
  };
}