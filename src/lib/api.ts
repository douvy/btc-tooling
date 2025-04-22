import { BitcoinPrice, TimeFrame } from '@/types';
import { extractTimeframeData } from '@/lib/priceUtils';
import { getApiCache, updateApiCache } from '@/lib/api/cache';

// Environment configuration
const isDev = process.env.NODE_ENV === 'development';
const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

// Logging helpers
const logPrefix = '[BTC API]';
export const logLevels = {
  update: true,  // Data updates
  fetch: true,   // API fetches
  cache: true,   // Cache operations
  error: true,   // Errors
  debug: debugMode // Debug info
};

// Export this so it can be shown in the diagnostic UI
export const lastUpdateTimestamp = {
  apiCall: 0,
  dataUpdate: 0,
  error: 0
};

// Track update status for the stale-while-revalidate pattern
export const updateStatus = {
  isLoading: false,
  isFetching: false,
  hasError: false,
  errorMessage: '',
  lastStatus: 200
};

/**
 * Enhanced logging with levels and timestamps
 */
function logWithTime(level: keyof typeof logLevels, ...args: any[]) {
  if (logLevels[level]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${logPrefix} [${timestamp}] [${level.toUpperCase()}]`, ...args);
  }
}

/**
 * Cache mechanism with metadata for diagnostics
 */
interface PriceCache {
  data: any;
  timestamp: number;
  endpoint: string;
  source: 'api' | 'localStorage' | 'fallback';
  fetchTime: number;
}

// Cache with short lifetime for frequent updates
// Using a variable that can be reassigned by imported functions
let apiCache: PriceCache | null = null;
// Make cache very short-lived to ensure fresh data is fetched frequently
const CACHE_LIFETIME = 1000; // 1 second

// Create a function to explicitly clear the cache
export function clearAPICache() {
  apiCache = null;
  logWithTime('cache', 'API cache explicitly cleared');
}

// Request configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 8000; // 8 seconds

/**
 * Save to localStorage for offline/error fallback
 */
function saveToLocalStorage(key: string, data: any) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      logWithTime('cache', 'Saved to localStorage:', key);
    }
  } catch (error) {
    logWithTime('error', 'Failed to save to localStorage:', error);
  }
}

/**
 * Load from localStorage
 */
function loadFromLocalStorage(key: string): any | null {
  try {
    if (typeof window !== 'undefined') {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Only use if less than 10 minutes old
        if (Date.now() - parsed.timestamp < 10 * 60 * 1000) {
          logWithTime('cache', 'Loaded from localStorage:', key, 'Age:', (Date.now() - parsed.timestamp) / 1000, 'seconds');
          return parsed.data;
        } else {
          logWithTime('cache', 'localStorage data too old:', key, 'Age:', (Date.now() - parsed.timestamp) / 1000, 'seconds');
        }
      }
    }
  } catch (error) {
    logWithTime('error', 'Failed to load from localStorage:', error);
  }
  return null;
}

/**
 * Enhanced fetch with retry, logging, and error handling
 */
async function enhancedFetch(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
  // Start timing
  const fetchStart = Date.now();
  updateStatus.isFetching = true;
  
  // Set up abort controller for timeout
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    // Force no caching at all levels
    options.cache = 'no-store';
    options.signal = signal;
    
    // Ensure cache-control headers are set
    options.headers = {
      ...options.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    // Add unique query param to bust any caching
    const bustCache = `_t=${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const separator = url.includes('?') ? '&' : '?';
    const urlWithCacheBust = `${url}${separator}${bustCache}`;
    
    // Log request details
    logWithTime('fetch', `Fetching [${retryCount > 0 ? `Retry ${retryCount}` : 'Initial'}]:`, urlWithCacheBust);
    logWithTime('debug', 'Fetch options:', options);
    
    // Make the request
    const response = await fetch(urlWithCacheBust, options);
    
    // Update tracking
    lastUpdateTimestamp.apiCall = Date.now();
    updateStatus.lastStatus = response.status;
    
    // Log response details
    const fetchTime = Date.now() - fetchStart;
    logWithTime('fetch', `Response: ${response.status} ${response.statusText} (${fetchTime}ms)`);
    
    // Handle non-successful responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`API error: ${response.status} ${response.statusText}${errorText ? `\n${errorText}` : ''}`);
    }
    
    return response;
  } catch (error: any) {
    // Handle timeout
    if (error.name === 'AbortError') {
      logWithTime('error', `Request timeout after ${REQUEST_TIMEOUT}ms`);
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`);
    }
    
    // Handle other errors
    logWithTime('error', `Fetch error (${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);
    
    // Implement retry logic
    if (retryCount < MAX_RETRIES) {
      logWithTime('fetch', `Retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return enhancedFetch(url, options, retryCount + 1);
    }
    
    // All retries failed
    throw error;
  } finally {
    clearTimeout(timeoutId);
    updateStatus.isFetching = false;
  }
}

/**
 * Fetch from CoinGecko API through our proxy
 */
async function fetchFromCoinGecko(endpoint: string, params: Record<string, string> = {}): Promise<any> {
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
    logWithTime('debug', 'Using API key');
  }
  
  // Make the request with retry logic
  const response = await enhancedFetch(url, { headers });
  
  // Parse and return the data
  return await response.json();
}

/**
 * NOTE: We removed the Coinbase API fallback function.
 * We only use CoinGecko API with our API key, plus blockchain.info as fallback.
 */

/**
 * Get detailed Bitcoin price data for multiple timeframes
 */
async function fetchDetailedBitcoinData(): Promise<any> {
  // Add timestamp to bust any browser or proxy caching
  const timestamp = Date.now();
  
  return await fetchFromCoinGecko('coins/bitcoin', {
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
    sparkline: 'false',
    _t: timestamp.toString() // Cache-busting query parameter
  });
}

/**
 * Get simple Bitcoin price data for 24h timeframe
 */
async function fetchSimpleBitcoinPrice(): Promise<any> {
  return await fetchFromCoinGecko('simple/price', {
    ids: 'bitcoin',
    vs_currencies: 'usd',
    include_24h_change: 'true',
    include_24h_vol: 'true',
    include_last_updated_at: 'true',
    precision: 'full'
  });
}

/**
 * Main function to get Bitcoin price - ALWAYS fetch fresh data
 */
export const getBitcoinPrice = async (requestedTimeframe: TimeFrame = '1D'): Promise<BitcoinPrice> => {
  // Mark the beginning of data fetch
  updateStatus.isLoading = true;
  
  try {
    // ALWAYS fetch fresh data, ignore the cache for timeframe changes
    logWithTime('fetch', `Getting fresh data for timeframe: ${requestedTimeframe}`);
    
    // Bypass cache completely, get fresh data every time
    clearAPICache(); // Explicitly clear cache to force fresh data
    
    // Fetch fresh data from API
    return await fetchFreshData(requestedTimeframe);
  } catch (error: any) {
    // Handle errors
    logWithTime('error', 'Failed to get Bitcoin price:', error.message);
    updateStatus.hasError = true;
    updateStatus.errorMessage = error.message;
    lastUpdateTimestamp.error = Date.now();
    
    // Try multi-level fallbacks
    return await handleDataFetchError(requestedTimeframe, error);
  } finally {
    updateStatus.isLoading = false;
  }
};

/**
 * Fetch fresh data from API (used for both initial and background refresh)
 */
async function fetchFreshData(requestedTimeframe: TimeFrame): Promise<BitcoinPrice> {
  // ALWAYS use detailed endpoint for more accurate price data
  const endpoint = 'detailed';
  const fetchStart = Date.now();
  
  try {
    // Always use detailed data for ALL timeframes to get accurate price changes
    let data;
    if (false) { // Disabled simple endpoint completely
      // This code path is disabled, we never use the simple endpoint anymore
      
      // Validate and format simple price data
      if (!data?.bitcoin?.usd) {
        throw new Error('Invalid simple price data format');
      }
      
      // For 1D timeframe, we should get both price and percentage from CoinGecko
      // and calculate the dollar change properly
      const currentPrice = data.bitcoin.usd;
      const percentChange = data.bitcoin.usd_24h_change || 0;
      
      // Fallback to detailed API if 1D data isn't good
      if (Math.abs(percentChange) < 0.05) {
        logWithTime('fetch', 'Simple API returned minimal change, fetching detailed data instead');
        data = await fetchDetailedBitcoinData();
        
        if (!data?.market_data?.current_price?.usd) {
          throw new Error('Invalid detailed price data format');
        }
        
        updateApiCache({
          data,
          timestamp: Date.now(),
          endpoint: 'detailed',
          source: 'api',
          fetchTime: Date.now() - fetchStart
        });
        
        saveToLocalStorage('btc-price-detailed', data);
        
        const result = extractTimeframeData(data, requestedTimeframe);
        logWithTime('update', `Updated BTC price (detailed fallback): $${result.price.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%) - 24h change: $${result.change.toFixed(2)}`);
        lastUpdateTimestamp.dataUpdate = Date.now();
        
        return result;
      }
      
      // Use real data rather than trying to calculate
      // Calculate previous price correctly based on percentage
      const previousPrice = currentPrice / (1 + (percentChange / 100));
      const dollarChange = Math.abs(currentPrice - previousPrice);
      
      // For tracking
      if (process.env.NODE_ENV === 'development') {
        console.log('1D Calculation:', {
          currentPrice,
          previousPrice,
          percentChange,
          dollarChange,
          formula: `${currentPrice} / (1 + (${percentChange}/100)) = ${previousPrice}`
        });
      }
      
      // Create API-compatible structure with proper data
      const formattedData = {
        market_data: {
          current_price: { usd: currentPrice },
          price_change_percentage_24h: percentChange,
          price_change_24h_in_currency: { usd: dollarChange * (percentChange >= 0 ? 1 : -1) },
          total_volume: { usd: data.bitcoin.usd_24h_vol || 0 },
          last_updated_at: data.bitcoin.last_updated_at || Date.now() / 1000
        }
      };
      
      // Use the imported function to update cache
      updateApiCache({
        data: formattedData,
        timestamp: Date.now(),
        endpoint: 'simple',
        source: 'api',
        fetchTime: Date.now() - fetchStart
      });
      
      // Save to localStorage
      saveToLocalStorage('btc-price-simple', formattedData);
      
      // Format and return data
      const result = extractTimeframeData(formattedData, requestedTimeframe);
      logWithTime('update', `Updated BTC price (simple): $${result.price.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%) - 24h change: $${result.change.toFixed(2)}`);
      lastUpdateTimestamp.dataUpdate = Date.now();
      
      // Always log price changes in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[BTC API] Price update:', {
          timeframe: requestedTimeframe,
          price: result.price,
          change: result.change,
          percentChange: result.changePercent,
          direction: result.direction,
          timestamp: new Date().toISOString()
        });
      }
      
      // Reset error state
      updateStatus.hasError = false;
      updateStatus.errorMessage = '';
      
      return result;
    }
    
    // Always use detailed endpoint for all timeframes
    data = await fetchDetailedBitcoinData();
    
    // Validate data
    if (!data?.market_data?.current_price?.usd) {
      throw new Error('Invalid detailed price data format');
    }
    
    // Use the imported function to update cache
    updateApiCache({
      data,
      timestamp: Date.now(),
      endpoint: 'detailed',
      source: 'api',
      fetchTime: Date.now() - fetchStart
    });
    
    // Save to localStorage
    saveToLocalStorage('btc-price-detailed', data);
    
    // Format and return data
    const result = extractTimeframeData(data, requestedTimeframe);
    logWithTime('update', `Updated BTC price (detailed): $${result.price.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%) - change: $${result.change.toFixed(2)}`);
    lastUpdateTimestamp.dataUpdate = Date.now();
    
    // Always log price changes in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[BTC API] Detailed price update:', {
        timeframe: requestedTimeframe,
        price: result.price,
        change: result.change,
        percentChange: result.changePercent,
        direction: result.direction,
        timestamp: new Date().toISOString()
      });
    }
    
    // Reset error state
    updateStatus.hasError = false;
    updateStatus.errorMessage = '';
    
    return result;
  } catch (error) {
    throw error; // Let the calling function handle the error
  }
}

/**
 * Handle errors with multi-level fallbacks
 */
async function handleDataFetchError(requestedTimeframe: TimeFrame, originalError: Error): Promise<BitcoinPrice> {
  // 1. Try memory cache (even if expired)
  if (apiCache) {
    logWithTime('cache', 'Using expired cache as fallback');
    return extractTimeframeData(apiCache.data, requestedTimeframe);
  }
  
  // 2. Try localStorage cache
  const localStorageKey = requestedTimeframe === '1D' ? 'btc-price-simple' : 'btc-price-detailed';
  const localStorageData = loadFromLocalStorage(localStorageKey);
  if (localStorageData) {
    logWithTime('cache', 'Using localStorage data as fallback');
    return extractTimeframeData(localStorageData, requestedTimeframe);
  }
  
  // 3. Try blockchain.info API (alternative source)
  try {
    // Use the new blockchain ticker API
    logWithTime('fetch', 'Trying blockchain.info API as fallback');
    const response = await fetch('/api/blockchain/ticker', {
      headers: {
        'Accept': 'application/json',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      cache: 'no-store'
    });
    
    if (response.ok) {
      const blockchainData = await response.json();
      if (blockchainData?.bitcoin?.usd) {
        logWithTime('fetch', 'Using blockchain.info data as fallback');
        const price = blockchainData.bitcoin.usd;
        
        // Create minimal data structure using the available data
        const fallbackData = {
          market_data: {
            current_price: { usd: price },
            price_change_percentage_24h: blockchainData.bitcoin.usd_24h_change || 0,
            last_updated_at: blockchainData.bitcoin.last_updated_at || Math.floor(Date.now() / 1000)
          }
        };
        
        return extractTimeframeData(fallbackData, requestedTimeframe);
      }
    }
  } catch (blockchainError) {
    logWithTime('error', 'Blockchain.info API fallback failed:', blockchainError);
  }
  
  // 4. Error out - no hardcoded values and no Coinbase fallback
  logWithTime('error', 'All API sources failed');
  throw originalError;
}

/**
 * Non-blocking background refresh (for stale-while-revalidate pattern)
 */
async function refreshInBackground(timeframe: TimeFrame) {
  try {
    logWithTime('fetch', `Background refresh for ${timeframe} starting`);
    await fetchFreshData(timeframe);
    logWithTime('fetch', 'Background refresh completed successfully');
  } catch (error) {
    logWithTime('error', 'Background refresh failed:', error);
    // Don't throw - this is in the background
  }
}