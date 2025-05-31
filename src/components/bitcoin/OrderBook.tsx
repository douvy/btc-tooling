import { 
  useState, 
  useEffect, 
  useRef, 
  ChangeEvent, 
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent
} from 'react';
import { OrderBook as OrderBookType, OrderBookEntry } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';
import { useOrderBookWebSocket } from '@/hooks/useOrderBookWebSocket';
import OrderBookTooltip from './OrderBookTooltip';
import dynamic from 'next/dynamic';
import Image from 'next/image';

interface OrderBookProps {
  orderBook?: OrderBookType;
  currentPrice: number;
  priceChange: number;
}

// Tooltip data interface for hover state
interface TooltipData {
  isVisible: boolean;
  x: number;
  y: number;
  type: 'ask' | 'bid';
  price: number;
  amount: number;
  total: number;
  sum: number;
  totalSum: number;
  percentage: number;
}

// Amount increment steps for BTC
const AMOUNT_STEPS = [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10];
const MIN_AMOUNT = 0.01;
const MAX_AMOUNT = 10;

// Type for exchange name
type Exchange = 'bitfinex';

// Create a client-side only version of the component - export the function for testing
export function OrderBook({ orderBook: propOrderBook, currentPrice, priceChange }: OrderBookProps) {
  const [amount, setAmount] = useState("0.01");
  // Fixed to 'sum' view mode and 'bitfinex' exchange
  const viewMode = 'sum';
  const selectedExchange = 'bitfinex' as Exchange;
  
  // Tooltip state
  const [tooltipData, setTooltipData] = useState<TooltipData>({
    isVisible: false,
    x: 0,
    y: 0,
    type: 'ask',
    price: 0,
    amount: 0,
    total: 0,
    sum: 0,
    totalSum: 0,
    percentage: 0
  });
  
  // Track which row is being hovered
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  
  // Mobile optimization: Detect screen size and control number of visible orders
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileOrderCount, setMobileOrderCount] = useState<number>(8); // Default fewer orders on mobile
  
  // Common function to handle hover/touch
  const showTooltip = (
    rect: DOMRect,
    type: 'ask' | 'bid',
    price: number,
    amount: number,
    total: number,
    sum: number,
    totalSum: number,
    rowId: string,
    isTouchEvent: boolean = false
  ) => {
    // Calculate percentage of total book
    const percentage = (sum / totalSum) * 100;
    
    // Calculate tooltip position - adjust for mobile touch events
    let x = rect.right + 10; // Position to the right of the row
    let y = rect.top;
    
    // For touch events on mobile, position tooltip in a more touch-friendly way
    if (isTouchEvent && isMobile) {
      // On mobile and touch, center tooltip horizontally and place it above or below the row
      x = window.innerWidth / 2 - 125; // 250px wide tooltip centered
      
      // Position above or below depending on vertical position
      if (rect.top > window.innerHeight / 2) {
        // If in bottom half of screen, position above
        y = rect.top - 200;
      } else {
        // If in top half of screen, position below
        y = rect.bottom + 10;
      }
    }
    
    // Update tooltip data
    setTooltipData({
      isVisible: true,
      x,
      y,
      type,
      price,
      amount,
      total,
      sum,
      totalSum,
      percentage
    });
    
    // Track hovered/touched row
    setHoveredRowId(rowId);
  };
  
  // Handle hover interactions
  const handleOrderRowMouseEnter = (
    e: ReactMouseEvent,
    type: 'ask' | 'bid',
    price: number,
    amount: number,
    total: number,
    sum: number,
    totalSum: number,
    rowId: string
  ) => {
    // Skip hover handling on mobile devices (use touch instead)
    if (isMobile) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    showTooltip(rect, type, price, amount, total, sum, totalSum, rowId);
  };
  
  // Handle touch interactions for mobile - highlight row without tooltip
  const handleOrderRowTouch = (
    e: ReactTouchEvent,
    type: 'ask' | 'bid',
    price: number,
    amount: number,
    total: number,
    sum: number,
    totalSum: number,
    rowId: string
  ) => {
    if (!isMobile) return;
    
    // Just highlight the row without showing tooltip
    setHoveredRowId(rowId);
    
    // Auto-clear highlight after a delay
    setTimeout(() => {
      setHoveredRowId(null);
    }, 1000);
  };
  
  // Hide tooltip on mouse leave
  const handleOrderRowMouseLeave = () => {
    // Only respond to mouse leave on desktop
    if (!isMobile) {
      setTooltipData(prev => ({ ...prev, isVisible: false }));
      setHoveredRowId(null);
    }
  };
  
  // Handle touch events outside of order rows to hide tooltip
  useEffect(() => {
    if (typeof window === 'undefined' || !isMobile) {
      return;
    }
    
    const handleTouchOutside = (e: TouchEvent) => {
      // Hide tooltip when touching elsewhere
      if (tooltipData.isVisible) {
        const target = e.target as Element;
        // Check if touch is outside of order rows
        if (!target.closest('.order-row')) {
          setTooltipData(prev => ({ ...prev, isVisible: false }));
          setHoveredRowId(null);
        }
      }
    };
    
    document.addEventListener('touchstart', handleTouchOutside);
    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [isMobile, tooltipData.isVisible]);
  
  // Use WebSocket hook for Bitfinex data with FPS limiting
  const {
    orderBook: wsOrderBook,
    connectionStatus,
    error: wsError,
    lastUpdated,
    isLoading: wsLoading,
    performanceMetrics
  } = useOrderBookWebSocket('BTCUSD', selectedExchange);
  
  // Track updated orders to animate them
  const [animatingAsks, setAnimatingAsks] = useState<Record<number, boolean>>({});
  const [animatingBids, setAnimatingBids] = useState<Record<number, boolean>>({});
  
  // Manage local order book based on props or WebSocket data
  const [localOrderBook, setLocalOrderBook] = useState<OrderBookType | null>(null);
  
  // Detect mobile screen size and adjust layout accordingly
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') {
      return;
    }
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint in Tailwind
      setIsMobile(mobile);
      
      // Adjust number of visible orders based on screen size
      // Smaller screens get fewer rows to avoid crowded UI
      if (mobile) {
        if (window.innerWidth < 375) {
          setMobileOrderCount(5); // Very small screens
        } else {
          setMobileOrderCount(8); // Regular mobile screens
        }
      } else {
        setMobileOrderCount(Infinity); // Show all on larger screens
      }
    };
    
    // Initial check
    checkMobile();
    
    // Set up listener for resize events
    window.addEventListener('resize', checkMobile);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use provided orderBook prop, WebSocket data, or fallbacks as appropriate
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
    
    // Second priority: Use WebSocket or fallback data from the hook
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
      
      // Regular update - set animations and update the book
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
    
    // If we still don't have any order book data at all, use mock data as a last resort
    if (!localOrderBook) {
      const newOrderBook = getMockOrderBook(selectedExchange);
      setLocalOrderBook(newOrderBook);
    }
  }, [propOrderBook, wsOrderBook, selectedExchange, localOrderBook]);
  
  // Fixed to Bitfinex exchange
  
  // No need for click outside handler anymore
  
  // Handle amount increment/decrement
  const decrementAmount = () => {
    const currentAmount = parseFloat(amount);
    
    // Find the previous step in the array
    const currentIndex = AMOUNT_STEPS.findIndex(step => step >= currentAmount);
    const prevIndex = Math.max(0, currentIndex - 1);
    
    const newAmount = AMOUNT_STEPS[prevIndex];
    setAmount(newAmount.toString());
  };
  
  const incrementAmount = () => {
    const currentAmount = parseFloat(amount);
    
    // Find the next step in the array
    const currentIndex = AMOUNT_STEPS.findIndex(step => step > currentAmount);
    const nextIndex = currentIndex === -1 ? AMOUNT_STEPS.length - 1 : currentIndex;
    
    const newAmount = AMOUNT_STEPS[nextIndex];
    setAmount(newAmount.toString());
  };
  
  // Check if at min or max amount
  const isAtMinAmount = parseFloat(amount) <= MIN_AMOUNT;
  const isAtMaxAmount = parseFloat(amount) >= MAX_AMOUNT;
  
  // Handle amount input change
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Only allow valid numbers with up to 2 decimal places
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value);
    }
  };
  
  // Handle entering a custom amount
  const handleBlur = () => {
    // Validate and format amount on blur
    if (amount === '' || isNaN(parseFloat(amount))) {
      setAmount(MIN_AMOUNT.toString());
    } else {
      // Ensure amount is within min/max range
      let numAmount = parseFloat(amount);
      if (numAmount < MIN_AMOUNT) {
        numAmount = MIN_AMOUNT;
      } else if (numAmount > MAX_AMOUNT) {
        numAmount = MAX_AMOUNT;
      }
      
      // Find the closest preset step
      const closestStep = AMOUNT_STEPS.reduce((prev, curr) => {
        return (Math.abs(curr - numAmount) < Math.abs(prev - numAmount) ? curr : prev);
      });
      
      setAmount(closestStep.toString());
    }
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
  
  // Content classes for consistent styling
  const contentClasses = 'opacity-100';
  
  const { asks, bids, spread } = localOrderBook;
  
  // Calculate the maximum volume for sizing the depth bars
  const maxVolume = Math.max(
    ...asks.map(ask => ask.amount),
    ...bids.map(bid => bid.amount)
  );
  
  // Bitfinex is the only exchange used
  const currentExchange = { logo: '💱', name: 'Bitfinex' };

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
      
      <div className="flex justify-between items-center">
        <div className="flex justify-between items-center w-full mt-6 sm:mt-4">
          <h2 id="halving-title" className="text-xl font-fuji-bold">
            Order Book
          </h2>
          
          {/* Exchange indicator with logo */}
          <div className="text-right text-sm text-light-gray flex items-center">
            <div className="w-6 h-6 mr-2 overflow-hidden rounded-sm">
              <Image 
                src="/images/bitfinex.jpg" 
                alt="Bitfinex logo" 
                width={24} 
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-fuji-bold text-lg -ml-2">Bitfinex</span>
          </div>
        </div>
      </div>

      {/* Amount Control - Responsive for mobile */}
      <div className={`flex items-center my-3 ${isMobile ? '' : 'gap-1'}`}>
        {/* Minus button */}
        <div className={`${isMobile ? 'w-12' : 'w-8'} h-10 
          border ${isAtMinAmount ? 'border-gray-800' : 'border-divider'} 
          rounded-sm ${!isAtMinAmount ? 'hover:bg-gray-700' : ''} 
          transition-colors flex-shrink-0`}>
          <button 
            className={`w-full h-full flex items-center justify-center text-lg ${isAtMinAmount ? 'text-gray-700 cursor-default' : 'text-white'}`}
            onClick={decrementAmount}
            aria-label="Decrease amount"
            disabled={isAtMinAmount}
          >−</button>
        </div>
        
        {/* Amount input - Fixed width to ensure proper sizing */}
        <div className="flex-grow mx-3">
          <div className="w-full h-10 border border-divider flex items-center rounded-sm relative">
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              onBlur={handleBlur}
              className="w-full h-full bg-transparent text-sm text-white text-center outline-none px-8"
              aria-label="Amount in BTC"
            />
            <span className="absolute right-2 text-sm text-white">BTC</span>
          </div>
        </div>
        
        {/* Plus button */}
        <div className={`${isMobile ? 'w-12' : 'w-8'} h-10 
          border ${isAtMaxAmount ? 'border-gray-800' : 'border-divider'} 
          rounded-sm ${!isAtMaxAmount ? 'hover:bg-gray-700' : ''} 
          transition-colors flex-shrink-0`}>
          <button 
            className={`w-full h-full flex items-center justify-center text-lg ${isAtMaxAmount ? 'text-gray-700 cursor-default' : 'text-white'}`}
            onClick={incrementAmount}
            aria-label="Increase amount"
            disabled={isAtMaxAmount}
          >+</button>
        </div>
      </div>

      {/* Order Book Margin for spacing */}
      <div className="mb-3"></div>
      
      {/* Column Headers with Exchange Indicator */}
      <div className={`grid grid-cols-18 text-xs py-2 px-1 border-b border-divider ${contentClasses}`}>
        <div className="col-span-1"></div> {/* Bar column */}
        <div className="col-span-5 text-center text-muted">
          {isMobile ? 'Amt' : 'Amount'} {!isMobile && '(BTC)'}
        </div>
        <div className="col-span-6 text-center text-muted">
          Price (USD)
        </div>
        <div className="col-span-6 text-center text-muted">
          {viewMode === 'sum' 
            ? (isMobile ? 'Sum' : 'Sum (BTC)') 
            : (isMobile ? 'Total' : 'Total (USD)')}
        </div>
      </div>

      {/* Sell Orders (Asks) - Red */}
      <div className={`overflow-y-auto ${isMobile ? 'max-h-[120px]' : 'max-h-[150px]'} ${contentClasses}`}>
        {asks.slice(0, isMobile ? mobileOrderCount : asks.length).map((ask, index) => {
          const volumePercentage = (ask.amount / maxVolume) * 100;
          const selectedAmount = parseFloat(amount);
          const isHighlighted = selectedAmount <= ask.amount;
          const isInOrderRange = index <= 4; // Top 5 orders get special highlight
          
          // Calculate depth percentage for visualization
          const sumPercentage = Math.min((ask.sum / asks[asks.length - 1].sum) * 100, 100);
          
          return (
            <div 
              key={`ask-${index}`} 
              className={`grid grid-cols-18 text-xs ${isMobile ? 'py-2' : 'py-1'} relative transition-colors order-row
                ${isHighlighted ? 'bg-transparent' : ''}
                ${isInOrderRange && isHighlighted ? 'border-l-2 border-error' : ''}
                ${hoveredRowId === `ask-${index}` ? 'bg-black bg-opacity-50 shadow-md' : 'hover:bg-black hover:bg-opacity-30'}
                ${isMobile ? 'cursor-pointer active:bg-gray-700' : ''}
                ${animatingAsks[ask.price] ? 'animate-orderbook-flash-red' : ''}
              `}
              onMouseEnter={(e) => handleOrderRowMouseEnter(
                e, 
                'ask', 
                ask.price, 
                ask.amount, 
                ask.price * ask.amount, 
                ask.sum, 
                asks[asks.length - 1].sum,
                `ask-${index}`
              )}
              onMouseLeave={handleOrderRowMouseLeave}
              onTouchStart={(e) => handleOrderRowTouch(
                e,
                'ask',
                ask.price,
                ask.amount,
                ask.price * ask.amount,
                ask.sum,
                asks[asks.length - 1].sum,
                `ask-${index}`
              )}
            >
              {/* Red bar column */}
              <div className="col-span-1 h-full flex items-center">
                <div 
                  className={`h-3/5 ${
                    isInOrderRange && isHighlighted ? 'bg-error opacity-70' : 'bg-error opacity-50'
                  } transition-all duration-200 ${
                    animatingAsks[ask.price] ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                <span className={animatingAsks[ask.price] ? 'font-bold text-white transition-colors duration-150' : 'transition-colors duration-150'}>
                  {isMobile ? ask.amount.toFixed(4) : ask.amount.toFixed(8)}
                </span>
              </div>
              
              {/* Price column */}
              <div className={`col-span-6 text-center transition-all duration-200 ${
                isInOrderRange && isHighlighted 
                  ? 'text-error font-bold' 
                  : animatingAsks[ask.price]
                    ? 'animate-price-flicker-red font-bold' 
                    : 'text-error'
              }`}>
                {ask.price.toFixed(2)}
                {!isMobile && isInOrderRange && isHighlighted && selectedAmount >= ask.amount * 0.8 && (
                  <span className="ml-1 text-xs">${(ask.price * ask.amount).toFixed(2)}</span>
                )}
              </div>
              
              {/* Sum/Total column with depth indicator */}
              <div className="col-span-6 text-center text-gray-300 relative">
                {viewMode === 'sum' ? (
                  <>
                    <span className={hoveredRowId === `ask-${index}` ? 'font-bold text-white' : ''}>
                      {isMobile ? ask.sum.toFixed(2) : ask.sum.toFixed(4)}
                    </span>
                    <div 
                      className={`absolute top-0 right-0 h-full ${hoveredRowId === `ask-${index}` ? 'bg-error opacity-30' : 'bg-error opacity-10'}`}
                      style={{ width: `${sumPercentage}%` }}
                    ></div>
                  </>
                ) : (
                  <span className={hoveredRowId === `ask-${index}` ? 'font-bold text-white' : ''}>
                    ${isMobile ? Math.round(ask.price * ask.amount) : (ask.price * ask.amount).toFixed(2)}
                  </span>
                )}
                
                {/* Visual percentage indicator on hover */}
                {hoveredRowId === `ask-${index}` && (
                  <div className="absolute top-0 left-2 text-[10px] text-error">
                    {(ask.sum / asks[asks.length - 1].sum * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spread Indicator with current amount value */}
      <div className={`grid grid-cols-18 text-xs py-2 border-t border-b border-divider ${contentClasses}`}>
        <div className="col-span-1"></div>
        <div className="col-span-5 text-center text-dark-grayish-blue">USD Spread</div>
        <div className="col-span-6 text-center text-dark-grayish-blue">{spread.toFixed(2)}</div>
        <div className="col-span-6 text-center text-white">
          <span className="text-dark-grayish-blue mr-1">≈</span>
          ${(parseFloat(amount) * currentPrice).toFixed(2)}
        </div>
      </div>

      {/* Buy Orders (Bids) - Green */}
      <div className={`overflow-y-auto ${isMobile ? 'max-h-[120px]' : 'max-h-[150px]'} ${contentClasses}`}>
        {bids.slice(0, isMobile ? mobileOrderCount : bids.length).map((bid, index) => {
          const volumePercentage = (bid.amount / maxVolume) * 100;
          const selectedAmount = parseFloat(amount);
          const isHighlighted = selectedAmount <= bid.amount;
          const isInOrderRange = index <= 4; // Top 5 orders get special highlight
          
          // Calculate depth percentage for visualization
          const sumPercentage = Math.min((bid.sum / bids[bids.length - 1].sum) * 100, 100);
          
          return (
            <div 
              key={`bid-${index}`} 
              className={`grid grid-cols-18 text-xs ${isMobile ? 'py-2' : 'py-1'} relative transition-colors order-row
                ${isHighlighted ? 'bg-transparent' : ''}
                ${isInOrderRange && isHighlighted ? 'border-l-2 border-success' : ''}
                ${hoveredRowId === `bid-${index}` ? 'bg-black bg-opacity-50 shadow-md' : 'hover:bg-black hover:bg-opacity-30'}
                ${isMobile ? 'cursor-pointer active:bg-gray-700' : ''}
                ${animatingBids[bid.price] ? 'animate-orderbook-flash-green' : ''}
              `}
              onMouseEnter={(e) => handleOrderRowMouseEnter(
                e, 
                'bid', 
                bid.price, 
                bid.amount, 
                bid.price * bid.amount, 
                bid.sum, 
                bids[bids.length - 1].sum,
                `bid-${index}`
              )}
              onMouseLeave={handleOrderRowMouseLeave}
              onTouchStart={(e) => handleOrderRowTouch(
                e,
                'bid',
                bid.price,
                bid.amount,
                bid.price * bid.amount,
                bid.sum,
                bids[bids.length - 1].sum,
                `bid-${index}`
              )}
            >
              {/* Green bar column */}
              <div className="col-span-1 h-full flex items-center">
                <div 
                  className={`h-3/5 ${
                    isInOrderRange && isHighlighted ? 'bg-success opacity-70' : 'bg-success opacity-50'
                  } transition-all duration-200 ${
                    animatingBids[bid.price] ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                <span className={animatingBids[bid.price] ? 'font-bold text-white transition-colors duration-150' : 'transition-colors duration-150'}>
                  {isMobile ? bid.amount.toFixed(4) : bid.amount.toFixed(8)}
                </span>
              </div>
              
              {/* Price column */}
              <div className={`col-span-6 text-center transition-all duration-200 ${
                isInOrderRange && isHighlighted 
                  ? 'text-success font-bold' 
                  : animatingBids[bid.price]
                    ? 'animate-price-flicker-green font-bold' 
                    : 'text-success'
              }`}>
                {bid.price.toFixed(2)}
                {!isMobile && isInOrderRange && isHighlighted && selectedAmount >= bid.amount * 0.8 && (
                  <span className="ml-1 text-xs">${(bid.price * bid.amount).toFixed(2)}</span>
                )}
              </div>
              
              {/* Sum/Total column with depth indicator */}
              <div className="col-span-6 text-center text-gray-300 relative">
                {viewMode === 'sum' ? (
                  <>
                    <span className={hoveredRowId === `bid-${index}` ? 'font-bold text-white' : ''}>
                      {isMobile ? bid.sum.toFixed(2) : bid.sum.toFixed(4)}
                    </span>
                    <div 
                      className={`absolute top-0 right-0 h-full ${hoveredRowId === `bid-${index}` ? 'bg-success opacity-30' : 'bg-success opacity-10'}`}
                      style={{ width: `${sumPercentage}%` }}
                    ></div>
                  </>
                ) : (
                  <span className={hoveredRowId === `bid-${index}` ? 'font-bold text-white' : ''}>
                    ${isMobile ? Math.round(bid.price * bid.amount) : (bid.price * bid.amount).toFixed(2)}
                  </span>
                )}
                
                {/* Visual percentage indicator on hover */}
                {hoveredRowId === `bid-${index}` && (
                  <div className="absolute top-0 left-2 text-[10px] text-success">
                    {(bid.sum / bids[bids.length - 1].sum * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Enhanced amount summary footer - Responsive for mobile */}
      <div className={`mt-3 text-xs border-t border-divider pt-3 ${contentClasses}`}>
        {/* Desktop layout */}
        {!isMobile && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="mr-1 text-dark-grayish-blue">Amount:</span>
                <span className="font-bold text-white">{amount} BTC</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1 text-dark-grayish-blue">Value:</span>
                <span className="font-bold text-white">${(parseFloat(amount) * currentPrice).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <span className="mr-1 text-dark-grayish-blue">Best Ask:</span>
                <span className="font-bold text-error">${asks[0]?.price.toFixed(2) || '--'}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1 text-dark-grayish-blue">Best Bid:</span>
                <span className="font-bold text-success">${bids[0]?.price.toFixed(2) || '--'}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <span className="mr-1 text-dark-grayish-blue">Spread:</span>
                <span className="font-bold tex-white">${spread.toFixed(2)} ({((spread / currentPrice) * 100).toFixed(3)}%)</span>
              </div>
              <div className="flex items-center">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-1 bg-success" />
                    <span className="text-muted">Live</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Mobile layout - More compact with grid */}
        {isMobile && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
              <span className="text-dark-grayish-blue text-[10px]">Amount</span>
              <span className="font-bold text-white">{amount} BTC</span>
              <span className="text-muted text-[10px]">${(parseFloat(amount) * currentPrice).toFixed(2)}</span>
            </div>
            
            <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
              <span className="text-dark-grayish-blue text-[10px]">Spread</span>
              <span className="font-bold text-white">${spread.toFixed(2)}</span>
              <span className="text-muted text-[10px]">({((spread / currentPrice) * 100).toFixed(2)}%)</span>
            </div>
            
            <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
              <span className="text-dark-grayish-blue text-[10px]">Best Ask</span>
              <span className="font-bold text-error">${asks[0]?.price.toFixed(2) || '--'}</span>
            </div>
            
            <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
              <span className="text-dark-grayish-blue text-[10px]">Best Bid</span>
              <span className="font-bold text-success">${bids[0]?.price.toFixed(2) || '--'}</span>
            </div>
          </div>
        )}
        
        {/* Only show fallback status if needed */}
        {(connectionStatus === 'fallback_rest' || 
          connectionStatus === 'fallback_cache' || 
          connectionStatus === 'fallback_mock') && (
          <div className="mt-3 pt-2 border-t border-divider flex items-center justify-center text-[10px]">
            <span className="px-1 py-0.5 bg-gray-700 text-dark-grayish-blue rounded-sm">
              FALLBACK DATA
            </span>
          </div>
        )}
      </div>
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