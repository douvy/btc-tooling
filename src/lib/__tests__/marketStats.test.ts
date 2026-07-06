import { buildMarketStats, CoinGeckoMarketData } from '../marketStats';

const marketData: CoinGeckoMarketData = {
  current_price: { usd: 63_190 },
  market_cap: { usd: 1_270_000_000_000 },
  ath: { usd: 126_160 },
  ath_change_percentage: { usd: -49.9 },
  ath_date: { usd: '2025-10-06T00:00:00.000Z' },
  circulating_supply: 20_050_000,
};

describe('buildMarketStats', () => {
  // 272 days after the ATH date
  const now = new Date('2026-07-05T00:00:00.000Z').getTime();
  const stats = buildMarketStats(marketData, 9.551e20, 1, 956_872, now);

  it('computes sats per dollar', () => {
    expect(stats.satsPerDollar).toBe(1583); // 100M / 63,190 rounded
  });

  it('passes through market cap, ATH price, and ATH change', () => {
    expect(stats.marketCap).toBe(1_270_000_000_000);
    expect(stats.athPrice).toBe(126_160);
    expect(stats.athPercentChange).toBe(-49.9);
  });

  it('computes supply percent issued', () => {
    expect(stats.supplyPercentIssued).toBeCloseTo(95.476, 3);
  });

  it('computes days since ATH', () => {
    expect(stats.daysSinceAth).toBe(272);
  });

  it('converts hash rate from H/s to EH/s', () => {
    expect(stats.hashRateEhs).toBe(955);
  });

  it('passes through fee rate and block height', () => {
    expect(stats.fastestFee).toBe(1);
    expect(stats.blockHeight).toBe(956_872);
  });
});
