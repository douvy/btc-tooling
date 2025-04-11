import { TimeFrame } from '@/types';

/**
 * Mock data generator for Bitcoin pricing
 * This creates realistic price movements for testing in development
 */

// Base price range (updated realistic BTC price as of April 2025)
const BASE_PRICE = 82151;
const VOLATILITY = 0.015; // 1.5% volatility for realistic movements

// Historical mock data for different timeframes
interface MockHistoricalData {
  [key: string]: {
    changePercent: number;
    direction: 'up' | 'down';
  }
}

const HISTORICAL_DATA: MockHistoricalData = {
  '1H': { changePercent: 0.3, direction: 'up' },
  '1D': { changePercent: 0.7, direction: 'down' },
  '1W': { changePercent: 2.1, direction: 'up' },
  '1M': { changePercent: 8.5, direction: 'up' },
  '1Y': { changePercent: 25.0, direction: 'up' },
  'ALL': { changePercent: 15000.0, direction: 'up' },
};

// Store the most recent mock price for continuity
let lastMockPrice = BASE_PRICE;
let lastUpdateTime = Date.now();

/**
 * Generate a random price movement with bounded volatility
 */
function generatePriceMovement(): number {
  // Random movement between -volatility and +volatility
  const movementPercent = (Math.random() * 2 - 1) * VOLATILITY;
  return BASE_PRICE * (1 + movementPercent);
}

/**
 * Calculate dollar change from percentage
 */
function calculateChange(currentPrice: number, percentChange: number): number {
  if (percentChange === 0) return 0;
  
  // Calculate previous price using the correct formula
  const previousPrice = currentPrice / (1 + (percentChange / 100));
  
  // Return absolute dollar change
  return Math.abs(currentPrice - previousPrice);
}

/**
 * Get mock API data for simple price endpoint
 */
export function getMockSimplePrice() {
  // Generate realistic price movement from last price
  const now = Date.now();
  const timeDiff = (now - lastUpdateTime) / 1000; // seconds
  
  // Only move price significantly if enough time has passed
  let currentPrice;
  if (timeDiff > 3) {
    currentPrice = generatePriceMovement();
    lastMockPrice = currentPrice;
    lastUpdateTime = now;
  } else {
    // Smaller movement for more frequent calls
    const smallMovement = (Math.random() * 0.0004) - 0.0002; // ±0.02%
    currentPrice = lastMockPrice * (1 + smallMovement);
    lastMockPrice = currentPrice;
  }
  
  // Calculate 24h change based on historical data
  const dayData = HISTORICAL_DATA['1D'];
  const change24h = dayData.direction === 'up' ? dayData.changePercent : -dayData.changePercent;
  
  // Return API-compatible structure
  return {
    bitcoin: {
      usd: currentPrice,
      usd_24h_change: change24h,
      usd_24h_vol: 24500000000, // Realistic 24h volume
      last_updated_at: Math.floor(Date.now() / 1000)
    }
  };
}

/**
 * Generate mock data for the order book
 */
