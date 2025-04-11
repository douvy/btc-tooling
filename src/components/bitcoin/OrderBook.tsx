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

// Preset amount options in BTC
const AMOUNT_PRESETS = [
  { label: '0.01', value: '0.01' },
  { label: '0.05', value: '0.05' },
  { label: '0.1', value: '0.1' },
  { label: '0.25', value: '0.25' },
  { label: '0.5', value: '0.5' },
  { label: '1', value: '1' },
];

// Available exchanges
type Exchange = 'bitfinex' | 'coinbase' | 'binance';

const EXCHANGES = [
  { id: 'bitfinex', name: 'Bitfinex', logo: '💱' },
  { id: 'coinbase', name: 'Coinbase', logo: '🔷' },
  { id: 'binance', name: 'Binance', logo: '🟡' },
];

// Create a client-side only version of the component - export the function for testing
export function OrderBook({ orderBook: propOrderBook, currentPrice, priceChange }: OrderBookProps) {
  const [amount, setAmount] = useState("0.05");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell');
  const [viewMode, setViewMode] = useState<'sum' | 'detailed'>('sum');
  const [selectedExchange, setSelectedExchange] = useState<Exchange>('bitfinex');
  const [isExchangeTransitioning, setIsExchangeTransitioning] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);
  
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
  
  // Handle touch interactions for mobile
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
    e.preventDefault(); // Prevent scrolling
    
    const rect = e.currentTarget.getBoundingClientRect();
    showTooltip(rect, type, price, amount, total, sum, totalSum, rowId, true);
    
    // Auto-hide tooltip after a delay
    setTimeout(() => {
      setTooltipData(prev => ({ ...prev, isVisible: false }));
      setHoveredRowId(null);
    }, 3000);
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
      setLocalOrderBook(propOrderBook);
      return;
    }
    
    // Second priority: Use WebSocket or fallback data from the hook
    if (wsOrderBook) {
      // Handle the exchange transition with a smooth animation
      setIsExchangeTransitioning(true);
      
      setTimeout(() => {
        setLocalOrderBook(wsOrderBook);
        setIsExchangeTransitioning(false);
      }, 300);
      return;
    } 
    
    // If we still don't have any order book data at all, use mock data as a last resort
    if (!localOrderBook) {
      setIsExchangeTransitioning(true);
      
      setTimeout(() => {
        const newOrderBook = getMockOrderBook(selectedExchange);
        setLocalOrderBook(newOrderBook);
        setIsExchangeTransitioning(false);
      }, 300);
    }
  }, [propOrderBook, wsOrderBook, selectedExchange, localOrderBook]);
  
  // Handle exchange selection
  const handleExchangeChange = (exchange: Exchange) => {
    if (exchange !== selectedExchange) {
      setSelectedExchange(exchange);
    }
  };
  
  // Handle click outside to close presets dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle amount increment/decrement
  const decrementAmount = () => {
    setIsCustomAmount(true);
    
    const currentAmount = parseFloat(amount);
    const step = currentAmount <= 0.1 ? 0.01 : 0.05;
    
    if (currentAmount > step) {
      setAmount((currentAmount - step).toFixed(currentAmount <= 0.1 ? 2 : 2));
    }
  };
  
  const incrementAmount = () => {
    setIsCustomAmount(true);
    
    const currentAmount = parseFloat(amount);
    const step = currentAmount < 0.1 ? 0.01 : 0.05;
    
    setAmount((currentAmount + step).toFixed(currentAmount < 0.1 ? 2 : 2));
  };
  
  // Handle amount input change
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsCustomAmount(true);
    
    // Only allow valid numbers with up to 8 decimal places
    const value = e.target.value;
    if (/^\d*\.?\d{0,8}$/.test(value) || value === '') {
      setAmount(value);
    }
  };
  
  // Handle preset selection
  const selectPreset = (preset: string) => {
    setAmount(preset);
    setIsCustomAmount(false);
    setShowPresets(false);
  };
  
  // Handle entering a custom amount
  const handleBlur = () => {
    // Validate and format amount on blur
    if (amount === '' || isNaN(parseFloat(amount))) {
      setAmount('0.01');
    } else {
      // Ensure minimum amount of 0.001 BTC
      const numAmount = parseFloat(amount);
      if (numAmount < 0.001) {
        setAmount('0.001');
      } else {
        // Format with appropriate precision
        setAmount(numAmount.toFixed(numAmount < 0.1 ? 3 : 2));
      }
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
  
  // Add transition effect when switching exchanges
  const contentClasses = isExchangeTransitioning
    ? 'opacity-30 transition-opacity duration-300 ease-in-out'
    : 'opacity-100 transition-opacity duration-300 ease-in-out';
  
  const { asks, bids, spread } = localOrderBook;
  
  // Calculate the maximum volume for sizing the depth bars
  const maxVolume = Math.max(
    ...asks.map(ask => ask.amount),
    ...bids.map(bid => bid.amount)
  );
  
  // Get the current exchange display name
  const currentExchange = EXCHANGES.find(ex => ex.id === selectedExchange) || EXCHANGES[0];

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
        <h2 id="halving-title" className="text-xl font-fuji-bold">
          Order Book
        </h2>
        
        {/* Exchange Selection Tabs */}
        <div className="flex bg-gray-900 rounded-sm shadow overflow-hidden">
          {EXCHANGES.map((exchange) => (
            <button
              key={exchange.id}
              onClick={() => handleExchangeChange(exchange.id as Exchange)}
              className={`
                px-3 py-1 text-xs font-medium transition-all duration-300 ease-in-out
                flex items-center justify-center gap-1
                ${selectedExchange === exchange.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-800'}
                ${isExchangeTransitioning ? 'opacity-50 pointer-events-none' : ''}
              `}
              disabled={isExchangeTransitioning}
              aria-pressed={selectedExchange === exchange.id}
            >
              <span>{exchange.logo}</span>
              <span>{exchange.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Amount Control - Responsive for mobile */}
      <div className={`flex items-center my-3 gap-1 ${isMobile ? 'flex-wrap justify-center' : ''}`}>
        {/* Minus button - Larger touch target on mobile */}
        <div className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} border border-divider rounded-sm hover:bg-gray-700 transition-colors`}>
          <button 
            className="w-full h-full flex items-center justify-center text-lg text-white"
            onClick={decrementAmount}
            aria-label="Decrease amount"
          >−</button>
        </div>
        
        {/* Amount input with dropdown - Full width on mobile */}
        <div className={`relative ${isMobile ? 'flex-1 min-w-[60%]' : ''}`}>
          <div 
            className={`${isMobile ? 'w-full' : 'w-[210px]'} h-8 border border-divider flex items-center rounded-sm ml-1 mr-1 cursor-pointer`}
            onClick={() => setShowPresets(!showPresets)}
          >
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              onBlur={handleBlur}
              className="w-full h-full bg-transparent text-sm text-white text-center outline-none"
              aria-label="Amount in BTC"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="absolute right-3 text-sm text-white">BTC</span>
            <button 
              className="absolute right-10 text-xs text-gray-400"
              onClick={(e) => {
                e.stopPropagation();
                setShowPresets(!showPresets);
              }}
            >
              ▼
            </button>
          </div>
          
          {/* Presets dropdown - Full width on mobile */}
          {showPresets && (
            <div 
              ref={presetsRef}
              className={`absolute mt-1 left-1 ${isMobile ? 'w-full' : 'w-[210px]'} bg-gray-800 border border-divider z-10 rounded-sm shadow-lg`}
            >
              <div className="p-2 text-xs text-gray-400">Presets</div>
              <div className="grid grid-cols-3 gap-1 p-2">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    className={`text-xs ${isMobile ? 'py-2' : 'py-1'} px-2 rounded ${
                      amount === preset.value 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    onClick={() => selectPreset(preset.value)}
                  >
                    {preset.label} BTC
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-divider">
                <button
                  className={`text-xs ${isMobile ? 'py-2' : 'py-1'} px-2 w-full text-left text-blue-400 hover:text-blue-300`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCustomAmount(true);
                    setShowPresets(false);
                  }}
                >
                  Enter custom amount...
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Plus button - Larger touch target on mobile */}
        <div className={`${isMobile ? 'w-10 h-10' : 'w-8 h-8'} border border-divider rounded-sm hover:bg-gray-700 transition-colors`}>
          <button 
            className="w-full h-full flex items-center justify-center text-lg text-white"
            onClick={incrementAmount}
            aria-label="Increase amount"
          >+</button>
        </div>
      </div>

      {/* Order Type Buttons */}
      <div className="flex mb-3 text-xs">
        <button 
          className={`px-2 py-1 rounded-l-sm border border-divider hover:bg-gray-700 transition-colors
            ${orderType === 'buy' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
          onClick={() => setOrderType('buy')}
          aria-pressed={orderType === 'buy'}
        >
          Buy
        </button>
        <button 
          className={`px-2 py-1 rounded-r-sm border-t border-r border-b border-divider hover:bg-gray-700 transition-colors
            ${orderType === 'sell' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
          onClick={() => setOrderType('sell')}
          aria-pressed={orderType === 'sell'}
        >
          Sell
        </button>
        <div className="ml-auto flex gap-2">
          <button 
            className={`px-2 py-1 rounded-sm border border-divider hover:bg-gray-700 transition-colors
              ${viewMode === 'sum' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
            onClick={() => setViewMode('sum')}
            aria-pressed={viewMode === 'sum'}
          >
            Sum
          </button>
          <button 
            className={`px-2 py-1 rounded-sm border border-divider hover:bg-gray-700 transition-colors
              ${viewMode === 'detailed' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
            onClick={() => setViewMode('detailed')}
            aria-pressed={viewMode === 'detailed'}
          >
            Detailed
          </button>
        </div>
      </div>
      
      {/* Column Headers with Exchange Indicator */}
      <div className={`grid grid-cols-18 text-xs py-2 px-1 border-b border-divider ${contentClasses}`}>
        <div className="col-span-1"></div> {/* Bar column */}
        <div className="col-span-5 text-center text-[#8a919e]">
          {isMobile ? 'Amt' : 'Amount'} {!isMobile && '(BTC)'}
        </div>
        <div className="col-span-6 text-center text-[#8a919e]">
          Price (USD)
          <span className="ml-1 text-[10px] text-blue-400">{currentExchange.logo}</span>
        </div>
        <div className="col-span-6 text-center text-[#8a919e]">
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
                ${isHighlighted ? 'bg-gray-900' : ''}
                ${isInOrderRange && isHighlighted ? 'border-l-2 border-error' : ''}
                ${hoveredRowId === `ask-${index}` ? 'bg-gray-800 shadow-md' : 'hover:bg-gray-800'}
                ${isMobile ? 'cursor-pointer active:bg-gray-700' : ''}
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
                  className={`h-3/5 ${isInOrderRange && isHighlighted ? 'bg-error opacity-70' : 'bg-error opacity-50'}`}
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                {isMobile ? ask.amount.toFixed(4) : ask.amount.toFixed(8)}
                {isInOrderRange && isHighlighted && (
                  <span className="ml-1 text-[10px] text-error">✓</span>
                )}
              </div>
              
              {/* Price column */}
              <div className={`col-span-6 text-center ${isInOrderRange && isHighlighted ? 'text-error font-bold' : 'text-error'}`}>
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
        <div className="col-span-5 text-center text-gray-400">USD Spread</div>
        <div className="col-span-6 text-center text-gray-400">{spread.toFixed(2)}</div>
        <div className="col-span-6 text-center text-blue-400">
          <span className="text-gray-400 mr-1">≈</span>
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
                ${isHighlighted ? 'bg-gray-900' : ''}
                ${isInOrderRange && isHighlighted ? 'border-l-2 border-success' : ''}
                ${hoveredRowId === `bid-${index}` ? 'bg-gray-800 shadow-md' : 'hover:bg-gray-800'}
                ${isMobile ? 'cursor-pointer active:bg-gray-700' : ''}
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
                  className={`h-3/5 ${isInOrderRange && isHighlighted ? 'bg-success opacity-70' : 'bg-success opacity-50'}`}
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                {isMobile ? bid.amount.toFixed(4) : bid.amount.toFixed(8)}
                {isInOrderRange && isHighlighted && (
                  <span className="ml-1 text-[10px] text-success">✓</span>
                )}
              </div>
              
              {/* Price column */}
              <div className={`col-span-6 text-center ${isInOrderRange && isHighlighted ? 'text-success font-bold' : 'text-success'}`}>
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
                <span className="mr-1 text-gray-400">Amount:</span>
                <span className="font-bold text-white">{amount} BTC</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1 text-gray-400">Value:</span>
                <span className="font-bold text-white">${(parseFloat(amount) * currentPrice).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <span className="mr-1 text-gray-400">Best Ask:</span>
                <span className="font-bold text-error">${asks[0]?.price.toFixed(2) || '--'}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-1 text-gray-400">Best Bid:</span>
                <span className="font-bold text-success">${bids[0]?.price.toFixed(2) || '--'}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center">
                <span className="mr-1 text-gray-400">Mid Price:</span>
                <span className="font-bold text-white">
                  ${((asks[0]?.price + bids[0]?.price) / 2).toFixed(2) || '--'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="mr-1 text-gray-400">Spread:</span>
                <span className="font-bold text-blue-400">${spread.toFixed(2)} ({((spread / currentPrice) * 100).toFixed(3)}%)</span>
              </div>
            </div>
          </>
        )}
        
        {/* Mobile layout - More compact with grid */}
        {isMobile && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900 p-2 rounded-sm border border-divider flex flex-col items-center">
              <span className="text-gray-400 text-[10px]">Amount</span>
              <span className="font-bold text-white">{amount} BTC</span>
              <span className="text-blue-400 text-[10px]">${(parseFloat(amount) * currentPrice).toFixed(2)}</span>
            </div>
            
            <div className="bg-gray-900 p-2 rounded-sm border border-divider flex flex-col items-center">
              <span className="text-gray-400 text-[10px]">Spread</span>
              <span className="font-bold text-blue-400">${spread.toFixed(2)}</span>
              <span className="text-blue-300 text-[10px]">({((spread / currentPrice) * 100).toFixed(2)}%)</span>
            </div>
            
            <div className="bg-gray-900 p-2 rounded-sm border border-divider flex flex-col items-center">
              <span className="text-gray-400 text-[10px]">Best Ask</span>
              <span className="font-bold text-error">${asks[0]?.price.toFixed(2) || '--'}</span>
            </div>
            
            <div className="bg-gray-900 p-2 rounded-sm border border-divider flex flex-col items-center">
              <span className="text-gray-400 text-[10px]">Best Bid</span>
              <span className="font-bold text-success">${bids[0]?.price.toFixed(2) || '--'}</span>
            </div>
          </div>
        )}
        
        {/* Exchange info footer with connection status and performance metrics */}
        <div className={`mt-3 pt-2 border-t border-divider flex ${isMobile ? 'flex-col gap-2' : 'flex-col gap-1'} text-[10px] text-gray-500`}>
          <div className={`${isMobile ? 'flex flex-col space-y-1' : 'flex items-center justify-between'}`}>
            <div className="flex items-center">
              <span>{currentExchange.logo}</span>
              <span className="ml-1">
                Data from {currentExchange.name}
                {(connectionStatus === 'fallback_rest' || 
                  connectionStatus === 'fallback_cache' || 
                  connectionStatus === 'fallback_mock') && (
                  <span className={`ml-1 ${isMobile ? 'text-[10px]' : 'text-[8px]'} px-1 py-0.5 bg-gray-700 rounded-sm`}>
                    FALLBACK
                  </span>
                )}
              </span>
              
              {/* Connection status for WebSocket */}
              <div className="ml-3 flex items-center">
                <div className={`${isMobile ? 'w-3 h-3' : 'w-2 h-2'} rounded-full mr-1 ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500' 
                    : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                      ? 'bg-yellow-500 animate-pulse' 
                      : connectionStatus === 'fallback_rest'
                        ? 'bg-blue-500'
                        : connectionStatus === 'fallback_cache'
                          ? 'bg-purple-500'
                          : connectionStatus === 'fallback_mock'
                            ? 'bg-gray-500'
                            : 'bg-red-500'
                }`} />
                <span className={`
                  ${isMobile ? 'text-[11px]' : ''}
                  ${connectionStatus === 'connected' 
                    ? 'text-green-500' 
                    : connectionStatus === 'connecting'
                      ? 'text-yellow-500' 
                      : connectionStatus === 'reconnecting'
                        ? 'text-yellow-500'
                        : connectionStatus === 'fallback_rest'
                          ? 'text-blue-500'
                          : connectionStatus === 'fallback_cache'
                            ? 'text-purple-500'
                            : connectionStatus === 'fallback_mock'
                              ? 'text-gray-500'
                              : 'text-red-500'
                  }`}
                >
                  {connectionStatus === 'connected' 
                    ? 'Live' 
                    : connectionStatus === 'connecting' 
                      ? 'Connecting...'
                      : connectionStatus === 'reconnecting'
                        ? 'Reconnecting...'
                        : connectionStatus === 'error'
                          ? 'Connection Error'
                        : connectionStatus === 'fallback_rest'
                          ? 'REST API Fallback'
                          : connectionStatus === 'fallback_cache'
                            ? 'Using Cached Data'
                            : connectionStatus === 'fallback_mock'
                              ? 'Using Mock Data'
                              : 'Disconnected'
                  }
                </span>
              </div>
            </div>
            <div className={`${isMobile ? 'mt-1' : ''} text-right`}>
              <span>
                Last update: {lastUpdated.toLocaleTimeString()}
                {connectionStatus === 'fallback_cache' && (
                  <span className="ml-1 text-yellow-400">
                    ({Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago)
                  </span>
                )}
              </span>
            </div>
          </div>
          
          {/* Performance metrics */}
          {connectionStatus === 'connected' && (
            <div className={`flex items-center justify-between ${isMobile ? 'mt-2 pt-2' : 'mt-1 pt-1'} border-t border-divider ${isMobile ? 'text-[10px]' : 'text-[8px]'}`}>
              <div className="flex items-center">
                <span className="text-blue-400 mr-1">{performanceMetrics.fps}</span>
                <span className="text-gray-500">FPS</span>
                <span className="mx-2">|</span>
                <span className="text-blue-400 mr-1">{performanceMetrics.updateCount}</span>
                <span className="text-gray-500">updates</span>
              </div>
              <div>
                <span className="text-gray-500 mr-1">Avg. update time:</span>
                <span className="text-blue-400">{performanceMetrics.averageUpdateTime.toFixed(2)}ms</span>
              </div>
            </div>
          )}
        </div>
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