import { useState } from 'react';
import { OrderBook as OrderBookType } from '@/types';
import OrderBookTooltip from './OrderBookTooltip';
import dynamic from 'next/dynamic';

// Import our refactored components
import { OrderBookHeader } from './OrderBookHeader';
import { AmountControl } from './AmountControl';
import { OrdersList } from './OrdersList';
import { OrderBookSpread } from './OrderBookSpread';
import { OrderBookFooter } from './OrderBookFooter';

// Import our custom hooks
import { useOrderBookState } from '@/hooks/useOrderBookState';
import { useOrderBookInteractions } from '@/hooks/useOrderBookInteractions';

interface OrderBookProps {
  orderBook?: OrderBookType;
  currentPrice: number;
  priceChange: number;
}

/**
 * OrderBook component displaying real-time order book data from Bitfinex
 * Refactored into smaller, focused components for better maintainability
 */
export function OrderBook({ orderBook: propOrderBook, currentPrice, priceChange }: OrderBookProps) {
  // Local state
  const [amount, setAmount] = useState("0.01");
  // Fixed to 'sum' view mode
  const viewMode = 'sum';
  
  // Use custom hooks
  const {
    localOrderBook,
    connectionStatus,
    animatingAsks,
    animatingBids,
    isLoading
  } = useOrderBookState(propOrderBook, currentPrice);
  
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
  const handleAmountChange = (newAmount: string) => {
    setAmount(newAmount);
  };
  
  // If data isn't loaded yet, show loading state
  if (!localOrderBook) {
    return (
      <div className="text-white w-full font-sans animate-pulse p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-fuji-bold">Order Book</h2>
          <div className="w-48 h-8 bg-gray-800 rounded"></div>
        </div>
        <div className="h-64 bg-gray-800 rounded mt-4"></div>
      </div>
    );
  }
  
  const { asks, bids, spread } = localOrderBook;
  
  // Calculate the maximum volume for sizing the depth bars
  const maxVolume = Math.max(
    ...asks.map(ask => ask.amount),
    ...bids.map(bid => bid.amount)
  );
  
  // Parse amount once for all child components
  const selectedAmount = parseFloat(amount);

  return (
    <div className="text-white w-full font-sans">
      {/* Tooltip */}
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
      
      {/* Order Book Header */}
      <OrderBookHeader 
        isMobile={isMobile}
        viewMode={viewMode}
      />
      
      {/* Amount Control */}
      <AmountControl 
        amount={amount}
        onAmountChange={handleAmountChange}
        isMobile={isMobile}
      />
      
      {/* Order Book Margin for spacing */}
      <div className="mb-3"></div>
      
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
        connectionStatus={connectionStatus}
        isMobile={isMobile}
      />
    </div>
  );
}

// Export a dynamic version that skips server-side rendering
// This ensures WebSocket code only runs on the client
export default dynamic(() => Promise.resolve(OrderBook), { 
  ssr: false,
  loading: () => (
    <div className="text-white w-full font-sans animate-pulse p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-fuji-bold">Order Book</h2>
        <div className="w-48 h-8 bg-gray-800 rounded"></div>
      </div>
      <div className="h-64 bg-gray-800 rounded mt-4"></div>
    </div>
  )
});