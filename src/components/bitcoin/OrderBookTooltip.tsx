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

  // Check for mobile device and adjust position in the same effect
  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') {
      return;
    }
    
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint in Tailwind
      setIsMobile(mobile);
      
      // Calculate tooltip position
      if (isVisible && !mobile) {
        const tooltipWidth = 200; // Desktop width
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
        
        setPosition({ x: adjustedX, y: adjustedY });
      }
    };
    
    // Initial check and position
    checkMobile();
    
    // Set up listener for resize events
    window.addEventListener('resize', checkMobile);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, [isVisible, x, y]);

  if (!isVisible) return null;

  // Use a consistent dark theme
  const labelColor = type === 'ask' ? 'rgb(255, 90, 90)' : 'rgb(90, 200, 90)';
  const bgColor = '#292b30';
  const progressColor = type === 'ask' ? 'rgba(255, 60, 60, 0.5)' : 'rgba(60, 200, 60, 0.5)';

  return (
    <>
      {/* Invisible overlay to ensure tooltip is always on top */}
      <div 
        className="fixed inset-0 z-[9998] pointer-events-none"
        aria-hidden="true"
      />
      
      {/* Tooltip */}
      <div 
        className={`
          fixed z-[9999] text-white rounded-sm shadow-lg border border-gray-700 
          ${isMobile ? 'text-sm p-3 w-[250px]' : 'text-xs p-2 w-[200px]'}
          transition-opacity duration-150 ease-in-out animate-fadeIn
        `}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: bgColor,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)'
        }}
      >
      <div className="mb-2 pb-1 border-b border-gray-700 flex justify-between items-center">
        <span style={{ color: labelColor }}>
          {type === 'ask' ? 'Sell' : 'Buy'} @ ${price.toFixed(2)}
        </span>
        {isMobile && (
          <span className="text-xs bg-gray-800 px-1 py-0.5 rounded-sm" style={{ color: labelColor }}>
            {type === 'ask' ? 'ASK' : 'BID'}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-y-2">
        <div className="text-gray-400">Size:</div>
        <div className="text-right">{isMobile ? amount.toFixed(4) : amount.toFixed(4)} BTC</div>
        
        <div className="text-gray-400">Value:</div>
        <div className="text-right">${total.toFixed(2)} USD</div>
        
        <div className="text-gray-400">% of Book:</div>
        <div className="text-right">{percentage.toFixed(1)}%</div>
      </div>
      
      {/* Visual percentage indicator */}
      <div className="mt-3 mb-1">
        <div className="w-full h-2 bg-gray-900 rounded-sm overflow-hidden" style={{ backgroundColor: '#1e1f23' }}>
          <div 
            className="h-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: progressColor }}
          ></div>
        </div>
      </div>
    </div>
    </>
  );
}