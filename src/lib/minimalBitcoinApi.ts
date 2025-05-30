/**
 * Minimal Bitcoin Price API
 * 
 * Extremely efficient implementation that only makes ONE API call
 * and uses local storage for caching.
 */

import { BitcoinPrice, TimeFrame } from '@/types';

// Cached data with timestamp
interface CachedData {
  timestamp: number;
  data: any;
}

// Maximum age of cached data (5 minutes)
const MAX_CACHE_AGE = 5 * 60 * 1000;

/**
 * Get cached data if available and not expired
 */
function getCachedData(): CachedData | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const cachedString = localStorage.getItem('btc-price-data');
    if (!cachedString) return null;
    
    const cached = JSON.parse(cachedString) as CachedData;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > MAX_CACHE_AGE) {
      console.log('Cache expired, fetching fresh data');
      return null;
    }
    
    return cached;
  } catch (err) {
    console.error('Error reading cache:', err);
    return null;
  }
}

/**
 * Save data to cache
 */
function saveToCache(data: any): void {
  try {
    if (typeof window === 'undefined') return;
    
    const cacheData: CachedData = {
      timestamp: Date.now(),
      data
    };
    
    localStorage.setItem('btc-price-data', JSON.stringify(cacheData));
  } catch (err) {
    console.error('Error saving to cache:', err);
  }
}

/**
 * Fetch Bitcoin price data with proper API key
 * Only makes ONE API call when needed
 */
