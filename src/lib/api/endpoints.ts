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
  
  // Make the request with retry logic
  const response = await enhancedFetch(url, { headers });
  
  // Parse and return the data
  return await response.json();
}

/**
 * Fetch from Coinbase API through our proxy as fallback
 */
export async function fetchFromCoinbase(): Promise<any> {
  logWithTime('fetch', 'Trying Coinbase API fallback');
  
  try {
    const url = '/api/coinbase'; // Default path is BTC-USD/spot
    const response = await enhancedFetch(url, {
      headers: {
        'Accept': 'application/json',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
    
    return await response.json();
  } catch (error) {
    logWithTime('error', 'Coinbase fallback failed:', error);
    throw error;
  }
}

/**
 * Get detailed Bitcoin price data for multiple timeframes
 */
export async function fetchDetailedBitcoinData(): Promise<any> {
  return await fetchFromCoinGecko('coins/bitcoin', {
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
    sparkline: 'false'
  });
}

/**
 * Get simple Bitcoin price data for 24h timeframe
 */
export async function fetchSimpleBitcoinPrice(): Promise<any> {
  return await fetchFromCoinGecko('simple/price', {
    ids: 'bitcoin',
    vs_currencies: 'usd',
    include_24h_change: 'true',
    include_24h_vol: 'true',
    include_last_updated_at: 'true',
    precision: 'full'
  });
}