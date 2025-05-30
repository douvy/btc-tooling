import { BitcoinPrice, TimeFrame } from '@/types';
import { extractTimeframeData } from '@/lib/priceUtils';
import { logWithTime } from './logger';
import { lastUpdateTimestamp, updateStatus, CACHE_LIFETIME } from './constants';
import { saveToLocalStorage, loadFromLocalStorage, getApiCache, updateApiCache } from './cache';
import { fetchDetailedBitcoinData, fetchSimpleBitcoinPrice } from './endpoints';

// CoinGecko API has a limit of 30 requests/minute
// Setting polling to 60 seconds to stay safely under the limit
const POLLING_INTERVAL = 60000;

// Cache lifetime (slightly longer than polling to ensure overlap)
const EXTENDED_CACHE_LIFETIME = 7000;

// Enable verbose logging in development for debugging price calculations
const VERBOSE_LOGGING = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

// Keep track of the polling state
let pollingTimer: NodeJS.Timeout | null = null;
let fetchPromise: Promise<any> | null = null;
let lastFetchTime = 0;
let cachedData: any = null;

/**
 * Start the polling for Bitcoin price data
 * This ensures we always have fresh data available
 */
export function startBitcoinPricePolling(): void {
  // Polling has been disabled to reduce API calls
  logWithTime('debug', 'Bitcoin price polling disabled to reduce API calls');
  return;
  
  // The rest of this function is commented out to prevent it from running
  /*
  // Clear any existing timer
  if (pollingTimer) {
    clearInterval(pollingTimer);
  }
  
  // Set up regular polling
  pollingTimer = setInterval(async () => {
    try {
      await fetchFreshData();
    } catch (error) {
      logWithTime('error', 'Bitcoin price polling error:', error);
    }
  }, POLLING_INTERVAL);
  
  // Use a delayed start to avoid rate limiting on page load
  setTimeout(() => {
    fetchFreshData().catch(error => {
      logWithTime('error', 'Initial Bitcoin price fetch error:', error);
    });
  }, 500);
  
  logWithTime('debug', `Bitcoin price polling started (every ${POLLING_INTERVAL/1000}s)`);
  */
}

/**
 * Stop the polling for Bitcoin price data
 */
export function stopBitcoinPricePolling(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    logWithTime('debug', 'Bitcoin price polling stopped');
  }
}

/**
 * Fetch fresh Bitcoin price data with smart caching
 */
async function fetchFreshData(forceRefresh = false): Promise<any> {
  const now = Date.now();
  
  // If we have a recent fetch in progress, wait for it instead of starting a new one
  if (fetchPromise && now - lastFetchTime < CACHE_LIFETIME && !forceRefresh) {
    return fetchPromise;
  }
  
  // Update last fetch time and create a new fetch promise
  lastFetchTime = now;
  
  // Execute the fetch with proper error handling
  fetchPromise = (async () => {
    try {
      const fetchStart = Date.now();
      
      // Check if we're in development mode and want to use mock data to avoid rate limits
      if (process.env.NODE_ENV === 'development') {
        console.log('DEVELOPMENT MODE: Using mock data to avoid rate limits');
        
        // Import the mock data generator
        const { getMockMarketData } = require('@/lib/mockBitcoinData');
        
        // Get mathematically accurate mock data
        const mockData = getMockMarketData();
        
        // Return the mock data
        return mockData;
      }
      
      // In production, fetch real data from CoinGecko
      const data = await fetchDetailedBitcoinData();
      
      if (!data?.market_data?.current_price?.usd) {
        throw new Error('Invalid data format from CoinGecko');
      }
      
      // Update our cache
      cachedData = data;
      
      // Store in localStorage for offline/error recovery
      saveToLocalStorage('btc-price-data', data);
      
      // Update API cache as well
      updateApiCache({
        data,
        timestamp: Date.now(),
        endpoint: 'detailed',
        source: 'api',
        fetchTime: Date.now() - fetchStart
      });
      
      // Update status indicators
      lastUpdateTimestamp.dataUpdate = Date.now();
      updateStatus.hasError = false;
      updateStatus.errorMessage = '';
      
      // Log the fetch time and current price for monitoring
      const fetchTime = Date.now() - fetchStart;
      const currentPrice = data.market_data.current_price.usd;
      
      if (VERBOSE_LOGGING) {
        logWithTime('fetch', `Fetched Bitcoin price: $${currentPrice.toFixed(2)} in ${fetchTime}ms`);
      }
      
      return data;
    } catch (error: any) {
      updateStatus.hasError = true;
      updateStatus.errorMessage = error.message;
      lastUpdateTimestamp.error = Date.now();
      
      logWithTime('error', 'Failed to fetch Bitcoin data:', error.message);
      
      // Try to use cached data as fallback
      const cache = getApiCache();
      if (cache?.data) {
        logWithTime('cache', 'Using API cache as fallback');
        return cache.data;
      }
      
      // Try localStorage as last resort
      const localData = loadFromLocalStorage('btc-price-data');
      if (localData) {
        logWithTime('cache', 'Using localStorage data as fallback');
        return localData;
      }
      
      // Re-throw the error if we have no fallback
      throw error;
    }
  })();
  
  return fetchPromise;
}

/**
 * Get Bitcoin price data for a specific timeframe
 * Uses the cached data with regular polling for fresh updates
 */
export const getBitcoinPrice = async (timeframe: TimeFrame = '1D'): Promise<BitcoinPrice> => {
  updateStatus.isLoading = true;
  
  try {
    // Ensure polling is active
    if (!pollingTimer) {
      startBitcoinPricePolling();
    }
    
    // Get the latest data (either from cache or fresh fetch)
    const data = await fetchFreshData();
    
    // Extract the timeframe-specific data
    const result = extractTimeframeData(data, timeframe);
    
    // Enhanced logging for development
    if (VERBOSE_LOGGING) {
      logWithTime('update', `Bitcoin price (${timeframe}): $${result.price.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%) - change: $${result.change.toFixed(2)}`);
    }
    
    return result;
  } catch (error: any) {
    logWithTime('error', 'Failed to get Bitcoin price:', error.message);
    updateStatus.hasError = true;
    updateStatus.errorMessage = error.message;
    lastUpdateTimestamp.error = Date.now();
    
    // Use any available cached data
    if (cachedData) {
      return extractTimeframeData(cachedData, timeframe);
    }
    
    // Create a reasonable fallback value
    return {
      price: 50000, // Reasonable fallback price
      change: 1500,
      changePercent: 3.0,
      direction: 'up',
      timeframe
    };
  } finally {
    updateStatus.isLoading = false;
  }
};