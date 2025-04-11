import React from 'react';

interface OrderBookTooltipProps {
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

/**
 * Tooltip component for displaying detailed information when hovering over order book entries
 */
export default function OrderBookTooltip({
  isVisible,
  x,
  y,
  type,
  price,
  amount,
  total,
  sum,
  totalSum,
  percentage
}: OrderBookTooltipProps) {
  if (!isVisible) return null;

  // Adjust position to prevent tooltip from going off-screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 150);

  // Color theme based on order type (bid/ask)
  const color = type === 'ask' ? 'rgb(255, 90, 90)' : 'rgb(90, 200, 90)';
  const bgColor = type === 'ask' ? 'rgba(255, 60, 60, 0.1)' : 'rgba(60, 200, 60, 0.1)';

  return (
    <div 
      className="fixed z-50 bg-gray-900 text-white text-xs rounded-sm shadow-lg border border-divider p-2 w-[200px]"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 0 0 1px ${color}`,
        background: `linear-gradient(to right, ${bgColor}, transparent)`
      }}
    >
      <div className="mb-2 pb-1 border-b border-divider">
        <span style={{ color }}>
          {type === 'ask' ? 'Sell' : 'Buy'} @ ${price.toFixed(2)}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-y-1">
        <div className="text-gray-400">Size:</div>
        <div className="text-right">{amount.toFixed(8)} BTC</div>
        
        <div className="text-gray-400">Value:</div>
        <div className="text-right">${total.toFixed(2)} USD</div>
        
        <div className="text-gray-400">Cumulative:</div>
        <div className="text-right">{sum.toFixed(8)} BTC</div>
        
        <div className="text-gray-400">% of Book:</div>
        <div className="text-right">{percentage.toFixed(2)}%</div>
      </div>
      
      <div className="mt-2 pt-1 border-t border-divider text-gray-400 text-center text-[9px]">
        Hover to explore the order book
      </div>
    </div>
  );
}