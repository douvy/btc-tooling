import { MarketStats } from '@/types';

export interface CoinGeckoMarketData {
  current_price: { usd: number };
  market_cap: { usd: number };
  ath: { usd: number };
  ath_change_percentage: { usd: number };
  ath_date: { usd: string };
  circulating_supply: number;
}

/**
 * Transforms upstream API payloads into the MarketStats shape.
 * @param currentHashrate network hash rate in H/s (from mempool.space)
 * @param fastestFee next-block fee estimate in sat/vB (from mempool.space)
 * @param blockHeight current chain tip height (from mempool.space)
 * @param now current time in ms, injectable for tests
 */
export function buildMarketStats(
  marketData: CoinGeckoMarketData,
  currentHashrate: number,
  fastestFee: number,
  blockHeight: number,
  now: number = Date.now()
): MarketStats {
  const athDate = new Date(marketData.ath_date.usd);

  return {
    satsPerDollar: Math.round(100_000_000 / marketData.current_price.usd),
    marketCap: marketData.market_cap.usd,
    supplyPercentIssued: (marketData.circulating_supply / 21_000_000) * 100,
    athPrice: marketData.ath.usd,
    athPercentChange: marketData.ath_change_percentage.usd,
    daysSinceAth: Math.floor((now - athDate.getTime()) / (1000 * 60 * 60 * 24)),
    hashRateEhs: Math.round(currentHashrate / 1e18),
    fastestFee,
    blockHeight,
  };
}
