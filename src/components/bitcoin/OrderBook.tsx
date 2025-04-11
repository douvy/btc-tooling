import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { OrderBook as OrderBookType, OrderBookEntry } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';

interface OrderBookProps {
  orderBook?: OrderBookType;
  currentPrice: number;
  priceChange: number;
}

// Preset amount options in BTC
const AMOUNT_PRESETS = [
  { label: '0.01', value: '0.01' },
  { label: '0.05', value: '0.05' },
  { label: '0.1', value: '0.1' },
  { label: '0.25', value: '0.25' },
  { label: '0.5', value: '0.5' },
  { label: '1', value: '1' },
];

export default function OrderBook({ orderBook, currentPrice, priceChange }: OrderBookProps) {
  const [amount, setAmount] = useState("0.05");
  const [localOrderBook, setLocalOrderBook] = useState<OrderBookType | null>(null);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('sell');
  const [viewMode, setViewMode] = useState<'sum' | 'detailed'>('sum');
  const presetsRef = useRef<HTMLDivElement>(null);
  
  // Use provided orderBook or fetch mock data
  useEffect(() => {
    if (orderBook) {
      setLocalOrderBook(orderBook);
    } else {
      setLocalOrderBook(getMockOrderBook());
    }
  }, [orderBook]);
  
  // Handle click outside to close presets dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle amount increment/decrement
  const decrementAmount = () => {
    setIsCustomAmount(true);
    
    const currentAmount = parseFloat(amount);
    const step = currentAmount <= 0.1 ? 0.01 : 0.05;
    
    if (currentAmount > step) {
      setAmount((currentAmount - step).toFixed(currentAmount <= 0.1 ? 2 : 2));
    }
  };
  
  const incrementAmount = () => {
    setIsCustomAmount(true);
    
    const currentAmount = parseFloat(amount);
    const step = currentAmount < 0.1 ? 0.01 : 0.05;
    
    setAmount((currentAmount + step).toFixed(currentAmount < 0.1 ? 2 : 2));
  };
  
  // Handle amount input change
  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsCustomAmount(true);
    
    // Only allow valid numbers with up to 8 decimal places
    const value = e.target.value;
    if (/^\d*\.?\d{0,8}$/.test(value) || value === '') {
      setAmount(value);
    }
  };
  
  // Handle preset selection
  const selectPreset = (preset: string) => {
    setAmount(preset);
    setIsCustomAmount(false);
    setShowPresets(false);
  };
  
  // Handle entering a custom amount
  const handleBlur = () => {
    // Validate and format amount on blur
    if (amount === '' || isNaN(parseFloat(amount))) {
      setAmount('0.01');
    } else {
      // Ensure minimum amount of 0.001 BTC
      const numAmount = parseFloat(amount);
      if (numAmount < 0.001) {
        setAmount('0.001');
      } else {
        // Format with appropriate precision
        setAmount(numAmount.toFixed(numAmount < 0.1 ? 3 : 2));
      }
    }
  };
  
  // If data isn't loaded yet, show loading state
  if (!localOrderBook) {
    return (
      <div className="text-white w-full font-sans animate-pulse p-4">
        <h2 className="text-xl font-fuji-bold flex items-center">Order Book</h2>
        <div className="h-64 bg-gray-800 rounded mt-4"></div>
      </div>
    );
  }
  
  const { asks, bids, spread } = localOrderBook;
  
  // Calculate the maximum volume for sizing the depth bars
  const maxVolume = Math.max(
    ...asks.map(ask => ask.amount),
    ...bids.map(bid => bid.amount)
  );

  return (
    <div className="text-white w-full font-sans">
      <h2 id="halving-title" className="text-xl font-fuji-bold flex items-center">
        Order Book
      </h2>

      {/* Enhanced Amount Control */}
      <div className="flex items-center my-3 gap-1">
        {/* Minus button */}
        <div className="w-8 h-8 border border-divider rounded-sm hover:bg-gray-700 transition-colors">
          <button 
            className="w-full h-full flex items-center justify-center text-lg text-white"
            onClick={decrementAmount}
            aria-label="Decrease amount"
          >−</button>
        </div>
        
        {/* Amount input with dropdown */}
        <div className="relative">
          <div 
            className="w-[210px] h-8 border border-divider flex items-center rounded-sm ml-1 mr-1 cursor-pointer"
            onClick={() => setShowPresets(!showPresets)}
          >
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              onBlur={handleBlur}
              className="w-full h-full bg-transparent text-sm text-white text-center outline-none"
              aria-label="Amount in BTC"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="absolute right-3 text-sm text-white">BTC</span>
            <button 
              className="absolute right-10 text-xs text-gray-400"
              onClick={(e) => {
                e.stopPropagation();
                setShowPresets(!showPresets);
              }}
            >
              ▼
            </button>
          </div>
          
          {/* Presets dropdown */}
          {showPresets && (
            <div 
              ref={presetsRef}
              className="absolute mt-1 left-1 w-[210px] bg-gray-800 border border-divider z-10 rounded-sm shadow-lg"
            >
              <div className="p-2 text-xs text-gray-400">Presets</div>
              <div className="grid grid-cols-3 gap-1 p-2">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    className={`text-xs py-1 px-2 rounded ${
                      amount === preset.value 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                    onClick={() => selectPreset(preset.value)}
                  >
                    {preset.label} BTC
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-divider">
                <button
                  className="text-xs py-1 px-2 w-full text-left text-blue-400 hover:text-blue-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCustomAmount(true);
                    setShowPresets(false);
                  }}
                >
                  Enter custom amount...
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Plus button */}
        <div className="w-8 h-8 border border-divider rounded-sm hover:bg-gray-700 transition-colors">
          <button 
            className="w-full h-full flex items-center justify-center text-lg text-white"
            onClick={incrementAmount}
            aria-label="Increase amount"
          >+</button>
        </div>
      </div>

      {/* Order Type Buttons */}
      <div className="flex mb-3 text-xs">
        <button 
          className={`px-2 py-1 rounded-l-sm border border-divider hover:bg-gray-700 transition-colors
            ${orderType === 'buy' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
          onClick={() => setOrderType('buy')}
          aria-pressed={orderType === 'buy'}
        >
          Buy
        </button>
        <button 
          className={`px-2 py-1 rounded-r-sm border-t border-r border-b border-divider hover:bg-gray-700 transition-colors
            ${orderType === 'sell' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
          onClick={() => setOrderType('sell')}
          aria-pressed={orderType === 'sell'}
        >
          Sell
        </button>
        <div className="ml-auto flex gap-2">
          <button 
            className={`px-2 py-1 rounded-sm border border-divider hover:bg-gray-700 transition-colors
              ${viewMode === 'sum' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
            onClick={() => setViewMode('sum')}
            aria-pressed={viewMode === 'sum'}
          >
            Sum
          </button>
          <button 
            className={`px-2 py-1 rounded-sm border border-divider hover:bg-gray-700 transition-colors
              ${viewMode === 'detailed' ? 'bg-gray-900 text-white' : 'bg-gray-800 text-gray-300'}`}
            onClick={() => setViewMode('detailed')}
            aria-pressed={viewMode === 'detailed'}
          >
            Detailed
          </button>
        </div>
      </div>
      
      {/* Column Headers */}
      <div className="grid grid-cols-18 text-xs text-divider py-2 px-1 border-b border-divider">
        <div className="col-span-1"></div> {/* Bar column */}
        <div className="col-span-5 text-center text-[#8a919e]">Amount (BTC)</div>
        <div className="col-span-6 text-center text-[#8a919e]">Price (USD)</div>
        <div className="col-span-6 text-center text-[#8a919e]">
          {viewMode === 'sum' ? 'Sum (BTC)' : 'Total (USD)'}
        </div>
      </div>

      {/* Sell Orders (Asks) - Red */}
      <div className="overflow-y-auto max-h-[150px]">
        {asks.map((ask, index) => {
          const volumePercentage = (ask.amount / maxVolume) * 100;
          const selectedAmount = parseFloat(amount);
          const isHighlighted = selectedAmount <= ask.amount;
          const isInOrderRange = index <= 4; // Top 5 orders get special highlight
          
          // Calculate depth percentage for visualization
          const sumPercentage = Math.min((ask.sum / asks[asks.length - 1].sum) * 100, 100);
          
          return (
            <div 
              key={`ask-${index}`} 
              className={`grid grid-cols-18 text-xs py-1 relative hover:bg-gray-800 transition-colors
                ${isHighlighted ? 'bg-gray-900' : ''}
                ${isInOrderRange && isHighlighted ? 'border-l-2 border-error' : ''}
              `}
            >
              {/* Red bar column */}
              <div className="col-span-1 h-full flex items-center">
                <div 
                  className={`h-3/5 ${isInOrderRange && isHighlighted ? 'bg-error opacity-70' : 'bg-error opacity-50'}`}
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                {ask.amount.toFixed(8)}
                {isInOrderRange && isHighlighted && (
                  <span className="ml-1 text-[10px] text-error">✓</span>
                )}
              </div>
              
              {/* Price column */}
              <div className={`col-span-6 text-center ${isInOrderRange && isHighlighted ? 'text-error font-bold' : 'text-error'}`}>
                {ask.price.toFixed(2)}
                {isInOrderRange && isHighlighted && selectedAmount >= ask.amount * 0.8 && (
                  <span className="ml-1 text-xs">${(ask.price * ask.amount).toFixed(2)}</span>
                )}
              </div>
              
              {/* Sum/Total column with depth indicator */}
              <div className="col-span-6 text-center text-gray-300 relative">
                {viewMode === 'sum' ? (
                  <>
                    <span>{ask.sum.toFixed(4)}</span>
                    <div 
                      className="absolute top-0 right-0 h-full bg-error opacity-10"
                      style={{ width: `${sumPercentage}%` }}
                    ></div>
                  </>
                ) : (
                  <span>${(ask.price * ask.amount).toFixed(2)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spread Indicator with current amount value */}
      <div className="grid grid-cols-18 text-xs py-2 border-t border-b border-divider">
        <div className="col-span-1"></div>
        <div className="col-span-5 text-center text-gray-400">USD Spread</div>
        <div className="col-span-6 text-center text-gray-400">{spread.toFixed(2)}</div>
        <div className="col-span-6 text-center text-blue-400">
          <span className="text-gray-400 mr-1">≈</span>
          ${(parseFloat(amount) * currentPrice).toFixed(2)}
        </div>
      </div>

      {/* Buy Orders (Bids) - Green */}
      <div className="overflow-y-auto max-h-[150px]">
        {bids.map((bid, index) => {
          const volumePercentage = (bid.amount / maxVolume) * 100;
          const selectedAmount = parseFloat(amount);
          const isHighlighted = selectedAmount <= bid.amount;
          const isInOrderRange = index <= 4; // Top 5 orders get special highlight
          
          // Calculate depth percentage for visualization
          const sumPercentage = Math.min((bid.sum / bids[bids.length - 1].sum) * 100, 100);
          
          return (
            <div 
              key={`bid-${index}`} 
              className={`grid grid-cols-18 text-xs py-1 relative hover:bg-gray-800 transition-colors
                ${isHighlighted ? 'bg-gray-900' : ''}
                ${isInOrderRange && isHighlighted ? 'border-l-2 border-success' : ''}
              `}
            >
              {/* Green bar column */}
              <div className="col-span-1 h-full flex items-center">
                <div 
                  className={`h-3/5 ${isInOrderRange && isHighlighted ? 'bg-success opacity-70' : 'bg-success opacity-50'}`}
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                {bid.amount.toFixed(8)}
                {isInOrderRange && isHighlighted && (
                  <span className="ml-1 text-[10px] text-success">✓</span>
                )}
              </div>
              
              {/* Price column */}
              <div className={`col-span-6 text-center ${isInOrderRange && isHighlighted ? 'text-success font-bold' : 'text-success'}`}>
                {bid.price.toFixed(2)}
                {isInOrderRange && isHighlighted && selectedAmount >= bid.amount * 0.8 && (
                  <span className="ml-1 text-xs">${(bid.price * bid.amount).toFixed(2)}</span>
                )}
              </div>
              
              {/* Sum/Total column with depth indicator */}
              <div className="col-span-6 text-center text-gray-300 relative">
                {viewMode === 'sum' ? (
                  <>
                    <span>{bid.sum.toFixed(4)}</span>
                    <div 
                      className="absolute top-0 right-0 h-full bg-success opacity-10"
                      style={{ width: `${sumPercentage}%` }}
                    ></div>
                  </>
                ) : (
                  <span>${(bid.price * bid.amount).toFixed(2)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Enhanced amount summary footer */}
      <div className="mt-3 text-xs border-t border-divider pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-1 text-gray-400">Amount:</span>
            <span className="font-bold text-white">{amount} BTC</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1 text-gray-400">Value:</span>
            <span className="font-bold text-white">${(parseFloat(amount) * currentPrice).toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            <span className="mr-1 text-gray-400">Best Ask:</span>
            <span className="font-bold text-error">${asks[0]?.price.toFixed(2) || '--'}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1 text-gray-400">Best Bid:</span>
            <span className="font-bold text-success">${bids[0]?.price.toFixed(2) || '--'}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            <span className="mr-1 text-gray-400">Mid Price:</span>
            <span className="font-bold text-white">
              ${((asks[0]?.price + bids[0]?.price) / 2).toFixed(2) || '--'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="mr-1 text-gray-400">Spread:</span>
            <span className="font-bold text-blue-400">${spread.toFixed(2)} ({((spread / currentPrice) * 100).toFixed(3)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}