import { NextResponse } from 'next/server';
import { buildMarketStats, CoinGeckoMarketData } from '@/lib/marketStats';

export const revalidate = 60; // Cache for 60 seconds

interface CoinGeckoResponse {
  market_data: CoinGeckoMarketData;
}

interface MempoolHashrateResponse {
  currentHashrate: number; // H/s
}

interface MempoolFeesResponse {
  fastestFee: number; // sat/vB
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new Error(`Upstream API error: ${response.status} (${url})`);
  }
  return response.json();
}

export async function GET(): Promise<NextResponse> {
  try {
    const [coinGecko, hashrate, fees, blockHeight] = await Promise.all([
      fetchJson<CoinGeckoResponse>(
        'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false'
      ),
      fetchJson<MempoolHashrateResponse>('https://mempool.space/api/v1/mining/hashrate/3d'),
      fetchJson<MempoolFeesResponse>('https://mempool.space/api/v1/fees/recommended'),
      fetchJson<number>('https://mempool.space/api/blocks/tip/height'),
    ]);

    const marketStats = buildMarketStats(
      coinGecko.market_data,
      hashrate.currentHashrate,
      fees.fastestFee,
      blockHeight
    );

    return NextResponse.json(marketStats);
  } catch (error) {
    // Surface the failure so the client keeps its last good data and shows the error state
    console.error('market-stats fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch market stats' }, { status: 503 });
  }
}