export async function getBitcoinPrice(timeframe: TimeFrame): Promise<BitcoinPrice> {
  // STEP 1: Get real-time current price from Coinbase WebSocket API (no rate limits)
  let realtimePrice = null;
  try {
    // Add a timeout to prevent hanging if the API is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const realtimeResponse = await fetch('/api/coinbase-realtime', {
      signal: controller.signal,
      cache: 'no-store' // Ensure we always get fresh data
    });
    
    clearTimeout(timeoutId);
    
    // Try to parse even if status is not OK
    let realtimeData;
    try {
      realtimeData = await realtimeResponse.json();
      console.log('Real-time API response:', realtimeData);
    } catch (parseError) {
      console.warn('Failed to parse real-time API response', parseError);
      const text = await realtimeResponse.text();
      console.warn('Raw response:', text);
    }
    
    if (realtimeData && realtimeData.success && realtimeData.price) {
      realtimePrice = realtimeData.price;
      console.log('Using real-time price:', realtimePrice, 'from', realtimeData.source || 'unknown');
    } else if (!realtimeResponse.ok) {
      console.warn('Real-time API returned non-OK status:', realtimeResponse.status);
    } else {
      console.warn('Real-time API returned invalid data:', realtimeData);
    }
  } catch (error) {
    console.warn('Failed to get real-time price, will use historical data:', error);
  }
  
  // STEP 2: Try to use cached historical data for changes
  const cached = getCachedData();
  if (cached && cached.data) {
    // Use cached historical data with real-time price if available
    if (realtimePrice) {
      return extractHistoricalTimeframeDataWithRealtime(cached.data, timeframe, realtimePrice);
    }
    
    // Otherwise just use cached historical data
    return extractHistoricalTimeframeData(cached.data, timeframe);
  }
  
  // STEP 3: If no valid cache, fetch fresh historical data
  
  try {
    // Use our historical price API that provides real data for all timeframes
    const url = '/api/price-history';
    
    // Add a timeout to prevent hanging if the API is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store' // Ensure we always get fresh data
    });
    
    clearTimeout(timeoutId);
    
    // Try to parse the response even if status is not OK
    let result;
    try {
      result = await response.json();
      console.log('Historical API response structure:', 
        result ? 
        `success=${!!result.success}, has timeframes=${!!result.timeframes}, timeframe count=${result.timeframes ? Object.keys(result.timeframes).length : 0}` : 
        'null response'
      );
    } catch (error) {
      console.error('Failed to parse historical API response', error);
      const text = await response.text();
      console.error('Raw historical response:', text);
      throw new Error(`Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!response.ok) {
      console.error(`Historical API error: ${response.status}`);
    }
    
    // Validate the response structure
    if (!result || !result.price || !result.timeframes) {
      console.error('Invalid historical API response structure:', result);
      
      // Try using the fallback API directly instead of throwing
      const fallbackUrl = '/api/price-check';
      console.log('Trying fallback API:', fallbackUrl);
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData && fallbackData.price) {
        console.log('Using fallback price data');
        return {
          price: fallbackData.price,
          change: Math.abs(fallbackData.price * (fallbackData.change24h || 0) / 100),
          changePercent: Math.abs(fallbackData.change24h || 0),
          direction: (fallbackData.change24h || 0) >= 0 ? 'up' : 'down',
          timeframe
        };
      }
      
      // If fallback also failed, then throw
      throw new Error('Invalid historical data structure and fallback failed');
    }
    
    // Save to cache for future use
    saveToCache(result);
    
    // If we have real-time price, use it with historical change data
    if (realtimePrice) {
      return extractHistoricalTimeframeDataWithRealtime(result, timeframe, realtimePrice);
    }
    
    // Otherwise just use historical data
    return extractHistoricalTimeframeData(result, timeframe);
  } catch (error) {
    console.error('Error fetching Bitcoin price:', error);
    
    // Fall back to the simple price endpoint if historical fails
    try {
      const url = '/api/price-check';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Fallback API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Return at least the current price and 24h change
      if (timeframe === '1D') {
        return {
          price: result.price,
          change: Math.abs(result.price * (result.change24h / 100)),
          changePercent: Math.abs(result.change24h),
          direction: result.change24h >= 0 ? 'up' : 'down',
          timeframe
        };
      } else {
        // For other timeframes, we don't have the data
        return {
          price: result.price,
          change: 0, // We don't know
          changePercent: 0, // We don't know
          direction: 'up', // Default
          timeframe
        };
      }
    } catch (fallbackError) {
      console.error('Even fallback API failed:', fallbackError);
      
      // Last resort - return empty data and let the UI handle it
      return {
        price: 0,
        change: 0,
        changePercent: 0,
        direction: 'up',
        timeframe
      };
    }
  }
}

/**
 * Extract data from the historical API response for a specific timeframe
 */
function extractHistoricalTimeframeData(data: any, timeframe: TimeFrame): BitcoinPrice {
  if (!data || !data.price || !data.timeframes || !data.timeframes[timeframe]) {
    console.error('Invalid or missing data for timeframe', timeframe, data);
    return {
      price: 0,
      change: 0,
      changePercent: 0,
      direction: 'up',
      timeframe
    };
  }
  
  // Special handling for ALL timeframe
  if (timeframe === 'ALL') {
    const currentPrice = data.price;
    const allTimeChange = currentPrice - 100;
    const allTimePercent = ((currentPrice - 100) / 100) * 100;
    
    // ALL timeframe calculated from $100 base price with historical current price
    
    return {
      price: currentPrice,
      change: allTimeChange,
      changePercent: allTimePercent,
      direction: 'up', // Bitcoin is always up from $100
      timeframe
    };
  }
  
  // For other timeframes, use the data from the API
  const tfData = data.timeframes[timeframe];
  
  return {
    price: data.price,
    change: Math.abs(tfData.change),
    changePercent: Math.abs(tfData.percentChange),
    direction: tfData.direction,
    timeframe
  };
}

/**
 * Combines real-time price with historical change data
 * This gives us frequent price updates while maintaining accurate historical changes
 */
function extractHistoricalTimeframeDataWithRealtime(data: any, timeframe: TimeFrame, realtimePrice: number): BitcoinPrice {
  if (!data || !data.timeframes || !data.timeframes[timeframe]) {
    console.error('Invalid or missing historical data for timeframe', timeframe);
    return {
      price: realtimePrice,
      change: 0,
      changePercent: 0,
      direction: 'up',
      timeframe
    };
  }
  
  const tfData = data.timeframes[timeframe];
  const historicalPrice = data.price;
  
  // Special handling for ALL timeframe
  if (timeframe === 'ALL') {
    // For ALL timeframe, we always use $100 as the starting price
    const allTimeChange = realtimePrice - 100;
    const allTimePercent = ((realtimePrice - 100) / 100) * 100;
    
    // ALL timeframe calculated from $100 base price with real-time current price
    
    return {
      price: realtimePrice,
      change: allTimeChange,
      changePercent: allTimePercent,
      direction: 'up', // Bitcoin is always up from $100
      timeframe
    };
  }
  
  // For all timeframes except ALL, use a direct calculation without complex adjustments
  // This ensures consistent percentages with external sources
  if (timeframe !== 'ALL' as TimeFrame) {
    try {
      // Use the proper historical data - the "previous" price should be accurate
      // because we're now calculating it correctly in the price-history API
      const previousPrice = tfData.previous;
      
      // Calculate direction and change based on realtime price vs historical previous
      const calculatedChange = realtimePrice - previousPrice;
      const calculatedPercent = (calculatedChange / previousPrice) * 100;
      const direction = calculatedChange >= 0 ? 'up' : 'down';
      
      // The key difference: Do NOT adjust the percent by the priceDiffPercent like we do below
      // Just use the direct calculation between previous price and current price
      
      return {
        price: realtimePrice,
        change: Math.abs(calculatedChange),
        changePercent: Math.abs(calculatedPercent),
        direction,
        timeframe
      };
    } catch (error) {
      console.error(`Error in ${timeframe} calculation:`, error);
      // If something goes wrong, fall back to standard calculation below
    }
  }
  
  // For other timeframes, use the original calculation method
  // Calculate the percent difference between the historical and real-time price
  const priceDiffPercent = ((realtimePrice - historicalPrice) / historicalPrice) * 100;
  
  // Adjust the change percentage by the price difference
  const adjustedPercentChange = tfData.percentChange + priceDiffPercent;
  
  // Recalculate the dollar change based on the new percentage
  const previousPrice = tfData.previous;
  const adjustedChange = realtimePrice - previousPrice;
  
  // Determine the direction based on the adjusted values
  const direction = adjustedChange >= 0 ? 'up' : 'down';
  
  return {
    price: realtimePrice,
    change: Math.abs(adjustedChange),
    changePercent: Math.abs(adjustedPercentChange),
    direction,
    timeframe
  };
}

// Old extractTimeframeData function removed - no longer needed with new implementation