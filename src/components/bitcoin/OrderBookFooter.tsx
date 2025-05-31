interface OrderBookFooterProps {
  amount: string;
  currentPrice: number;
  spread: number;
  bestAsk?: number;
  bestBid?: number;
  connectionStatus: string;
  isMobile: boolean;
}

/**
 * Component for displaying the order book footer with amount summary and stats
 */
export function OrderBookFooter({
  amount,
  currentPrice,
  spread,
  bestAsk,
  bestBid,
  connectionStatus,
  isMobile
}: OrderBookFooterProps) {
  // Calculate the USD value of the selected BTC amount
  const amountValue = parseFloat(amount) * currentPrice;
  
  // Calculate spread percentage
  const spreadPercentage = ((spread / currentPrice) * 100);
  
  return (
    <div className="mt-3 text-xs border-t border-divider pt-3">
      {/* Desktop layout */}
      {!isMobile && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="mr-1 text-dark-grayish-blue">Amount:</span>
              <span className="font-bold text-white">{amount} BTC</span>
            </div>
            <div className="flex items-center">
              <span className="mr-1 text-dark-grayish-blue">Value:</span>
              <span className="font-bold text-white">${amountValue.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <span className="mr-1 text-dark-grayish-blue">Best Ask:</span>
              <span className="font-bold text-error">${bestAsk?.toFixed(2) || '--'}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-1 text-dark-grayish-blue">Best Bid:</span>
              <span className="font-bold text-success">${bestBid?.toFixed(2) || '--'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <span className="mr-1 text-dark-grayish-blue">Spread:</span>
              <span className="font-bold tex-white">${spread.toFixed(2)} ({spreadPercentage.toFixed(3)}%)</span>
            </div>
            <div className="flex items-center">
              {connectionStatus === 'connected' && (
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-1 bg-success" />
                  <span className="text-muted">Live</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Mobile layout - More compact with grid */}
      {isMobile && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
            <span className="text-dark-grayish-blue text-[10px]">Amount</span>
            <span className="font-bold text-white">{amount} BTC</span>
            <span className="text-muted text-[10px]">${amountValue.toFixed(2)}</span>
          </div>
          
          <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
            <span className="text-dark-grayish-blue text-[10px]">Spread</span>
            <span className="font-bold text-white">${spread.toFixed(2)}</span>
            <span className="text-muted text-[10px]">({spreadPercentage.toFixed(2)}%)</span>
          </div>
          
          <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
            <span className="text-dark-grayish-blue text-[10px]">Best Ask</span>
            <span className="font-bold text-error">${bestAsk?.toFixed(2) || '--'}</span>
          </div>
          
          <div className="bg-transparent p-2 rounded-sm flex flex-col items-start">
            <span className="text-dark-grayish-blue text-[10px]">Best Bid</span>
            <span className="font-bold text-success">${bestBid?.toFixed(2) || '--'}</span>
          </div>
        </div>
      )}
      
      {/* Show connection error if there is one */}
      {(connectionStatus === 'fallback_rest' || 
        connectionStatus === 'fallback_cache' || 
        connectionStatus === 'error') && (
        <div className="mt-3 pt-2 border-t border-divider flex items-center justify-center text-[10px]">
          <span className="px-1 py-0.5 bg-gray-700 text-dark-grayish-blue rounded-sm">
            {connectionStatus === 'error' ? 'CONNECTION ERROR' : 'FALLBACK DATA'}
          </span>
        </div>
      )}
    </div>
  );
}