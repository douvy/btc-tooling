import { BitcoinPrice, TimeFrame } from '@/types';
import classNames from 'classnames';
import TimeframeSelector from './TimeframeSelector';
import { formatPrice } from '@/lib/priceUtils';
import { LatencyDisplay } from './LatencyDisplay';

interface MobilePriceDisplayProps {
  data: BitcoinPrice;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  priceChangeDirection?: 'up' | 'down' | null;
  latency?: number;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

export default function MobilePriceDisplay({
  data,
  timeframe,
  onTimeframeChange,
  priceChangeDirection = null,
  latency = 0,
  connectionStatus = 'connected'
}: MobilePriceDisplayProps) {
  const isPositiveChange = data.direction === 'up';
  const formattedPrice = formatPrice(data.price);
  const formattedChange = formatPrice(data.change);
  const formattedPercent = data.changePercent.toFixed(2);
  
  return (
    <div className="flex flex-col items-start">
      {/* Timeframe selector row */}
      <div className="flex justify-start pb-3">
        <TimeframeSelector 
          timeframe={timeframe} 
          onTimeframeChange={onTimeframeChange} 
          variant="mobile" 
        />
      </div>
      
      {/* Price row with latency indicator for mobile - hidden */}
      <div className="flex items-center justify-start" aria-live="polite">
        <div className="hidden">
          <LatencyDisplay 
            latency={latency} 
            connectionStatus={connectionStatus} 
          />
        </div>
        
        <span 
          className={classNames(
            "text-4xl font-fuji-bold",
            { 
              "animate-pulse-green": priceChangeDirection === 'up',
              "animate-pulse-red": priceChangeDirection === 'down',
              "text-white": !priceChangeDirection
            }
          )}
          aria-label={`Bitcoin price ${formattedPrice} dollars`}
        >
          {formattedPrice}
        </span>
      </div>
      
      {/* Change row */}
      <div className="flex items-start mt-1" aria-label="Price change">
        <span className={`${isPositiveChange ? 'text-success' : 'text-error'} flex items-center`}>
          <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
          <span className="mr-1.5">
            ${timeframe === '1D' && data.change < 0.01 ? '0.00' : formattedChange}
          </span>
          <span>
            ({timeframe === '1D' && data.changePercent < 0.01 ? '0.00' : formattedPercent}%)
          </span>
        </span>
      </div>
    </div>
  );
}