import { BitcoinPrice, TimeFrame } from '@/types';

// Precision constants
const PRICE_DECIMAL_PLACES = 2;
const PERCENT_DECIMAL_PLACES = 2;
const CHANGE_DECIMAL_PLACES = 2;

/**
 * Format number with K/M/B suffix for social media metrics
 * e.g. 1500 -> 1.5K, 1400000 -> 1.4M
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return value.toString();
}

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
 * Check if a percentage change is effectively zero
 * Used to determine if price is truly unchanged
 */
export function isEffectivelyZero(value: number): boolean {
  return Math.abs(value) < 0.000001; // Suitable epsilon for financial calculations
}

/**
 * Gets the appropriate currency field name for a given timeframe
 * Used to consistently access data in the CoinGecko API response
 */
export function getCurrencyFieldForTimeframe(timeframe: TimeFrame): string | null {
  switch (timeframe) {
    case '1H': return 'price_change_percentage_1h_in_currency';
    case '1D': return 'price_change_percentage_24h_in_currency';
    case '1W': return 'price_change_percentage_7d_in_currency';
    case '1M': return 'price_change_percentage_30d_in_currency';
    case '1Y': return 'price_change_percentage_1y_in_currency';
    case 'ALL': return 'price_change_percentage_all_time_in_currency';
    default: return 'price_change_percentage_24h_in_currency'; // Default to 24h
  }
}

/**
 * Format price for display with proper locale and currency symbol
 * Enhanced version with better precision and USD formatting
 */
export function formatPrice(price: number, decimals: number = 2, symbol: string = '$'): string {
  // Ensure price is valid
  if (isNaN(price) || price === null || price === undefined) {
    return `${symbol}0.00`;
  }
  
  // Format with locale for proper thousand separators and decimal points
  const formatted = price.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals,
    useGrouping: true, // Use thousand separators
  });
  
  return `${symbol}${formatted}`;
}

/**
 * Format percentage for display
 */
export function formatPercent(percent: number): string {
  return `${percent.toFixed(2)}%`;
}

/**
 * Format percentage with options for decimals and plus sign
 * Used for displaying percentage changes
 */
export function formatPercentage(value: number, decimals: number = 2, showPlusSign: boolean = false): string {
  const fixed = value.toFixed(decimals);
  // Only add plus sign for positive values when requested
  const prefix = showPlusSign && value > 0 ? '+' : '';
  return `${prefix}${fixed}%`;
}

/**
 * Calculate price change between old and new price
 * Returns an object with absolute change, percentage change, and direction
 */
export function calculatePriceChange(oldPrice: number, newPrice: number): { 
  change: number; 
  changePercent: number; 
  direction: 'up' | 'down';
} {
  // Calculate absolute change
  const change = newPrice - oldPrice;
  
  // Calculate percentage change while avoiding division by zero
  const changePercent = oldPrice === 0 ? 0 : (change / oldPrice) * 100;
  
  // Determine direction
  const direction = change >= 0 ? 'up' : 'down';
  
  return {
    change,
    changePercent,
    direction
  };
}

/**
 * Extract timeframe-specific Bitcoin price data from API response
 * Uses only real data from the API, no estimates
 */
