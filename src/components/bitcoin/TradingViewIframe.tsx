import { TimeFrame } from '@/types';
import { useEffect } from 'react';

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
  // Notify parent immediately on mount without any delay
  useEffect(() => {
    // Call onLoaded immediately to avoid any flickering or disappearing
    onLoaded();
  }, [onLoaded]);
  
  return (
    <div className="w-full h-full">
      {/* Use the simpler Advanced Chart widget which is more reliable */}
      <iframe
        src={`https://www.tradingview.com/widgetembed/?interval=${timeframeMap[timeframe]}&symbol=BITFINEX%3ABTCUSD&theme=dark&style=1&locale=en&enable_publishing=false&allow_symbol_change=false&hide_side_toolbar=false&save_image=false&studies=%5B%5D`}
        style={{ width: '100%', height: '100%' }}
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        title="TradingView BTC/USD Chart"
      />
    </div>
  );
}