import React, { useState, useEffect } from 'react';

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
 * With mobile optimization enhancements
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
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [position, setPosition] = useState({ x, y });

  // Check for mobile device
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') {
      return;
    }
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint in Tailwind
      setIsMobile(mobile);
    };
    
    // Initial check
    checkMobile();
    
    // Set up listener for resize events
    window.addEventListener('resize', checkMobile);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Adjust position when props change
  useEffect(() => {
    if (!isVisible) return;
    
    // Only run on client
    if (typeof window === 'undefined') {
      return;
    }
    
    const tooltipWidth = isMobile ? 250 : 200;
    const tooltipHeight = 180;
    
    // Calculate adjusted position based on screen boundaries
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust X position: prefer right side but flip to left if needed
    let adjustedX = x;
    if (x + tooltipWidth > viewportWidth - 10) {
      // Not enough space on right, try left
      adjustedX = Math.max(10, x - tooltipWidth - 10); // 10px from edge
    }
    
    // Adjust Y position: prefer below but flip to above if needed
    let adjustedY = y;
    if (y + tooltipHeight > viewportHeight - 10) {
      // Not enough space below, try above
      adjustedY = Math.max(10, y - tooltipHeight - 10); // 10px from edge
    }
    
    // On very small screens, or if still doesn't fit, center in viewport
    if (isMobile && (adjustedX < 20 || adjustedX + tooltipWidth > viewportWidth - 20)) {
      adjustedX = Math.max(10, (viewportWidth - tooltipWidth) / 2);
    }
    
    setPosition({ x: adjustedX, y: adjustedY });
  }, [isVisible, x, y, isMobile]);

  if (!isVisible) return null;

  // Color theme based on order type (bid/ask)
  const color = type === 'ask' ? 'rgb(255, 90, 90)' : 'rgb(90, 200, 90)';
  const bgColor = type === 'ask' ? 'rgba(255, 60, 60, 0.1)' : 'rgba(60, 200, 60, 0.1)';
  const progressBgColor = type === 'ask' ? 'rgba(255, 60, 60, 0.2)' : 'rgba(60, 200, 60, 0.2)';
  const progressColor = type === 'ask' ? 'rgba(255, 60, 60, 0.5)' : 'rgba(60, 200, 60, 0.5)';

  return (
    <div 
      className={`
        fixed z-50 bg-gray-900 text-white rounded-sm shadow-lg border border-divider 
        ${isMobile ? 'text-sm p-3 w-[250px]' : 'text-xs p-2 w-[200px]'}
        transition-opacity duration-150 ease-in-out animate-fadeIn
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 0 0 1px ${color}`,
        background: `linear-gradient(to right, ${bgColor}, transparent)`
      }}
    >
      <div className="mb-2 pb-1 border-b border-divider flex justify-between items-center">
        <span style={{ color }}>
          {type === 'ask' ? 'Sell' : 'Buy'} @ ${price.toFixed(2)}
        </span>
        {isMobile && (
          <span className="text-xs bg-gray-800 px-1 py-0.5 rounded-sm" style={{ color }}>
            {type === 'ask' ? 'ASK' : 'BID'}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-y-2">
        <div className="text-gray-400">Size:</div>
        <div className="text-right">{isMobile ? amount.toFixed(4) : amount.toFixed(8)} BTC</div>
        
        <div className="text-gray-400">Value:</div>
        <div className="text-right">${total.toFixed(2)} USD</div>
        
        <div className="text-gray-400">Cumulative:</div>
        <div className="text-right">{isMobile ? sum.toFixed(4) : sum.toFixed(8)} BTC</div>
        
        <div className="text-gray-400">% of Book:</div>
        <div className="text-right">{percentage.toFixed(2)}%</div>
      </div>
      
      {/* Visual percentage indicator */}
      <div className="mt-3 mb-1">
        <div className="w-full h-2 bg-gray-800 rounded-sm overflow-hidden">
          <div 
            className="h-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: progressColor }}
          ></div>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400">
          <span>0%</span>
          <span>{Math.round(percentage)}%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="mt-2 pt-1 border-t border-divider text-gray-400 text-center text-[9px]">
        {isMobile ? 'Tap to place orders at this price' : 'Hover to explore the order book'}
      </div>
    </div>
  );
}