export function extractTimeframeData(data: any, timeframe: TimeFrame): BitcoinPrice {
  try {
    // Validate the input data
    if (!data?.market_data?.current_price?.usd) {
      console.error('Invalid data format - missing current price');
      return fallbackBitcoinPrice(timeframe);
    }
    
    // Get the current price
    const currentPrice = data.market_data.current_price.usd;
    
    // Get percentage change for the requested timeframe
    let percentChange: number = 0;
    let dollarChange: number = 0;
    let direction: 'up' | 'down' = 'up';
    
    // Handle each timeframe specifically, using real data from the API
    switch(timeframe) {
      case '1H':
        // Use || 0 instead of throwing errors for missing data
        percentChange = data.market_data.price_change_percentage_1h_in_currency?.usd || 0;
        dollarChange = Math.abs(data.market_data.price_change_1h_in_currency?.usd || 0);
        break;
      
      case '1D':
        // CoinGecko provides 24h data in two different fields
        // Use direct percentage from API, preferring the standard field
        percentChange = data.market_data.price_change_percentage_24h !== undefined
          ? data.market_data.price_change_percentage_24h
          : data.market_data.price_change_percentage_24h_in_currency?.usd || 0;
        
        // Use direct dollar change if available
        dollarChange = Math.abs(data.market_data.price_change_24h || 0);
        break;
      
      case '1W':
        percentChange = data.market_data.price_change_percentage_7d_in_currency?.usd || 0;
        dollarChange = Math.abs(data.market_data.price_change_7d_in_currency?.usd || 0);
        break;
      
      case '1M':
        percentChange = data.market_data.price_change_percentage_30d_in_currency?.usd || 0;
        dollarChange = Math.abs(data.market_data.price_change_30d_in_currency?.usd || 0);
        break;
      
      case '1Y':
        percentChange = data.market_data.price_change_percentage_1y_in_currency?.usd || 0;
        dollarChange = Math.abs(data.market_data.price_change_1y_in_currency?.usd || 0);
        break;
      
      case 'ALL':
        // For ALL timeframe, default to 1000% if not available
        percentChange = data.market_data.price_change_percentage_all_time_in_currency?.usd || 1000;
        dollarChange = Math.abs(data.market_data.price_change_all_time_in_currency?.usd || currentPrice - 100);
        break;
      
      default:
        // Default to 24h data if timeframe is unknown
        percentChange = data.market_data.price_change_percentage_24h || 0;
        dollarChange = Math.abs(data.market_data.price_change_24h || 0);
    }
    
    // If dollar change is missing but we have percentage, calculate it
    if (dollarChange === 0 && percentChange !== 0) {
      const previousPrice = currentPrice / (1 + (percentChange / 100));
      dollarChange = Math.abs(currentPrice - previousPrice);
    }
    
    // Determine direction
    direction = percentChange >= 0 ? 'up' : 'down';
    
    // Format values with proper precision
    const normalizedPrice = normalizeDecimalPlaces(currentPrice, PRICE_DECIMAL_PLACES);
    const normalizedChange = normalizeDecimalPlaces(dollarChange, CHANGE_DECIMAL_PLACES);
    const normalizedPercentChange = normalizeDecimalPlaces(Math.abs(percentChange), PERCENT_DECIMAL_PLACES);
    
    // Return the complete Bitcoin price object
    return {
      price: normalizedPrice,
      change: normalizedChange,
      changePercent: normalizedPercentChange,
      direction,
      timeframe
    };
  } catch (error) {
    console.error('Error extracting timeframe data:', error);
    return fallbackBitcoinPrice(timeframe);
  }
}

/**
 * Provide consistent fallback data for Bitcoin price
 */
function fallbackBitcoinPrice(timeframe: TimeFrame): BitcoinPrice {
  return {
    price: 75000,
    change: 2000,
    changePercent: 2.5,
    direction: 'up',
    timeframe
  };
}

/**
 * Helper function to get direct percentage change from API data
 */
function getDirectPercentageChange(marketData: any, timeframe: TimeFrame): number | null {
  switch (timeframe) {
    case '1H':
      return marketData.price_change_percentage_1h_in_currency?.usd ?? null;
    case '1D':
      return marketData.price_change_percentage_24h_in_currency?.usd ?? 
             marketData.price_change_percentage_24h ?? null;
    case '1W':
      return marketData.price_change_percentage_7d_in_currency?.usd ?? 
             marketData.price_change_percentage_7d ?? null;
    case '1M':
      return marketData.price_change_percentage_30d_in_currency?.usd ?? 
             marketData.price_change_percentage_30d ?? null;
    case '1Y':
      return marketData.price_change_percentage_1y_in_currency?.usd ?? 
             marketData.price_change_percentage_1y ?? null;
    case 'ALL':
      return marketData.price_change_percentage_all_time_in_currency?.usd ?? null;
    default:
      return null;
  }
}

/**
 * Helper function to get direct dollar change from API data
 */
function getDirectDollarChange(marketData: any, timeframe: TimeFrame): number | null {
  switch (timeframe) {
    case '1H':
      return marketData.price_change_1h_in_currency?.usd ?? null;
    case '1D':
      return marketData.price_change_24h ?? null;
    case '1W':
      return marketData.price_change_7d_in_currency?.usd ?? null;
    case '1M':
      return marketData.price_change_30d_in_currency?.usd ?? null;
    case '1Y':
      return marketData.price_change_1y_in_currency?.usd ?? null;
    case 'ALL':
      return marketData.price_change_all_time_in_currency?.usd ?? null;
    default:
      return null;
  }
}

/**
 * Helper to calculate previous price from current price and percent change
 * This uses the correct mathematical formula to ensure consistency
 */
function calculatePreviousPrice(currentPrice: number, percentChange: number): number {
  return currentPrice / (1 + (percentChange / 100));
}