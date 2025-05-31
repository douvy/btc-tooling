import { TimeFrame } from '@/types';
import { useEffect, useRef, useState } from 'react';

interface TradingViewIframeProps {
  timeframe: TimeFrame;
  onLoaded: () => void;
}

// Mapping our app timeframes to TradingView intervals for the iframe widget
const timeframeMap: Record<TimeFrame, string> = {
  '1H': '60',
  '1D': '1D',
  '1W': '1W',
  '1M': '1M',
  '1Y': '12M',
  'ALL': 'all'
};

export default function TradingViewIframe({ timeframe, onLoaded }: TradingViewIframeProps) {
  // Use a ref to store the iframe element
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  
  // Store the initial source URL
  const [initialSrc] = useState(
    `https://www.tradingview.com/widgetembed/?interval=${timeframeMap['1D']}&symbol=BITFINEX%3ABTCUSD&theme=dark&style=1&locale=en&enable_publishing=false&allow_symbol_change=false&hide_side_toolbar=false&save_image=false&studies=%5B%5D&backgroundColor=rgba(10%2C11%2C13%2C1)&gridColor=rgba(51%2C51%2C51%2C0.4)&upColor=%234CAF50&downColor=%23F44336&borderUpColor=%234CAF50&borderDownColor=%23F44336&wickUpColor=%234CAF50&wickDownColor=%23F44336&paneProperties.background=rgba(10%2C11%2C13%2C1)&scalesProperties.backgroundColor=rgba(10%2C11%2C13%2C1)`
  );
  
  // Notify parent immediately on mount without any delay
  useEffect(() => {
    // Call onLoaded immediately to avoid any flickering or disappearing
    onLoaded();
  }, [onLoaded]);
  
  // Handle timeframe changes without refreshing the iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    
    try {
      // Instead of changing the src, we'll try to use postMessage to communicate with TradingView
      // This is a safer approach that doesn't reload the iframe
      iframe.contentWindow.postMessage({
        name: 'set-timeframe',
        timeframe: timeframeMap[timeframe]
      }, '*');
      
      // Message sent to iframe (removed debugging log)
    } catch (error) {
      // Silently handle iframe communication errors
    }
  }, [timeframe]);
  
  return (
    <div className="w-full h-full main-dark">
      {/* Keep a static src to prevent refreshing */}
      <iframe
        ref={iframeRef}
        src={initialSrc}
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#0a0b0d',
        }}
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        title="TradingView BTC/USD Chart"
      />
    </div>
  );
}