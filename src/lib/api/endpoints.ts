import { enhancedFetch } from './fetch';
import { logWithTime } from './logger';

/**
 * Fetch from CoinGecko API through our proxy
 */
export async function fetchFromCoinGecko(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  // Build query string
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  // Use Next.js API route in all environments for consistent CORS handling
  // The proxy will handle redirecting to pro-api.coingecko.com domain
  const baseUrl = '/api/coingecko';
  const url = `${baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  // Set up headers
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  // Add a note that the API key will be handled by the proxy
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  if (apiKey) {
    // The API key is now included in the URL by the proxy as x_cg_api_key
  }
  
  try {
    // Make the request with retry logic
    const response = await enhancedFetch(url, { headers });
    
    // Parse and return the data
    return await response.json();
  } catch (error) {
    // If we hit rate limits, try blockchain.info API
    try {
      const blockchainResponse = await fetch('/api/blockchain/ticker');
      if (blockchainResponse.ok) {
        const blockchainData = await blockchainResponse.json();
        return {
          market_data: {
            current_price: { usd: blockchainData.bitcoin?.usd || 0 },
            price_change_percentage_24h: blockchainData.bitcoin?.usd_24h_change || 0,
            price_change_24h: 0, // Not available directly
            last_updated_at: Math.floor(Date.now() / 1000)
          }
        };
      }
    } catch (fallbackError) {
      // Fallback API failed
    }
    
    // Re-throw the original error if fallback fails
    throw error;
  }
}

/**
 * NOTE: We removed the Coinbase API fallback function.
 * We only use CoinGecko API with our API key, plus blockchain.info as fallback.
 */

/**
 * Get detailed Bitcoin price data for multiple timeframes
 */
import { canMakeRequest, registerRequest, completeRequest } from './coordinator';

export async function fetchDetailedBitcoinData(): Promise<any> {
  // Add a cache-busting timestamp
  const timestamp = Date.now();
  
  // Check if we can make a request (rate limit check)
  if (!canMakeRequest()) {
    console.warn('Rate limit reached, using cached data instead');
    throw new Error('Rate limit reached, using cached data');
  }
  
  // Register this request with the coordinator
  const requestId = registerRequest('coins/bitcoin');
  
  try {
    // CoinGecko v3 API requires specific parameters to return percentage changes
    const response = await fetchFromCoinGecko('coins/bitcoin', {
      localization: 'false',
      tickers: 'false',
      market_data: 'true',
      community_data: 'false',
      developer_data: 'false',
      sparkline: 'false',
      // These parameters are required to get percentage changes correctly
      include_market_cap: 'true',
      include_24hr_vol: 'true',
      include_24hr_change: 'true',
      include_last_updated_at: 'true',
      // Add cache-busting parameter
      _t: timestamp.toString()
    });
    
    // Mark request as completed
    completeRequest(requestId, true);
    
    // Ensure data has all timeframes filled in
    return enhanceWithCompleteTimeframes(response);
  } catch (error) {
    // Mark request as failed
    completeRequest(requestId, false);
    throw error;
  }
}

/**
 * Enhance data with complete timeframe calculations
 * This ensures data completeness for all timeframes
 */
function enhanceWithCompleteTimeframes(data: any): any {
  // Handle completely missing data (API failures)
  if (!data || !data.market_data) {
    throw new Error('No valid data available from API');
  }
  
  if (!data?.market_data?.current_price?.usd) {
    return data;
  }
  
  const marketData = data.market_data;
  const currentPrice = marketData.current_price.usd;
  
  // Create a deep copy to avoid modifying the original
  const enhancedData = JSON.parse(JSON.stringify(data));
  
  // ENSURE ALL TIMEFRAMES HAVE DATA
  
  // ALL TIMEFRAME - Use $100 as starting price
  const firstBitcoinPrice = 100; // As per requirements
  const allTimeDollarChange = currentPrice - firstBitcoinPrice;
  const allTimePercentChange = ((currentPrice - firstBitcoinPrice) / firstBitcoinPrice) * 100;
  
  // Add our ALL timeframe calculation
  if (!enhancedData.market_data.price_change_percentage_all_time_in_currency) {
    enhancedData.market_data.price_change_percentage_all_time_in_currency = {};
  }
  enhancedData.market_data.price_change_percentage_all_time_in_currency.usd = allTimePercentChange;
  
  if (!enhancedData.market_data.price_change_all_time_in_currency) {
    enhancedData.market_data.price_change_all_time_in_currency = {};
  }
  enhancedData.market_data.price_change_all_time_in_currency.usd = allTimeDollarChange;
  
  // Calculate dollar changes for each timeframe based on the percentage changes
  // We're using only the real API data, no estimates
  
  // 1H timeframe
  if (marketData.price_change_percentage_1h_in_currency?.usd !== undefined) {
    const percent1h = marketData.price_change_percentage_1h_in_currency.usd;
    const prev1hPrice = currentPrice / (1 + (percent1h / 100));
    const dollar1hChange = Math.abs(currentPrice - prev1hPrice);
    
    if (!enhancedData.market_data.price_change_1h_in_currency) {
      enhancedData.market_data.price_change_1h_in_currency = {};
    }
    enhancedData.market_data.price_change_1h_in_currency.usd = dollar1hChange * (percent1h >= 0 ? 1 : -1);
  }
  
  // 1D timeframe - ensure consistent data between the two possible fields
  if (marketData.price_change_percentage_24h !== undefined) {
    // Fill in the 24h_in_currency field if it doesn't exist
    if (!enhancedData.market_data.price_change_percentage_24h_in_currency) {
      enhancedData.market_data.price_change_percentage_24h_in_currency = {};
    }
    enhancedData.market_data.price_change_percentage_24h_in_currency.usd = marketData.price_change_percentage_24h;
    
    // Calculate dollar change if not provided
    if (marketData.price_change_24h === undefined) {
      const percent24h = marketData.price_change_percentage_24h;
      const prev24hPrice = currentPrice / (1 + (percent24h / 100));
      const dollar24hChange = Math.abs(currentPrice - prev24hPrice);
      enhancedData.market_data.price_change_24h = dollar24hChange * (percent24h >= 0 ? 1 : -1);
    }
  } else if (marketData.price_change_percentage_24h_in_currency?.usd !== undefined) {
    // Copy from in_currency field to the main field
    enhancedData.market_data.price_change_percentage_24h = marketData.price_change_percentage_24h_in_currency.usd;
    
    // Calculate dollar change if not provided
    if (marketData.price_change_24h === undefined) {
      const percent24h = marketData.price_change_percentage_24h_in_currency.usd;
      const prev24hPrice = currentPrice / (1 + (percent24h / 100));
      const dollar24hChange = Math.abs(currentPrice - prev24hPrice);
      enhancedData.market_data.price_change_24h = dollar24hChange * (percent24h >= 0 ? 1 : -1);
    }
  }
  
  // 1W timeframe
  if (marketData.price_change_percentage_7d_in_currency?.usd !== undefined) {
    const percent7d = marketData.price_change_percentage_7d_in_currency.usd;
    const prev7dPrice = currentPrice / (1 + (percent7d / 100));
    const dollar7dChange = Math.abs(currentPrice - prev7dPrice);
    
    if (!enhancedData.market_data.price_change_7d_in_currency) {
      enhancedData.market_data.price_change_7d_in_currency = {};
    }
    enhancedData.market_data.price_change_7d_in_currency.usd = dollar7dChange * (percent7d >= 0 ? 1 : -1);
  }
  
  // 1M timeframe
  if (marketData.price_change_percentage_30d_in_currency?.usd !== undefined) {
    const percent30d = marketData.price_change_percentage_30d_in_currency.usd;
    const prev30dPrice = currentPrice / (1 + (percent30d / 100));
    const dollar30dChange = Math.abs(currentPrice - prev30dPrice);
    
    if (!enhancedData.market_data.price_change_30d_in_currency) {
      enhancedData.market_data.price_change_30d_in_currency = {};
    }
    enhancedData.market_data.price_change_30d_in_currency.usd = dollar30dChange * (percent30d >= 0 ? 1 : -1);
  }
  
  // 1Y timeframe
  if (marketData.price_change_percentage_1y_in_currency?.usd !== undefined) {
    const percent1y = marketData.price_change_percentage_1y_in_currency.usd;
    const prev1yPrice = currentPrice / (1 + (percent1y / 100));
    const dollar1yChange = Math.abs(currentPrice - prev1yPrice);
    
    if (!enhancedData.market_data.price_change_1y_in_currency) {
      enhancedData.market_data.price_change_1y_in_currency = {};
    }
    enhancedData.market_data.price_change_1y_in_currency.usd = dollar1yChange * (percent1y >= 0 ? 1 : -1);
  }
  
  // Add source verification
  enhancedData.enhanced = true;
  enhancedData.enhancedAt = Date.now();
  
  // Log the enhanced data in development mode
  if (process.env.NODE_ENV === 'development') {
    try {
      // Development logs removed
    } catch (error) {
      // Error logging removed
    }
  }
  
  return enhancedData;
}

/**
 * Get simple Bitcoin price data for 24h timeframe
 * This version is a lightweight alternative to fetchDetailedBitcoinData
 */
export async function fetchSimpleBitcoinPrice(): Promise<any> {
  // Add a cache-busting timestamp
  const timestamp = Date.now();
  
  // Check if we can make a request (rate limit check)
  if (!canMakeRequest()) {
    console.warn('Rate limit reached, using cached data instead');
    throw new Error('Rate limit reached, using cached data');
  }
  
  // Register this request with the coordinator
  const requestId = registerRequest('simple/price');
  
  try {
    // Get simple price with 24h change
    const simpleData = await fetchFromCoinGecko('simple/price', {
      ids: 'bitcoin',
      vs_currencies: 'usd',
      include_24h_change: 'true',
      include_24h_vol: 'true',
      include_last_updated_at: 'true',
      precision: 'full',
      // Add cache-busting parameter
      _t: timestamp.toString()
    });
    
    // Mark request as completed
    completeRequest(requestId, true);
  
  if (!simpleData?.bitcoin?.usd) {
    completeRequest(requestId, false);
    throw new Error('Failed to get simple price data');
  }
  
  // Format it to match expected structure
  const price = simpleData.bitcoin.usd;
  const change24h = simpleData.bitcoin.usd_24h_change || 0;
  const previousPrice = price / (1 + (change24h / 100));
  const dollarChange = price - previousPrice;
  
  return {
    bitcoin: simpleData.bitcoin,
    market_data: {
      current_price: { usd: price },
      price_change_percentage_24h: change24h,
      price_change_percentage_24h_in_currency: { usd: change24h },
      price_change_24h: dollarChange,
      last_updated_at: simpleData.bitcoin.last_updated_at || Math.floor(Date.now() / 1000)
    }
  };
  } catch (error) {
    // Mark request as failed
    completeRequest(requestId, false);
    throw error;
  }
}