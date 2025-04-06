import { BitcoinPrice, TimeFrame } from '@/types';

// Precision constants
const PRICE_DECIMAL_PLACES = 2;
const PERCENT_DECIMAL_PLACES = 2;
const CHANGE_DECIMAL_PLACES = 2;

/**
 * Normalize decimal places for consistent display
 */
export function normalizeDecimalPlaces(value: number, decimalPlaces = PRICE_DECIMAL_PLACES): number {
  // Handle potential NaN, undefined, or null values
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return parseFloat(value.toFixed(decimalPlaces));
}

/**
 * Format price for display with proper locale and currency symbol
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

/**
 * Format percentage for display
 */
export function formatPercent(percent: number): string {
  return `${percent.toFixed(2)}%`;
}

/**
 * Calculate dollar change correctly based on percentage change
 * Using the formula: previousPrice = currentPrice / (1 + percentChange/100)
 * Then dollar change = Math.abs(currentPrice - previousPrice)
 */
export function calculateDollarChange(currentPrice: number, percentChange: number): number {
  if (percentChange === 0) return 0;
  
  // Calculate the previous price based on the correct formula
  // If the percent change is positive, current price is higher than previous price
  // If the percent change is negative, current price is lower than previous price
  const previousPrice = currentPrice / (1 + (percentChange / 100));
  
  // Calculate the absolute dollar change
  const dollarChange = Math.abs(currentPrice - previousPrice);
  
  // For debugging
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
    console.log('Dollar change calculation:', {
      currentPrice: currentPrice.toFixed(2),
      percentChange: percentChange.toFixed(2) + '%',
      previousPrice: previousPrice.toFixed(2),
      formula: `${currentPrice} / (1 + (${percentChange}/100)) = ${previousPrice}`,
      dollarChange: dollarChange.toFixed(2)
    });
  }
  
  return dollarChange;
}

/**
 * Process Bitcoin price data from CoinGecko API
 * Directly maps timeframes to API fields and calculates dollar changes correctly
 */
export function extractTimeframeData(data: any, timeframe: TimeFrame): BitcoinPrice {
  try {
    // Validate the data structure
    if (!data?.market_data?.current_price?.usd) {
      throw new Error('Invalid Bitcoin data format');
    }
    
    const marketData = data.market_data;
    
    // Extract current price
    const price = marketData.current_price.usd;
    
    // Map timeframes to exact CoinGecko API fields
    let changePercent = 0;
    
    switch (timeframe) {
      case '1H':
        // For 1-hour data, use the hourly currency data
        changePercent = 
          marketData.price_change_percentage_1h_in_currency?.usd !== undefined
          ? marketData.price_change_percentage_1h_in_currency.usd
          : 0;
        break;
      case '1D':
        // For 24-hour data
        changePercent = marketData.price_change_percentage_24h || 0;
        break;
      case '1W':
        // For 7-day data
        changePercent = marketData.price_change_percentage_7d || 0;
        break;
      case '1M':
        // For 30-day data
        changePercent = marketData.price_change_percentage_30d || 0;
        break;
      case '1Y':
        // For 1-year data
        changePercent = marketData.price_change_percentage_1y || 0;
        break;
      case 'ALL':
        // ALL time (use longest available timeframe)
        changePercent = 
          marketData.ath_change_percentage?.usd ||
          marketData.price_change_percentage_1y || 
          marketData.price_change_percentage_200d || 
          100; // Default to 100% if no historical data available
        break;
      default:
        // Default to 24h
        changePercent = marketData.price_change_percentage_24h || 0;
    }
    
    // Calculate dollar change using the correct formula:
    // previousPrice = currentPrice / (1 + percentChange/100)
    // Then dollar change = Math.abs(currentPrice - previousPrice)
    const change = calculateDollarChange(price, changePercent);
    
    // Determine price movement direction
    const direction = changePercent >= 0 ? 'up' : 'down';
    
    // Log the extracted data for debugging
    const logEnabled = process.env.NODE_ENV === 'development';
    if (logEnabled) {
      console.log(`[BTC Data] ${timeframe}:`, {
        price: normalizeDecimalPlaces(price),
        rawChangePercent: changePercent,
        calculatedDollarChange: normalizeDecimalPlaces(change, CHANGE_DECIMAL_PLACES),
        direction,
        formula: `${price} / (1 + (${changePercent}/100)) = ${price / (1 + (changePercent/100))}`
      });
    }
    
    // Return clean, normalized data
    return {
      price: normalizeDecimalPlaces(price),
      change: normalizeDecimalPlaces(change, CHANGE_DECIMAL_PLACES),
      changePercent: normalizeDecimalPlaces(Math.abs(changePercent), PERCENT_DECIMAL_PLACES),
      direction
    };
  } catch (error) {
    console.error('Error extracting timeframe data:', error);
    
    // Return safe fallback values
    return {
      price: 82151, // Update to current BTC price
      change: 450,
      changePercent: 0.55,
      direction: 'up'
    };
  }
}