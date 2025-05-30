/**
 * Mock Bitcoin data provider for development
 * Provides realistic data for all timeframes with accurate price/change calculations
 */

import { BitcoinPrice, TimeFrame } from '@/types';

// Current Bitcoin price (this would be fetched from an API in production)
const CURRENT_PRICE = 76500;

// Historical prices to calculate accurate changes for each timeframe
const PRICE_1H_AGO = 76200;   // price 1 hour ago
const PRICE_24H_AGO = 74500;  // price 24 hours ago  
const PRICE_7D_AGO = 72300;   // price 7 days ago
const PRICE_30D_AGO = 68100;  // price 30 days ago
const PRICE_1Y_AGO = 46300;   // price 1 year ago
const FIRST_BTC_PRICE = 100;  // starting price for ALL timeframe

/**
 * Calculate price change data for a timeframe
 */
function calculatePriceChange(currentPrice: number, previousPrice: number): {
  change: number;
  changePercent: number;
  direction: 'up' | 'down';
} {
  const change = currentPrice - previousPrice;
  const changePercent = (change / previousPrice) * 100;
  const direction = change >= 0 ? 'up' : 'down';
  
  return {
    change: Math.abs(change),
    changePercent: Math.abs(changePercent),
    direction
  };
}

/**
 * Get Bitcoin price data for a specific timeframe
 * Uses historically accurate mock data
 */
export function getMockBitcoinData(timeframe: TimeFrame): BitcoinPrice {
  let previousPrice: number;
  
  // Set the correct previous price based on timeframe
  switch (timeframe) {
    case '1H':
      previousPrice = PRICE_1H_AGO;
      break;
    case '1D':
      previousPrice = PRICE_24H_AGO;
      break;
    case '1W':
      previousPrice = PRICE_7D_AGO;
      break;
    case '1M':
      previousPrice = PRICE_30D_AGO;
      break;
    case '1Y':
      previousPrice = PRICE_1Y_AGO;
      break;
    case 'ALL':
      previousPrice = FIRST_BTC_PRICE;
      break;
    default:
      previousPrice = PRICE_24H_AGO;
  }
  
  // Calculate the price change
  const { change, changePercent, direction } = calculatePriceChange(CURRENT_PRICE, previousPrice);
  
  // Return the Bitcoin price data
  return {
    price: CURRENT_PRICE,
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    direction,
    timeframe
  };
}

/**
 * Get mock market data that matches CoinGecko API response format
 * This is used to test the application without making API calls
 */
export function getMockMarketData() {
  // Calculate all price changes
  const change1h = calculatePriceChange(CURRENT_PRICE, PRICE_1H_AGO);
  const change24h = calculatePriceChange(CURRENT_PRICE, PRICE_24H_AGO);
  const change7d = calculatePriceChange(CURRENT_PRICE, PRICE_7D_AGO);
  const change30d = calculatePriceChange(CURRENT_PRICE, PRICE_30D_AGO);
  const change1y = calculatePriceChange(CURRENT_PRICE, PRICE_1Y_AGO);
  const changeAll = calculatePriceChange(CURRENT_PRICE, FIRST_BTC_PRICE);
  
  // Create mock market data that matches CoinGecko API structure
  return {
    market_data: {
      current_price: { usd: CURRENT_PRICE },
      
      // 1H timeframe
      price_change_percentage_1h_in_currency: { 
        usd: change1h.direction === 'up' ? change1h.changePercent : -change1h.changePercent 
      },
      price_change_1h_in_currency: { 
        usd: change1h.direction === 'up' ? change1h.change : -change1h.change 
      },
      
      // 1D timeframe
      price_change_percentage_24h: change24h.direction === 'up' ? change24h.changePercent : -change24h.changePercent,
      price_change_percentage_24h_in_currency: { 
        usd: change24h.direction === 'up' ? change24h.changePercent : -change24h.changePercent 
      },
      price_change_24h: change24h.direction === 'up' ? change24h.change : -change24h.change,
      
      // 1W timeframe
      price_change_percentage_7d_in_currency: { 
        usd: change7d.direction === 'up' ? change7d.changePercent : -change7d.changePercent 
      },
      price_change_7d_in_currency: { 
        usd: change7d.direction === 'up' ? change7d.change : -change7d.change 
      },
      
      // 1M timeframe
      price_change_percentage_30d_in_currency: { 
        usd: change30d.direction === 'up' ? change30d.changePercent : -change30d.changePercent 
      },
      price_change_30d_in_currency: { 
        usd: change30d.direction === 'up' ? change30d.change : -change30d.change 
      },
      
      // 1Y timeframe
      price_change_percentage_1y_in_currency: { 
        usd: change1y.direction === 'up' ? change1y.changePercent : -change1y.changePercent 
      },
      price_change_1y_in_currency: { 
        usd: change1y.direction === 'up' ? change1y.change : -change1y.change 
      },
      
      // ALL timeframe
      price_change_percentage_all_time_in_currency: { 
        usd: changeAll.direction === 'up' ? changeAll.changePercent : -changeAll.changePercent 
      },
      price_change_all_time_in_currency: { 
        usd: changeAll.direction === 'up' ? changeAll.change : -changeAll.change 
      },
      
      last_updated_at: Math.floor(Date.now() / 1000)
    }
  };
}