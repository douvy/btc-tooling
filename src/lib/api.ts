import { BitcoinPrice, TimeFrame } from '@/types';
import { extractTimeframeData } from '@/lib/priceUtils';

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

// Cache with 3-second lifetime for frequent updates
let apiCache: PriceCache | null = null;
const CACHE_LIFETIME = 3000; // 3 seconds

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
    // Force no caching
    options.cache = 'no-store';
    options.signal = signal;
    
    // Add unique query param to bust any caching
    const bustCache = `_t=${Date.now()}`;
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
 * Fetch from Coinbase API through our proxy as fallback
 */
async function fetchFromCoinbase(): Promise<any> {
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
async function fetchDetailedBitcoinData(): Promise<any> {
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
 * Main function to get Bitcoin price with stale-while-revalidate pattern
 */
export const getBitcoinPrice = async (requestedTimeframe: TimeFrame = '1D'): Promise<BitcoinPrice> => {
  // Mark the beginning of data fetch
  updateStatus.isLoading = true;
  
  try {
    const now = Date.now();
    const endpoint = requestedTimeframe === '1D' ? 'simple' : 'detailed';
    
    // PART 1: Check cache first for immediate response (stale data)
    if (apiCache && apiCache.timestamp + CACHE_LIFETIME > now && apiCache.endpoint === endpoint) {
      logWithTime('cache', `Using cached data (${((now - apiCache.timestamp) / 1000).toFixed(1)}s old)`);
      
      // Return data immediately, but start background refresh if cache is older than 1 second
      if (now - apiCache.timestamp > 1000) {
        logWithTime('update', 'Starting background refresh of older data');
        // Use setTimeout to make this non-blocking
        setTimeout(() => refreshInBackground(requestedTimeframe), 0);
      }
      
      // Return cached data immediately
      return extractTimeframeData(apiCache.data, requestedTimeframe);
    }
    
    // PART 2: No valid cache, get fresh data
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
  const endpoint = requestedTimeframe === '1D' ? 'simple' : 'detailed';
  const fetchStart = Date.now();
  
  try {
    // Choose appropriate endpoint based on timeframe
    let data;
    if (requestedTimeframe === '1D') {
      data = await fetchSimpleBitcoinPrice();
      
      // Validate and format simple price data
      if (!data?.bitcoin?.usd) {
        throw new Error('Invalid simple price data format');
      }
      
      // Create API-compatible structure
      const formattedData = {
        market_data: {
          current_price: { usd: data.bitcoin.usd },
          price_change_percentage_24h: data.bitcoin.usd_24h_change || 0,
          total_volume: { usd: data.bitcoin.usd_24h_vol || 0 },
          last_updated_at: data.bitcoin.last_updated_at || Date.now() / 1000
        }
      };
      
      // Update cache
      apiCache = {
        data: formattedData,
        timestamp: Date.now(),
        endpoint: 'simple',
        source: 'api',
        fetchTime: Date.now() - fetchStart
      };
      
      // Save to localStorage
      saveToLocalStorage('btc-price-simple', formattedData);
      
      // Format and return data
      const result = extractTimeframeData(formattedData, requestedTimeframe);
      logWithTime('update', `Updated BTC price (simple): $${result.price.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%) - 24h change: $${result.change.toFixed(2)}`);
      lastUpdateTimestamp.dataUpdate = Date.now();
      
      // Reset error state
      updateStatus.hasError = false;
      updateStatus.errorMessage = '';
      
      return result;
    }
    
    // For other timeframes, use detailed endpoint
    data = await fetchDetailedBitcoinData();
    
    // Validate data
    if (!data?.market_data?.current_price?.usd) {
      throw new Error('Invalid detailed price data format');
    }
    
    // Update cache
    apiCache = {
      data,
      timestamp: Date.now(),
      endpoint: 'detailed',
      source: 'api',
      fetchTime: Date.now() - fetchStart
    };
    
    // Save to localStorage
    saveToLocalStorage('btc-price-detailed', data);
    
    // Format and return data
    const result = extractTimeframeData(data, requestedTimeframe);
    logWithTime('update', `Updated BTC price (detailed): $${result.price.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%) - change: $${result.change.toFixed(2)}`);
    lastUpdateTimestamp.dataUpdate = Date.now();
    
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
  
  // 3. Try Coinbase API (alternative source)
  try {
    const coinbaseData = await fetchFromCoinbase();
    if (coinbaseData?.data?.amount) {
      logWithTime('fetch', 'Using Coinbase data as fallback');
      const price = parseFloat(coinbaseData.data.amount);
      
      // Create minimal data structure
      const fallbackData = {
        market_data: {
          current_price: { usd: price },
          price_change_percentage_24h: 0 // No historical data
        }
      };
      
      return extractTimeframeData(fallbackData, requestedTimeframe);
    }
  } catch (fallbackError) {
    logWithTime('error', 'All API fallbacks failed');
  }
  
  // 4. Return static fallback as last resort
  logWithTime('error', 'Using static fallback data');
  return {
    price: 82151, // Current approximate price 
    change: 450.83, // Calculated correctly for 0.55% change
    changePercent: 0.55,
    direction: 'up'
  };
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