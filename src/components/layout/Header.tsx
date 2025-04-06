import { TimeFrame } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import TimeframeSelector from '../bitcoin/TimeframeSelector';

interface HeaderProps {
  price: number;
  change: number;
  changePercent: number;
  timeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  isPositiveChange: boolean;
}

export default function Header({
  price,
  change,
  changePercent,
  timeframe,
  onTimeframeChange,
  isPositiveChange,
}: HeaderProps) {
  return (
    <header className="w-full border-b border-divider main-dark lg:sticky lg:top-0 z-20 backdrop-blur-md bg-main-dark bg-opacity-90" role="banner">
      {/* Desktop layout (lg and up) */}
      <div className="hidden lg:flex items-center px-6 h-[80px]">
        {/* Left side with logo and title */}
        <div className="flex items-center flex-shrink-0">
          <Link href="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
              <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
            </div>
          </Link>
        </div>
        
        {/* Spacer */}
        <div className="flex-grow"></div>
        
        {/* Right side - Price Display next to Timeframe selector */}
        <div className="flex items-center space-x-6">
          {/* Bitcoin Price Display */}
          <div className="flex items-center" aria-live="polite">
            <span className="text-2xl lg:text-5xl font-fuji-bold text-white flex items-center">
              <span aria-label="Bitcoin price">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </span>
            <span className={`ml-3 text-xl ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
              <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} mr-2`} aria-hidden="true"></i>
              <span className="mr-1.5 font-fuji-bold" aria-label="Price change">${Math.abs(change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="font-fuji-bold" aria-label="Percentage change">({Math.abs(changePercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)</span>
            </span>
          </div>
          
          {/* Timeframe selector */}
          <TimeframeSelector timeframe={timeframe} onTimeframeChange={onTimeframeChange} />
        </div>
      </div>
      
      {/* Medium layout (md to lg) */}
      <div className="hidden md:block lg:hidden px-6">
        {/* Top row with logo and price */}
        <div className="flex items-center justify-between h-[72px]">
          <div className="flex items-center">
            <Link href="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
              </div>
              <h1 className="text-xl font-fuji-bold">BTC Tooling</h1>
            </Link>
          </div>
          
          {/* Price display */}
          <div className="flex items-center" aria-live="polite">
            <span className="text-2xl font-fuji-bold text-primary flex items-center">
              {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`ml-2 ${isPositiveChange ? 'text-success' : 'text-error'} flex items-center self-center`}>
              <i className={`fa-solid fa-arrow-${isPositiveChange ? 'up' : 'down'} ml-1 mr-0.5`} aria-hidden="true"></i>
              <span>({Math.abs(changePercent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)</span>
            </span>
          </div>
        </div>
        
        {/* Timeframe selector on second row (only for medium screens) */}
        <div className="flex justify-center pb-3">
          <TimeframeSelector timeframe={timeframe} onTimeframeChange={onTimeframeChange} variant="medium" />
        </div>
      </div>
      
      {/* Mobile layout (sm and below) */}
      <div className="md:hidden px-6">
        {/* Top row */}
        <div className="flex items-center h-[72px]">
          <div className="flex items-center">
            <Link href="/" className="flex items-center focus:outline-none focus:ring-2 focus:ring-primary rounded-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
              </div>
              <h1 className="text-xl font-fuji-bold">BTC Tooling</h1>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}