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
    <div className="flex flex-col w-full">
      {/* Price display row */}
      <div className="flex justify-between items-center mb-2" aria-live="polite">
        <div className="flex flex-col">
          <div className="hidden">
            <LatencyDisplay 
              latency={latency} 
              connectionStatus={connectionStatus} 
            />
          </div>
          
          {/* Price on top row */}
          <span 
            className={classNames(
              "text-5xl font-fuji-bold",
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
          
          {/* Change values on second row */}
          <div className="mt-1">
            <span className={`text-xl ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center`}>
              <i className={`fa-regular fa-arrow-${isPositiveChange ? 'up-right' : 'down-right'} mr-2`} aria-hidden="true"></i>
              <span className="mr-1.5 font-fuji-bold" aria-label={`Price change ${formattedChange} dollars`}>
                {formattedChange}
              </span>
              <span className="font-fuji-bold" aria-label={`Percentage change ${formattedPercent} percent`}>
                ({formattedPercent}%)
              </span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Timeframe selector row with smaller text */}
      <div className="flex justify-start mt-2">
        <TimeframeSelector 
          timeframe={timeframe} 
          onTimeframeChange={onTimeframeChange} 
          variant="mobile" 
          sizeSmaller={true}
        />
      </div>
    </div>
  );
}