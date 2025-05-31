import Image from 'next/image';

interface OrderBookHeaderProps {
  isMobile: boolean;
  viewMode: 'sum' | 'total';
}

/**
 * Component for the order book header including title, exchange info, and column labels
 */
export function OrderBookHeader({ isMobile, viewMode }: OrderBookHeaderProps) {
  return (
    <>
      <div className="flex justify-between items-center w-full mt-6 sm:mt-4">
        <h2 id="halving-title" className="text-xl font-fuji-bold">
          Order Book
        </h2>
        
        {/* Exchange indicator with logo */}
        <div className="text-right text-sm text-light-gray flex items-center">
          <div className="w-6 h-6 mr-2 overflow-hidden rounded-sm">
            <Image 
              src="/images/bitfinex.jpg" 
              alt="Bitfinex logo" 
              width={24} 
              height={24}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-fuji-bold text-lg -ml-2">Bitfinex</span>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-18 text-xs py-2 px-1 border-b border-divider mt-6">
        <div className="col-span-1"></div> {/* Bar column */}
        <div className="col-span-5 text-center text-muted">
          {isMobile ? 'Amt' : 'Amount'} {!isMobile && '(BTC)'}
        </div>
        <div className="col-span-6 text-center text-muted">
          Price (USD)
        </div>
        <div className="col-span-6 text-center text-muted">
          {viewMode === 'sum' 
            ? (isMobile ? 'Sum' : 'Sum (BTC)') 
            : (isMobile ? 'Total' : 'Total (USD)')}
        </div>
      </div>
    </>
  );
}