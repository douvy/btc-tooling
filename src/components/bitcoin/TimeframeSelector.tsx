import { TimeFrame } from '@/types';
import classNames from 'classnames';

interface TimeframeSelectorProps {
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  variant?: 'default' | 'medium' | 'mobile';
  sizeSmaller?: boolean;
}

export default function TimeframeSelector({
  timeframe,
  onTimeframeChange,
  variant = 'default',
  sizeSmaller = false
}: TimeframeSelectorProps) {
  const timeframes: TimeFrame[] = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];
  
  // Different styles based on responsive variant
  const getButtonClasses = (tf: TimeFrame) => {
    const isActive = timeframe === tf;
    
    // Base classes for all variants
    const baseClasses = classNames(
      'font-medium uppercase focus:outline-none focus:ring-2 focus:ring-primary',
      { 'text-gray-400 hover:text-gray-200': !isActive }
    );
    
    // Desktop variant (default)
    if (variant === 'default') {
      return classNames(baseClasses, 'px-4 py-2 text-sm', {
        'bg-dark-navy text-primary rounded-sm': isActive,
      });
    }
    
    // Medium screens variant
    if (variant === 'medium') {
      return classNames(baseClasses, 'px-3 py-1.5 text-sm', {
        'bg-dark-blue text-btc-alt': isActive,
      });
    }
    
    // Mobile variant with increased spacing and font size
    if (sizeSmaller) {
      // Increased padding and font size for mobile
      return classNames(baseClasses, 'px-3.5 py-1.5 text-sm', {
        'bg-dark-blue text-btc-alt': isActive,
      });
    } else {
      return classNames(baseClasses, 'px-3 py-2 text-sm', {
        'bg-dark-blue text-btc-alt': isActive,
      });
    }
  };
  
  return (
    <div className={`flex items-center ${variant === 'mobile' && sizeSmaller ? 'gap-x-1.5' : ''}`} role="group" aria-label="Time frame selection">
      {timeframes.map((tf) => (
        <button
          key={tf}
          className={getButtonClasses(tf)}
          onClick={() => onTimeframeChange(tf)}
          aria-label={`${tf} view`}
          aria-current={timeframe === tf ? 'page' : undefined}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}