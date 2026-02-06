import { useState, useEffect, useCallback, useMemo } from 'react';
import { OrderBook as OrderBookType } from '@/types';
import OrderBookTooltip from './OrderBookTooltip';
import dynamic from 'next/dynamic';
import { useAppContext } from '@/context/AppContext';

// Import our refactored components
import { OrderBookHeader } from './OrderBookHeader';
import { AmountControl } from './AmountControl';
import { OrdersList } from './OrdersList';
import { OrderBookSpread } from './OrderBookSpread';
import { OrderBookFooter } from './OrderBookFooter';

// Import our custom hooks
import { useOrderBookState } from '@/hooks/useOrderBookState';
import { useOrderBookInteractions } from '@/hooks/useOrderBookInteractions';

/**
 * Constants for OrderBook display
 */
const ORDER_BOOK_CONSTANTS = {
  DEFAULT_AMOUNT: "0.01",
  VIEW_MODE: "sum" as const,
  DEFAULT_MOBILE_ORDER_COUNT: 8,
  LOADING_ANIMATION_DURATION: 250, // ms
  ANIMATION_DURATION: 800, // ms for price change animations
  MOBILE_BREAKPOINT: 768, // px width
};

/**
 * Props for the OrderBook component
 */
export interface OrderBookProps {
  /** 
   * Optional order book data - if not provided, will use data from context 
   * or fetch from WebSocket
   */
  orderBook?: OrderBookType | null;
  
  /** 
   * Current Bitcoin price - defaults to context value if available
   */
  currentPrice?: number;
  
  /** 
   * Recent price change in USD - used for color indicators 
   */
  priceChange?: number;
  
  /**
   * Custom class name for container styling
   */
  className?: string;
  
  /**
   * Accessibility label for the order book
   */
  ariaLabel?: string;
  
  /**
   * Error handler callback
   */
  onError?: (error: Error) => void;
}

/**
 * Custom hook for managing OrderBook component state
 * 
 * This hook centralizes all state management for the OrderBook component
 * to ensure React hooks are called unconditionally at the top level.
 * It handles:
 * 
 * 1. Data resolution (props vs. context)
 * 2. Error handling with proper context updates
 * 3. UI state for animations and interactions
 * 4. Memoization of expensive calculations
 * 5. WebSocket connection management
 * 
 * Using this pattern ensures consistent hook execution order and
 * provides a clear separation between state management and rendering.
 * 
 * @param props - The component props
 * @returns All state and handlers needed for the OrderBook component
 */
function useOrderBookComponent(props: OrderBookProps) {
  const { 
    orderBook: propOrderBook,
    currentPrice: propCurrentPrice,
    priceChange: propPriceChange,
    className = "",
    ariaLabel = "Bitcoin order book",
    onError
  } = props;

  // Get all data from context to use as fallbacks
  const { 
    bitcoinData,
    orderBookData: contextOrderBook,
    orderBookStatus,
    setOrderBookStatus
  } = useAppContext();
  
  // Determine effective values with proper fallback hierarchy
  const orderBook = propOrderBook !== undefined ? propOrderBook : contextOrderBook;
  const currentPrice = propCurrentPrice !== undefined ? propCurrentPrice : (bitcoinData?.price || 0);
  const priceChange = propPriceChange !== undefined ? propPriceChange : (bitcoinData?.change || 0);
  
  // Error handling with context and props
  const handleError = useCallback((error: Error) => {
    // Update context state
    setOrderBookStatus(prev => ({
      ...prev,
      error,
      connectionStatus: 'disconnected'
    }));
    
    // Call prop handler if provided
    if (onError) {
      onError(error);
    }
  }, [setOrderBookStatus, onError]);
  
  // Local state with constants to avoid magic values
  const [amount, setAmount] = useState(ORDER_BOOK_CONSTANTS.DEFAULT_AMOUNT);
  const viewMode = ORDER_BOOK_CONSTANTS.VIEW_MODE;
  
  // Use custom hooks with error handling
  const {
    localOrderBook,
    connectionStatus,
    animatingAsks,
    animatingBids,
    isLoading
  } = useOrderBookState(orderBook || undefined, currentPrice, handleError);
  
  const {
    isMobile,
    mobileOrderCount,
    tooltipData,
    hoveredRowId,
    handleOrderRowMouseEnter,
    handleOrderRowTouch,
    handleOrderRowMouseLeave
  } = useOrderBookInteractions();
  
  // Handle amount changes from AmountControl
  const handleAmountChange = useCallback((newAmount: string) => {
    setAmount(newAmount);
  }, []);
  
  // Memoize max volume calculation to avoid recalculating on every render
  const maxVolume = useMemo(() => {
    if (!localOrderBook) return 0;
    
    return Math.max(
      ...localOrderBook.asks.map(ask => ask.amount),
      ...localOrderBook.bids.map(bid => bid.amount)
    );
  }, [localOrderBook]);
  
  // Parse amount once for all child components - memoized for performance
  const selectedAmount = useMemo(() => 
    parseFloat(amount), 
    [amount]
  );
  
  // Update status in context
  useEffect(() => {
    if (connectionStatus && setOrderBookStatus) {
      const mappedStatus: 'connected' | 'connecting' | 'disconnected' = 
        connectionStatus === 'error' || 
        connectionStatus === 'fallback_rest' || 
        connectionStatus === 'fallback_cache' 
          ? 'disconnected' 
          : (connectionStatus === 'connected' || connectionStatus === 'connecting' 
             ? connectionStatus : 'disconnected');
      
      setOrderBookStatus(prev => ({
        ...prev,
        connectionStatus: mappedStatus,
        isLoading,
        lastUpdated: isLoading ? prev.lastUpdated : new Date()
      }));
    }
  }, [connectionStatus, isLoading, setOrderBookStatus]);
  
  return {
    // Props
    className,
    ariaLabel,
    
    // State
    localOrderBook,
    connectionStatus,
    animatingAsks,
    animatingBids,
    isLoading,
    amount,
    viewMode,
    selectedAmount,
    maxVolume,
    orderBookStatus,
    setOrderBookStatus,
    currentPrice,
    
    // Event handlers
    handleAmountChange,
    isMobile,
    mobileOrderCount,
    tooltipData,
    hoveredRowId,
    handleOrderRowMouseEnter,
    handleOrderRowTouch,
    handleOrderRowMouseLeave,
  };
}

