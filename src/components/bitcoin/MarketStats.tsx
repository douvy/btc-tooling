'use client';

import { useMarketStats } from '@/hooks/useMarketStats';

const CARD_CLASS = 'rounded-lg px-4 py-2.5 bg-dark-card';
const TITLE_CLASS = 'text-white text-sm font-proxima-nova mb-0.5';
const SUBTITLE_CLASS = 'text-xs text-muted mb-1 font-proxima-nova';
const VALUE_CLASS = 'text-xl font-fuji-bold text-white';
// 9th card spans both columns on mobile so it doesn't sit orphaned
const LAST_CARD_CLASS = `${CARD_CLASS} col-span-2 md:col-span-1`;

export default function MarketStats() {
  const { data, isLoading, error } = useMarketStats();

  if (!data) {
    return (
      <section className="pt-6 pb-6 border-b border-divider" aria-label="Bitcoin market statistics">
        {error ? (
          <div className="mx-6 rounded-lg bg-error-ghost px-4 py-3 text-sm text-error-light font-proxima-nova">
            Market stats are temporarily unavailable. Retrying automatically.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6 animate-pulse" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className={i === 9 ? LAST_CARD_CLASS : CARD_CLASS}>
                <div className="h-4 bg-divider rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-divider rounded w-full mb-3"></div>
                <div className="h-7 bg-divider rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}
      </section>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-6">
        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>Sats per Dollar</h3>
          <p className={SUBTITLE_CLASS}>Value of $1 USD in Satoshis</p>
          <p className={VALUE_CLASS}>{data.satsPerDollar.toLocaleString()}</p>
        </div>

        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>Market Capitalization</h3>
          <p className={SUBTITLE_CLASS}>Price times circulating supply</p>
          <p className={VALUE_CLASS}>{formatMarketCap(data.marketCap)}</p>
        </div>

        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>Supply Issued</h3>
          <p className={SUBTITLE_CLASS}>Percentage of 21M mined</p>
          <p className={VALUE_CLASS}>{data.supplyPercentIssued.toFixed(2)}%</p>
        </div>

        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>All-Time High</h3>
          <p className={SUBTITLE_CLASS}>Highest Bitcoin price in history</p>
          <p className={VALUE_CLASS}>{formatPrice(data.athPrice)}</p>
        </div>

        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>From ATH</h3>
          <p className={SUBTITLE_CLASS}>Change relative to all-time high</p>
          <p className={VALUE_CLASS}>{formatPercentChange(data.athPercentChange)}</p>
        </div>

        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>Days Since ATH</h3>
          <p className={SUBTITLE_CLASS}>Time since all-time high</p>
          <p className={VALUE_CLASS}>{data.daysSinceAth}</p>
        </div>

        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>Hash Rate</h3>
          <p className={SUBTITLE_CLASS}>Network mining power (3d avg)</p>
          <p className={VALUE_CLASS}>{data.hashRateEhs.toLocaleString()} EH/s</p>
        </div>

        <div className={CARD_CLASS}>
          <h3 className={TITLE_CLASS}>Fee Rate</h3>
          <p className={SUBTITLE_CLASS}>Next-block fee estimate</p>
          <p className={VALUE_CLASS}>{data.fastestFee} sat/vB</p>
        </div>

        <div className={LAST_CARD_CLASS}>
          <h3 className={TITLE_CLASS}>Block Height</h3>
          <p className={SUBTITLE_CLASS}>Blocks mined to date</p>
          <p className={VALUE_CLASS}>{data.blockHeight.toLocaleString()}</p>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-error-ghost px-3 py-2 text-xs text-error-light font-proxima-nova">
          Live update failed — showing last known data
        </div>
      )}
    </section>
  );
}
