import { BitcoinPrice, TimeFrame } from '@/types';
import classNames from 'classnames';
import TimeframeSelector from './TimeframeSelector';
import { formatPrice } from '@/lib/priceUtils';
import { LatencyDisplay } from './LatencyDisplay';

interface DesktopPriceDisplayProps {
  data: BitcoinPrice;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  priceChangeDirection?: 'up' | 'down' | null;
  latency?: number;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

export default function DesktopPriceDisplay({
  data,
  timeframe,
  onTimeframeChange,
  priceChangeDirection = null,
  latency = 0,
  connectionStatus = 'connected'
}: DesktopPriceDisplayProps) {
  const isPositiveChange = data.direction === 'up';
  const formattedPrice = formatPrice(data.price);
  const formattedChange = formatPrice(data.change);
  const formattedPercent = data.changePercent.toFixed(2);
  
  return (
    <div className="flex items-center space-x-6">
      {/* Price Display */}
      <div className="flex items-center" aria-live="polite">
        {/* Latency indicator - hidden from UI but keeping for accessibility */}
        <div className="hidden">
          <LatencyDisplay 
            latency={latency} 
            connectionStatus={connectionStatus} 
          />
        </div>
        
        <span 
          className={classNames(
            "text-2xl lg:text-5xl font-fuji-bold flex items-center",
            { 
              "animate-pulse-green": priceChangeDirection === 'up',
              "animate-pulse-red": priceChangeDirection === 'down'
            }
          )}
          aria-label={`Bitcoin price ${formattedPrice} dollars`}
        >
          {formattedPrice}
        </span>
        <span className={`ml-3 text-xl ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
          <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
          <span className="mr-1.5 font-fuji-bold" aria-label={`Price change ${formattedChange} dollars`}>
            ${timeframe === '1D' && data.change < 0.01 ? '0.00' : formattedChange}
          </span>
          <span className="font-fuji-bold" aria-label={`Percentage change ${formattedPercent} percent`}>
            ({timeframe === '1D' && data.changePercent < 0.01 ? '0.00' : formattedPercent}%)
          </span>
        </span>
      </div>
      
      {/* Timeframe selector */}
      <TimeframeSelector timeframe={timeframe} onTimeframeChange={onTimeframeChange} />
    </div>
  );
}