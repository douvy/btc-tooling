import { useState } from 'react';
import { OrderBook as OrderBookType, OrderBookEntry } from '@/types';

interface OrderBookProps {
  orderBook: OrderBookType;
  currentPrice: number;
  priceChange: number;
}

export default function OrderBook({ orderBook, currentPrice, priceChange }: OrderBookProps) {
  const [amount, setAmount] = useState("0.01");
  
  // Use sample data from screenshot if needed
  const sampleAsks = [
    { price: 77300.58, amount: 0.25871916 },
    { price: 77299.91, amount: 0.25871916 },
    { price: 77299.42, amount: 0.25871916 },
    { price: 77299.41, amount: 0.03730000 },
    { price: 77298.71, amount: 0.19405241 },
    { price: 77296.78, amount: 0.01596444 },
    { price: 77296.77, amount: 0.00014227 },
    { price: 77290.51, amount: 0.07767600 }
  ];
  
  const sampleBids = [
    { price: 77290.50, amount: 0.07406000 },
    { price: 77288.79, amount: 0.00002588 },
    { price: 77285.24, amount: 0.00001941 },
    { price: 77283.43, amount: 0.00100000 },
    { price: 77281.50, amount: 0.00013000 },
    { price: 77281.27, amount: 0.00001630 },
    { price: 77280.64, amount: 0.00014233 },
    { price: 77280.63, amount: 0.01940978 }
  ];
  
  // Calculate the maximum volume for sizing the depth bars
  const maxVolume = Math.max(
    ...sampleAsks.map(ask => ask.amount),
    ...sampleBids.map(bid => bid.amount)
  );

  return (
    <div className="text-white w-full font-sans">
      <h2 id="halving-title" className="text-xl font-fuji-bold flex items-center">
        Order Book
      </h2>
      {/* Amount Control */}
      <div className="flex items-center border-b border-divider">
        {/* Minus button with border */}
        <div className="border-r border-divider">
          <button className="text-xl font-archivo px-6 py-3 text-white">−</button>
        </div>
        
        {/* Amount display */}
        <div className="flex-1 text-center py-3">
          <span className="text-base font-archivo">{amount}</span>
        </div>
        
        {/* Plus button with border */}
        <div className="border-l border-divider">
          <button className="text-xl font-archivo px-6 py-3 text-white">+</button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 text-xs text-divider py-2 px-1 border-b border-divider">
        <div className="col-span-1"></div> {/* Bar column */}
        <div className="col-span-5 text-center text-[#8a919e]">Amount (BTC)</div>
        <div className="col-span-6 text-center text-[#8a919e]">Price (USD)</div>
      </div>

      {/* Sell Orders (Asks) - Red */}
      <div className="overflow-y-auto">
        {sampleAsks.map((ask, index) => {
          const volumePercentage = (ask.amount / maxVolume) * 100;
          
          return (
            <div key={`ask-${index}`} className="grid grid-cols-12 text-xs py-1 relative">
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
        <div className="col-span-6 pr-6 text-right">0.01</div>
      </div>

      {/* Buy Orders (Bids) - Green */}
      <div className="overflow-y-auto">
        {sampleBids.map((bid, index) => {
          const volumePercentage = (bid.amount / maxVolume) * 100;
          
          return (
            <div key={`bid-${index}`} className="grid grid-cols-12 text-xs py-1 relative">
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