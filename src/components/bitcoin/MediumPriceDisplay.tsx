import { BitcoinPrice, TimeFrame } from '@/types';
import classNames from 'classnames';
import TimeframeSelector from './TimeframeSelector';
import { formatPrice } from '@/lib/priceUtils';
import { LatencyDisplay } from './LatencyDisplay';

interface MediumPriceDisplayProps {
  data: BitcoinPrice;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  priceChangeDirection?: 'up' | 'down' | null;
  latency?: number;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

export default function MediumPriceDisplay({
  data,
  timeframe,
  onTimeframeChange,
  priceChangeDirection = null,
  latency = 0,
  connectionStatus = 'connected'
}: MediumPriceDisplayProps) {
  const isPositiveChange = data.direction === 'up';
  const formattedPrice = formatPrice(data.price);
  const formattedPercent = data.changePercent.toFixed(2);
  
  return (
    <div className="flex flex-col">
      {/* Top row with price */}
      <div className="flex items-center justify-between">
        {/* Price display */}
        <div className="flex items-center" aria-live="polite">
          {/* Small latency indicator for medium display - hidden */}
          <div className="hidden">
            <LatencyDisplay 
              latency={latency} 
              connectionStatus={connectionStatus} 
            />
          </div>

          <span 
            className={classNames(
              "text-2xl font-fuji-bold flex items-center",
              { 
                "animate-pulse-green": priceChangeDirection === 'up',
                "animate-pulse-red": priceChangeDirection === 'down',
                "text-primary": true
              }
            )}
            aria-label={`Bitcoin price ${formattedPrice} dollars`}
          >
            {formattedPrice}
          </span>
          <span className={`ml-2 ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
            <i className={`fa-regular fa-arrow-${isPositiveChange ? 'up-right' : 'down-right'} ml-1 mr-0.5`} aria-hidden="true"></i>
            <span aria-label={`Percentage change ${formattedPercent} percent`}>
              ({timeframe === '1D' && data.changePercent < 0.01 ? '0.00' : formattedPercent}%)
            </span>
          </span>
        </div>
      </div>
      
      {/* Timeframe selector on second row */}
      <div className="flex justify-center pb-3">
        <TimeframeSelector timeframe={timeframe} onTimeframeChange={onTimeframeChange} variant="medium" />
      </div>
    </div>
  );
}