/**
 * OrderBook component displaying real-time order book data 
 * Using a maintainable component architecture with proper accessibility
 */
function OrderBook(props: OrderBookProps) {
  // Use a custom hook to handle all state management and effects
  // This ensures hooks are always called in the same order
  const {
    className,
    ariaLabel,
    localOrderBook,
    connectionStatus: orderBookConnectionStatus,
    animatingAsks,
    animatingBids,
    amount,
    viewMode,
    selectedAmount,
    maxVolume,
    orderBookStatus,
    setOrderBookStatus,
    currentPrice,
    handleAmountChange,
    isMobile,
    mobileOrderCount,
    tooltipData,
    hoveredRowId,
    handleOrderRowMouseEnter,
    handleOrderRowTouch,
    handleOrderRowMouseLeave,
  } = useOrderBookComponent(props);

  // We don't need to map connectionStatus anymore since we updated the OrderBookHeader interface
  
  // Enhance loading state with proper aria attributes
  if (!localOrderBook) {
    return (
      <div 
        className={`text-white w-full font-sans animate-pulse p-4 ${className}`}
        role="progressbar"
        aria-label="Loading order book data"
        aria-busy="true"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Order Book</h2>
          <div className="w-48 h-8 bg-gray-800 rounded"></div>
        </div>
        <div className="h-64 bg-gray-800 rounded mt-4"></div>
      </div>
    );
  }
  
  // Handle error state with recovery option
  if (orderBookStatus.error && !localOrderBook) {
    return (
      <div className={`text-white w-full font-sans p-4 border border-red-800 rounded ${className}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Order Book</h2>
          <button 
            onClick={() => setOrderBookStatus(prev => ({
              ...prev,
              error: null,
              connectionStatus: 'connecting',
              isLoading: true
            }))}
            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white rounded-md text-sm transition-colors"
            aria-label="Retry loading order book"
          >
            Retry
          </button>
        </div>
        <p className="text-red-400 mt-2">{orderBookStatus.error.message}</p>
      </div>
    );
  }
  
  const { asks, bids, spread } = localOrderBook;
  
  return (
    <div 
      className={`text-white w-full font-sans ${className}`}
      aria-label={ariaLabel}
      role="region"
    >
      {/* Tooltip with enhanced accessibility */}
      <OrderBookTooltip 
        isVisible={tooltipData.isVisible}
        x={tooltipData.x}
        y={tooltipData.y}
        type={tooltipData.type}
        price={tooltipData.price}
        amount={tooltipData.amount}
        total={tooltipData.total}
        sum={tooltipData.sum}
        totalSum={tooltipData.totalSum}
        percentage={tooltipData.percentage}
      />
      
      {/* Order Book Header with connection status indicator */}
      <OrderBookHeader 
        isMobile={isMobile}
        viewMode={viewMode}
        connectionStatus={orderBookConnectionStatus}
      />
      
      {/* Amount Control with proper accessibility */}
      <AmountControl 
        amount={amount}
        onAmountChange={handleAmountChange}
        isMobile={isMobile}
        ariaLabel="Set trade amount"
      />
      
      {/* Order Book Margin for spacing - better semantic HTML */}
      <div className="mb-3" aria-hidden="true"></div>
      
      {/* Sell Orders (Asks) */}
      <OrdersList
        orders={asks}
        type="ask"
        maxVolume={maxVolume}
        viewMode={viewMode}
        selectedAmount={selectedAmount}
        isMobile={isMobile}
        mobileOrderCount={mobileOrderCount}
        hoveredRowId={hoveredRowId}
        animatingOrders={animatingAsks}
        onMouseEnter={handleOrderRowMouseEnter}
        onMouseLeave={handleOrderRowMouseLeave}
        onTouchStart={handleOrderRowTouch}
      />
      
      {/* Spread Indicator */}
      <OrderBookSpread 
        spread={spread}
        currentPrice={currentPrice}
        amount={amount}
        viewMode={viewMode}
      />
      
      {/* Buy Orders (Bids) */}
      <OrdersList
        orders={bids}
        type="bid"
        maxVolume={maxVolume}
        viewMode={viewMode}
        selectedAmount={selectedAmount}
        isMobile={isMobile}
        mobileOrderCount={mobileOrderCount}
        hoveredRowId={hoveredRowId}
        animatingOrders={animatingBids}
        onMouseEnter={handleOrderRowMouseEnter}
        onMouseLeave={handleOrderRowMouseLeave}
        onTouchStart={handleOrderRowTouch}
      />
      
      {/* Footer with stats */}
      <OrderBookFooter
        amount={amount}
        currentPrice={currentPrice}
        spread={spread}
        bestAsk={asks[0]?.price}
        bestBid={bids[0]?.price}
        connectionStatus={orderBookConnectionStatus}
        isMobile={isMobile}
      />
    </div>
  );
}

// Export the component directly
export default OrderBook;