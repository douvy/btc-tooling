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
  const baseUrl = '/api/coingecko';
  const url = `${baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  // Set up headers
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  // Add API key (will be handled by the proxy)
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  if (apiKey) {
    headers['x-cg-api-key'] = apiKey;
  }
  
  try {
    // Make the request with retry logic
    const response = await enhancedFetch(url, { headers });
    
    // Parse and return the data
    return await response.json();
  } catch (error) {
    console.error('Error fetching from CoinGecko:', error);
    
    // If we hit rate limits, try blockchain.info API
    try {
      console.log('Attempting to use blockchain.info API as fallback');
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
      console.error('Fallback API also failed:', fallbackError);
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
export async function fetchDetailedBitcoinData(): Promise<any> {
  // Add a cache-busting timestamp
  const timestamp = Date.now();
  
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
  
  // Log the API response structure in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const percentageFields = Object.keys(response.market_data).filter(k => k.includes('percentage') || k.includes('change'));
      console.log('Detailed API response percentage/change fields:', percentageFields);
      
      // Log key percentage change values
      console.log('1h percent change:', response.market_data.price_change_percentage_1h_in_currency?.usd);
      console.log('24h percent change:', response.market_data.price_change_percentage_24h);
      console.log('7d percent change:', response.market_data.price_change_percentage_7d_in_currency?.usd || response.market_data.price_change_percentage_7d);
      console.log('30d percent change:', response.market_data.price_change_percentage_30d_in_currency?.usd || response.market_data.price_change_percentage_30d);
      console.log('1y percent change:', response.market_data.price_change_percentage_1y_in_currency?.usd || response.market_data.price_change_percentage_1y);
      console.log('24h dollar change:', response.market_data.price_change_24h);
      
      // Add calculations for ALL timeframe if not provided
      if (response.market_data && response.market_data.current_price && response.market_data.current_price.usd) {
        const currentPrice = response.market_data.current_price.usd;
        const firstBitcoinPrice = 101; // Simplified starting price for ALL calculation
        const allTimeDollarChange = currentPrice - firstBitcoinPrice;
        const allTimePercentChange = ((currentPrice - firstBitcoinPrice) / firstBitcoinPrice) * 100;
        
        // Add to the response
        response.market_data.price_change_percentage_all_time_in_currency = { 
          usd: allTimePercentChange 
        };
        response.market_data.price_change_all_time_in_currency = { 
          usd: allTimeDollarChange 
        };
      }
    } catch (error) {
      console.error('Error processing API response:', error);
    }
  }
  
  return response;
}

/**
 * Get simple Bitcoin price data for 24h timeframe
 * This version is a lightweight alternative to fetchDetailedBitcoinData
 */
export async function fetchSimpleBitcoinPrice(): Promise<any> {
  // Add a cache-busting timestamp
  const timestamp = Date.now();
  
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
  
  if (!simpleData?.bitcoin?.usd) {
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
}