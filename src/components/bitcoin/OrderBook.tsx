import { useState } from 'react';
import { OrderBook as OrderBookType, OrderBookEntry } from '@/types';

interface OrderBookProps {
  orderBook: OrderBookType;
  currentPrice: number;
  priceChange: number;
}

export default function OrderBook({ orderBook, currentPrice, priceChange }: OrderBookProps) {
  const [exchange, setExchange] = useState('Binance');
  const isNegativeChange = priceChange < 0;
  const changePercent = Math.abs((priceChange / currentPrice) * 100).toFixed(2);

  return (
    <section className="rounded-xl" aria-labelledby="orderbook-title">
      {/* Exchange Selector */}
      <div className="flex items-center justify-between mb-4">
        <h2 id="orderbook-title" className="text-xl font-fuji-bold">Order Book</h2>
        <div className="relative">
          <label htmlFor="exchange-select" className="sr-only">Select Exchange</label>
          <select 
            id="exchange-select" 
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="bg-[#141519] text-white text-sm rounded border border-divider py-1.5 px-2.5 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option>Binance</option>
            <option>Coinbase Pro</option>
            <option>Kraken</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
            <i className="fas fa-chevron-down text-xs" aria-hidden="true"></i>
          </div>
        </div>
      </div>
      
      {/* Headers */}
      <div className="grid grid-cols-4 text-xs text-gray-400 mb-1 px-1" role="rowgroup" aria-label="Order book headers">
        <div role="columnheader">Price</div>
        <div role="columnheader" className="text-right">Amount</div>
        <div role="columnheader" className="text-right">Total</div>
        <div role="columnheader" className="text-right">Sum</div>
      </div>
        
      {/* Asks (Sell Orders) */}
      <div className="max-h-[180px] overflow-y-auto mb-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent" role="table" aria-label="Sell orders">
        <div className="space-y-0" role="rowgroup">
          {orderBook.asks.map((ask, index) => (
            <OrderBookRow 
              key={`ask-${index}`} 
              entry={ask} 
              type="ask" 
              maxSum={Math.max(...orderBook.asks.map(a => a.sum))} 
            />
          ))}
        </div>
      </div>
      
      {/* Current Price */}
      <div className="py-1.5 px-1 bg-[#131722] text-center text-base font-fuji-bold rounded relative" aria-live="polite" aria-label="Current Bitcoin price">
        <span className="text-primary">{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className={`absolute left-2 top-1/2 transform -translate-y-1/2 text-xs ${isNegativeChange ? 'text-error' : 'text-success'}`}>
          <i className={`fas fa-chevron-${isNegativeChange ? 'down' : 'up'}`} aria-hidden="true"></i> {changePercent}%
        </span>
      </div>
      
      {/* Bids (Buy Orders) */}
      <div className="max-h-[180px] overflow-y-auto mt-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent" role="table" aria-label="Buy orders">
        <div className="space-y-0" role="rowgroup">
          {orderBook.bids.map((bid, index) => (
            <OrderBookRow 
              key={`bid-${index}`} 
              entry={bid} 
              type="bid" 
              maxSum={Math.max(...orderBook.bids.map(b => b.sum))} 
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface OrderBookRowProps {
  entry: OrderBookEntry;
  type: 'ask' | 'bid';
  maxSum: number;
}

function OrderBookRow({ entry, type, maxSum }: OrderBookRowProps) {
  const percentage = Math.min((entry.sum / maxSum) * 100, 95);
  const isAsk = type === 'ask';
  
  return (
    <div className="grid grid-cols-4 text-xs relative h-5 hover:bg-[#1E2026]" role="row">
      <div className={`${isAsk ? 'text-error' : 'text-success'} z-10`} role="cell">
        {entry.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-right z-10" role="cell">
        {entry.amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
      </div>
      <div className="text-right z-10" role="cell">
        {entry.total.toLocaleString()}
      </div>
      <div className="text-right z-10" role="cell">
        {entry.sum.toLocaleString()}
      </div>
      <div 
        className={`absolute ${isAsk ? 'right-0' : 'left-0'} h-full ${isAsk ? 'bg-error' : 'bg-success'} bg-opacity-10`} 
        style={{ width: `${percentage}%` }} 
        aria-hidden="true"
      ></div>
    </div>
  );
}