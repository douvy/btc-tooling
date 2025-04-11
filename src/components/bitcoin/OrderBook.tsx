import { useState, useEffect } from 'react';
import { OrderBook as OrderBookType, OrderBookEntry } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';

interface OrderBookProps {
  orderBook?: OrderBookType;
  currentPrice: number;
  priceChange: number;
}

export default function OrderBook({ orderBook, currentPrice, priceChange }: OrderBookProps) {
  const [amount, setAmount] = useState("0.05");
  const [localOrderBook, setLocalOrderBook] = useState<OrderBookType | null>(null);
  
  // Use provided orderBook or fetch mock data
  useEffect(() => {
    if (orderBook) {
      setLocalOrderBook(orderBook);
    } else {
      setLocalOrderBook(getMockOrderBook());
    }
  }, [orderBook]);
  
  // Handle amount increment/decrement
  const decrementAmount = () => {
    const currentAmount = parseFloat(amount);
    if (currentAmount > 0.01) {
      setAmount((currentAmount - 0.01).toFixed(2));
    }
  };
  
  const incrementAmount = () => {
    const currentAmount = parseFloat(amount);
    setAmount((currentAmount + 0.01).toFixed(2));
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

      {/* Amount Control - Left aligned with more padding for amount */}
      <div className="flex items-center my-3 gap-1">
        {/* Minus button */}
        <div className="w-8 h-8 border border-divider rounded-sm hover:bg-gray-700 transition-colors">
          <button 
            className="w-full h-full flex items-center justify-center text-lg text-white"
            onClick={decrementAmount}
            aria-label="Decrease amount"
          >−</button>
        </div>
        
        {/* Amount display */}
        <div className="w-[210px] h-8 border border-divider flex items-center justify-center rounded-sm ml-1 mr-1">
          <span className="text-sm text-white px-6">{amount} BTC</span>
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

      {/* Column Headers */}
      <div className="grid grid-cols-12 text-xs text-divider py-2 px-1 border-b border-divider">
        <div className="col-span-1"></div> {/* Bar column */}
        <div className="col-span-5 text-center text-[#8a919e]">Amount (BTC)</div>
        <div className="col-span-6 text-center text-[#8a919e]">Price (USD)</div>
      </div>

      {/* Sell Orders (Asks) - Red */}
      <div className="overflow-y-auto max-h-[150px]">
        {asks.map((ask, index) => {
          const volumePercentage = (ask.amount / maxVolume) * 100;
          const isHighlighted = parseFloat(amount) <= ask.amount;
          
          return (
            <div 
              key={`ask-${index}`} 
              className={`grid grid-cols-12 text-xs py-1 relative hover:bg-gray-800 transition-colors ${isHighlighted ? 'bg-gray-900' : ''}`}
            >
              {/* Red bar column */}
              <div className="col-span-1 h-full flex items-center">
                <div 
                  className="h-3/5 bg-error"
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                {ask.amount.toFixed(8)}
              </div>
              
              {/* Price column */}
              <div className="col-span-6 text-center text-error">
                {ask.price.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Spread Indicator */}
      <div className="grid grid-cols-12 text-xs py-2 border-t border-b border-divider text-gray-400">
        <div className="col-span-4 pl-6 text-right">USD Spread</div>
        <div className="col-span-6 pr-6 text-right">{spread.toFixed(2)}</div>
      </div>

      {/* Buy Orders (Bids) - Green */}
      <div className="overflow-y-auto max-h-[150px]">
        {bids.map((bid, index) => {
          const volumePercentage = (bid.amount / maxVolume) * 100;
          const isHighlighted = parseFloat(amount) <= bid.amount;
          
          return (
            <div 
              key={`bid-${index}`} 
              className={`grid grid-cols-12 text-xs py-1 relative hover:bg-gray-800 transition-colors ${isHighlighted ? 'bg-gray-900' : ''}`}
            >
              {/* Green bar column */}
              <div className="col-span-1 h-full flex items-center">
                <div 
                  className="h-3/5 bg-success"
                  style={{ width: `${volumePercentage}%` }}
                ></div>
              </div>
              
              {/* Amount column */}
              <div className="col-span-5 text-center text-gray-300">
                {bid.amount.toFixed(8)}
              </div>
              
              {/* Price column */}
              <div className="col-span-6 text-center text-success">
                {bid.price.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}