export function getMockOrderBook() {
  // Generate realistic order book entries
  const currentPrice = lastMockPrice;
  
  // Create more realistic order quantities
  const createAmountDistribution = () => {
    // Generate a range of amounts that follow a more realistic distribution
    const baseAmounts = [
      0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.75, 1.0, 1.5, 2.0
    ];
    
    // Create a weighted distribution that favors smaller amounts
    return baseAmounts.map(amt => {
      // Add some randomness to the amounts
      const randomFactor = 0.85 + (Math.random() * 0.3);
      return amt * randomFactor;
    });
  };
  
  // Create asks (sell orders) - higher than current price
  const askPriceOffsets = Array(12).fill(0).map((_, i) => {
    // Price increases with larger gaps as we move away from mid price
    const baseFactor = 1 + (i * 0.15);
    return (i + 1) * baseFactor + (Math.random() * (baseFactor * 0.5));
  });
  
  const askAmounts = createAmountDistribution();
  
  const asks = askPriceOffsets.map((offset, i) => {
    const price = currentPrice + offset;
    // Select an amount based on index, with some randomization
    const amountIndex = Math.min(i, askAmounts.length - 1);
    // Use different amount distribution for asks to avoid identical order books
    const amount = i < 5 
      ? askAmounts[amountIndex] * (0.9 + Math.random() * 0.2)
      : askAmounts[Math.floor(Math.random() * askAmounts.length)];
    
    const total = price * amount;
    return { price, amount, total, sum: 0 };
  }).sort((a, b) => a.price - b.price);
  
  // Create bids (buy orders) - lower than current price
  const bidPriceOffsets = Array(12).fill(0).map((_, i) => {
    // Price decreases with larger gaps as we move away from mid price
    const baseFactor = 1 + (i * 0.15);
    return (i + 1) * baseFactor + (Math.random() * (baseFactor * 0.5));
  });
  
  const bidAmounts = createAmountDistribution();
  
  const bids = bidPriceOffsets.map((offset, i) => {
    const price = currentPrice - offset;
    // Select an amount based on index, with some randomization
    const amountIndex = Math.min(i, bidAmounts.length - 1);
    const amount = i < 5 
      ? bidAmounts[amountIndex] * (0.9 + Math.random() * 0.2)
      : bidAmounts[Math.floor(Math.random() * bidAmounts.length)];
    
    const total = price * amount;
    return { price, amount, total, sum: 0 };
  }).sort((a, b) => b.price - a.price);
  
  // Calculate cumulative volumes (sum)
  let askSum = 0;
  asks.forEach((ask, i) => {
    askSum += ask.amount;
    asks[i].sum = askSum;
  });
  
  let bidSum = 0;
  bids.forEach((bid, i) => {
    bidSum += bid.amount;
    bids[i].sum = bidSum;
  });

  // Calculate the spread between lowest ask and highest bid
  const calculatedSpread = asks[0].price - bids[0].price;
  
  return {
    asks,
    bids,
    spread: calculatedSpread
  };
}

/**
 * Get mock API data for detailed endpoint
 */
export function getMockDetailedPrice() {
  // Generate price with realistic movement
  const currentPrice = lastMockPrice;
  
  // Create detailed API response structure
  return {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    market_data: {
      current_price: {
        usd: currentPrice
      },
      ath: {
        usd: 75000.0 // All-time high
      },
      ath_change_percentage: {
        usd: ((currentPrice - 75000) / 75000) * 100
      },
      price_change_percentage_1h_in_currency: {
        usd: HISTORICAL_DATA['1H'].direction === 'up' 
          ? HISTORICAL_DATA['1H'].changePercent 
          : -HISTORICAL_DATA['1H'].changePercent
      },
      price_change_percentage_24h: HISTORICAL_DATA['1D'].direction === 'up' 
        ? HISTORICAL_DATA['1D'].changePercent 
        : -HISTORICAL_DATA['1D'].changePercent,
      price_change_percentage_7d: HISTORICAL_DATA['1W'].direction === 'up' 
        ? HISTORICAL_DATA['1W'].changePercent 
        : -HISTORICAL_DATA['1W'].changePercent,
      price_change_percentage_30d: HISTORICAL_DATA['1M'].direction === 'up' 
        ? HISTORICAL_DATA['1M'].changePercent 
        : -HISTORICAL_DATA['1M'].changePercent,
      price_change_percentage_1y: HISTORICAL_DATA['1Y'].direction === 'up' 
        ? HISTORICAL_DATA['1Y'].changePercent 
        : -HISTORICAL_DATA['1Y'].changePercent,
      market_cap: {
        usd: currentPrice * 19600000 // Approx supply * price
      },
      total_volume: {
        usd: 24500000000 // Realistic 24h volume
      },
      last_updated_at: Math.floor(Date.now() / 1000)
    }
  };
}