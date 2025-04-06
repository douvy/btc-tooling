import { TimeFrame } from '@/types';
import TimeframeSelector from './TimeframeSelector';

interface MobilePriceDisplayProps {
  price: number;
  change: number;
  changePercent: number;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  isPositiveChange: boolean;
}

export default function MobilePriceDisplay({
  price, 
  change, 
  changePercent,
  timeframe,
  onTimeframeChange,
  isPositiveChange
}: MobilePriceDisplayProps) {
  return (
    <div className="md:hidden py-4 px-6">
      <div className="flex flex-col items-start">
        {/* Bottom row with timeframe selector */}
        <div className="flex justify-start pb-3">
          <div className="grid grid-cols-6 gap-0.5">
            <TimeframeSelector 
              timeframe={timeframe} 
              onTimeframeChange={onTimeframeChange} 
              variant="mobile" 
            />
          </div>
        </div>
        <div className="flex items-start justify-start" aria-live="polite">
          <span className="text-4xl font-fuji-bold text-white" aria-label="Bitcoin price">
            {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-start mt-1" aria-label="Price change">
          <span className={`${isPositiveChange ? 'text-success' : 'text-error'} flex items-center`}>
            <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
            <span className="mr-1.5">
              ${Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span>
              ({Math.abs(changePercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}