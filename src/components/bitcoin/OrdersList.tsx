import { 
  MouseEvent as ReactMouseEvent, 
  TouchEvent as ReactTouchEvent 
} from 'react';
import { OrderBookEntry } from '@/types';

interface OrdersListProps {
  orders: OrderBookEntry[];
  type: 'ask' | 'bid';
  maxVolume: number;
  viewMode: 'sum' | 'total'; 
  selectedAmount: number;
  isMobile: boolean;
  mobileOrderCount: number;
  hoveredRowId: string | null;
  animatingOrders: Record<number, boolean>;
  onMouseEnter: (
    e: ReactMouseEvent,
    type: 'ask' | 'bid',
    price: number,
    amount: number,
    total: number,
    sum: number,
    totalSum: number,
    rowId: string
  ) => void;
  onMouseLeave: () => void;
  onTouchStart: (
    e: ReactTouchEvent,
    type: 'ask' | 'bid',
    price: number,
    amount: number,
    total: number,
    sum: number,
    totalSum: number,
    rowId: string
  ) => void;
}

/**
 * Component for rendering order book rows for either asks or bids
 */
export function OrdersList({
  orders,
  type,
  maxVolume,
  viewMode,
  selectedAmount,
  isMobile,
  mobileOrderCount,
  hoveredRowId,
  animatingOrders,
  onMouseEnter,
  onMouseLeave,
  onTouchStart
}: OrdersListProps) {
  // Animation classes based on type (ask = red, bid = green)
  const animationClass = type === 'ask' 
    ? 'animate-orderbook-flash-red' 
    : 'animate-orderbook-flash-green';
  const priceAnimationClass = type === 'ask'
    ? 'animate-price-flicker-red'
    : 'animate-price-flicker-green';
    
  // Get total sum for percentage calculations
  const totalSum = orders.length > 0 ? orders[orders.length - 1].sum : 0;
  
  // Only show the number of orders appropriate for the device
  const displayOrders = orders.slice(0, isMobile ? mobileOrderCount : orders.length);

  return (
    <div className={`overflow-y-auto ${isMobile ? 'max-h-[120px]' : 'max-h-[150px]'}`}>
      {displayOrders.map((order, index) => {
        const volumePercentage = (order.amount / maxVolume) * 100;
        const isHighlighted = selectedAmount <= order.amount;
        const isInOrderRange = index <= 4; // Top 5 orders get special highlight
        
        // Calculate depth percentage for visualization
        const sumPercentage = Math.min((order.sum / totalSum) * 100, 100);
        
        // Generate a unique row ID
        const rowId = `${type}-${index}`;
        
        return (
          <div 
            key={rowId} 
            className={`grid grid-cols-18 text-xs ${isMobile ? 'py-2' : 'py-1'} relative transition-colors order-row
              ${isHighlighted ? 'bg-transparent' : ''}
              ${isInOrderRange && isHighlighted ? (type === 'ask' ? 'border-l-2 border-error' : 'border-l-2 border-success') : ''}
              ${hoveredRowId === rowId ? 'bg-black bg-opacity-50 shadow-md' : 'hover:bg-black hover:bg-opacity-30'}
              ${isMobile ? 'cursor-pointer active:bg-gray-700' : ''}
              ${animatingOrders[order.price] ? animationClass : ''}
            `}
            onMouseEnter={(e) => onMouseEnter(
              e, 
              type, 
              order.price, 
              order.amount, 
              order.price * order.amount, 
              order.sum, 
              totalSum,
              rowId
            )}
            onMouseLeave={onMouseLeave}
            onTouchStart={(e) => onTouchStart(
              e,
              type,
              order.price,
              order.amount,
              order.price * order.amount,
              order.sum,
              totalSum,
              rowId
            )}
          >
            {/* Bar column */}
            <div className="col-span-1 h-full flex items-center">
              <div 
                className={`h-3/5 ${
                  type === 'ask'
                    ? isInOrderRange && isHighlighted ? 'bg-error opacity-70' : 'bg-error opacity-50'
                    : isInOrderRange && isHighlighted ? 'bg-success opacity-70' : 'bg-success opacity-50'
                } transition-all duration-200 ${
                  animatingOrders[order.price] ? 'animate-pulse' : ''
                }`}
                style={{ width: `${volumePercentage}%` }}
              ></div>
            </div>
            
            {/* Amount column */}
            <div className="col-span-5 text-center text-gray-300">
              <span className={animatingOrders[order.price] ? 'font-bold text-white transition-colors duration-150' : 'transition-colors duration-150'}>
                {isMobile ? order.amount.toFixed(4) : order.amount.toFixed(8)}
              </span>
            </div>
            
            {/* Price column */}
            <div className={`col-span-6 text-center transition-all duration-200 ${
              type === 'ask'
                ? isInOrderRange && isHighlighted 
                  ? 'text-error font-bold' 
                  : animatingOrders[order.price]
                    ? `${priceAnimationClass} font-bold` 
                    : 'text-error'
                : isInOrderRange && isHighlighted 
                  ? 'text-success font-bold' 
                  : animatingOrders[order.price]
                    ? `${priceAnimationClass} font-bold` 
                    : 'text-success'
            }`}>
              {order.price.toFixed(2)}
              {!isMobile && isInOrderRange && isHighlighted && selectedAmount >= order.amount * 0.8 && (
                <span className="ml-1 text-xs">${(order.price * order.amount).toFixed(2)}</span>
              )}
            </div>
            
            {/* Sum/Total column with depth indicator */}
            <div className="col-span-6 text-center text-gray-300 relative">
              {viewMode === 'sum' ? (
                <>
                  <span className={hoveredRowId === rowId ? 'font-bold text-white' : ''}>
                    {isMobile ? order.sum.toFixed(2) : order.sum.toFixed(4)}
                  </span>
                  <div 
                    className={`absolute top-0 right-0 h-full ${
                      type === 'ask'
                        ? hoveredRowId === rowId ? 'bg-error opacity-30' : 'bg-error opacity-10'
                        : hoveredRowId === rowId ? 'bg-success opacity-30' : 'bg-success opacity-10'
                    }`}
                    style={{ width: `${sumPercentage}%` }}
                  ></div>
                </>
              ) : (
                <span className={hoveredRowId === rowId ? 'font-bold text-white' : ''}>
                  ${isMobile ? Math.round(order.price * order.amount) : (order.price * order.amount).toFixed(2)}
                </span>
              )}
              
              {/* Visual percentage indicator on hover */}
              {hoveredRowId === rowId && (
                <div className={`absolute top-0 left-2 text-[10px] ${type === 'ask' ? 'text-error' : 'text-success'}`}>
                  {(order.sum / totalSum * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}