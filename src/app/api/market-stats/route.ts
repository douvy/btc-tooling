import { NextResponse } from 'next/server';
import { MarketStats } from '@/types';

export const revalidate = 60; // Cache for 60 seconds

interface CoinGeckoResponse {
  market_data: {
    current_price: {
      usd: number;
    };
    market_cap: {
      usd: number;
    };
    ath: {
      usd: number;
    };
    ath_change_percentage: {
      usd: number;
    };
  };
}

export async function GET(): Promise<NextResponse<MarketStats>> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false',
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: CoinGeckoResponse = await response.json();
    const marketData = data.market_data;

    const marketStats: MarketStats = {
      satsPerDollar: Math.round(100_000_000 / marketData.current_price.usd),
      marketCap: marketData.market_cap.usd,
      athPrice: marketData.ath.usd,
      athPercentChange: marketData.ath_change_percentage.usd,
    };

    return NextResponse.json(marketStats);
  } catch (error) {
    // Fallback data based on approximate values
    return NextResponse.json({
      satsPerDollar: 878,
      marketCap: 2_270_000_000_000,
      athPrice: 126_080,
      athPercentChange: -9.6,
    });
  }
}
