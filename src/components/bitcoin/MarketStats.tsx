'use client';

import { useMarketStats } from '@/hooks/useMarketStats';

export default function MarketStats() {
  const { data, isLoading, error } = useMarketStats();

  if (isLoading || !data) {
    return (
      <div className="px-6 pt-6 pb-4 bg-dark-card animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-4 bg-dark-card rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-dark-card rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatMarketCap = (value: number): string => {
    const trillion = value / 1_000_000_000_000;
    return `$${trillion.toFixed(2)}T`;
  };

  const formatPrice = (value: number): string => {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const formatPercentChange = (value: number): string => {
    const sign = value < 0 ? '-' : '+';
    return `${sign}${Math.abs(value).toFixed(2)}%`;
  };

  return (
    <section className="pt-6 pb-6 border-b border-divider" aria-label="Bitcoin market statistics">
      <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto px-6 snap-x snap-mandatory scroll-px-6">
        <div className="rounded-lg p-4 bg-dark-card flex-shrink-0 w-[180px] md:w-auto snap-start">
          <h3 className="text-white text-sm md:text-base font-proxima-nova mb-1">Sats per Dollar</h3>
          <p className="text-xs md:text-sm text-muted mb-2 font-proxima-nova">Value of $1 USD in Satoshis</p>
          <p className="text-2xl font-fuji-bold text-white">{data.satsPerDollar.toLocaleString()}</p>
        </div>

        <div className="rounded-lg p-4 bg-dark-card flex-shrink-0 w-[180px] md:w-auto snap-start">
          <h3 className="text-white text-sm md:text-base font-proxima-nova mb-1">Market Capitalization</h3>
          <p className="text-xs md:text-sm text-muted mb-2 font-proxima-nova">Price times circulating supply</p>
          <p className="text-2xl font-fuji-bold text-white">{formatMarketCap(data.marketCap)}</p>
        </div>

        <div className="rounded-lg p-4 bg-dark-card flex-shrink-0 w-[180px] md:w-auto snap-start">
          <h3 className="text-white text-sm md:text-base font-proxima-nova mb-1">All-Time High</h3>
          <p className="text-xs md:text-sm text-muted mb-2 font-proxima-nova">Highest Bitcoin price in history</p>
          <p className="text-2xl font-fuji-bold text-white">{formatPrice(data.athPrice)}</p>
        </div>

        <div className="rounded-lg p-4 bg-dark-card flex-shrink-0 w-[180px] md:w-auto snap-start">
          <h3 className="text-white text-sm md:text-base font-proxima-nova mb-1">From ATH</h3>
          <p className="text-xs md:text-sm text-muted mb-2 font-proxima-nova">Change relative to all-time high</p>
          <p className="text-2xl font-fuji-bold text-white">
            {formatPercentChange(data.athPercentChange)}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 text-error text-xs">
          Using cached data
        </div>
      )}
    </section>
  );
}
