import { 
  useState, 
  useEffect, 
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent
} from 'react';

// Tooltip data interface for hover state
export interface TooltipData {
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
 * Custom hook to manage OrderBook interactions including tooltips, 
 * hover states, and touch events
 */
export function useOrderBookInteractions() {
  // Mobile detection state
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileOrderCount, setMobileOrderCount] = useState<number>(8); // Default fewer orders on mobile
  
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
    
    // Get element position for tooltip positioning
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Show the tooltip with touch-optimized positioning
    showTooltip(rect, type, price, amount, total, sum, totalSum, rowId, true);
    
    // Auto-clear highlight after a delay
    setTimeout(() => {
      setHoveredRowId(null);
      setTooltipData(prev => ({ ...prev, isVisible: false }));
    }, 3000); // Longer duration for mobile to allow reading
  };
  
  // Hide tooltip on mouse leave
  const handleOrderRowMouseLeave = () => {
    // Only respond to mouse leave on desktop
    if (!isMobile) {
      setTooltipData(prev => ({ ...prev, isVisible: false }));
      setHoveredRowId(null);
    }
  };

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

  return {
    isMobile,
    mobileOrderCount,
    tooltipData,
    hoveredRowId,
    handleOrderRowMouseEnter,
    handleOrderRowTouch,
    handleOrderRowMouseLeave
  };
}