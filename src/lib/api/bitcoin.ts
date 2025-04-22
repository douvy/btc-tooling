import { BitcoinPrice, TimeFrame } from '@/types';
import { extractTimeframeData } from '@/lib/priceUtils';
import { logWithTime } from './logger';
import { lastUpdateTimestamp, updateStatus, CACHE_LIFETIME } from './constants';
import { saveToLocalStorage, loadFromLocalStorage, getApiCache, updateApiCache } from './cache';
import { fetchDetailedBitcoinData, fetchSimpleBitcoinPrice } from './endpoints';

// High cache lifetime to avoid rate limits
const EXTENDED_CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes

// Enable verbose logging in development for debugging price calculations
const VERBOSE_LOGGING = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

async function fetchFreshData(timeframe: TimeFrame): Promise<BitcoinPrice> {
  // Always use detailed endpoint for all timeframes to get accurate fluctuations
  const fetchStart = Date.now();
  
  // Use CoinGecko as the primary source for reliable price data with ALL timeframes
  try {
    logWithTime('fetch', 'Using CoinGecko API for all timeframes');
    
    // Always fetch detailed data with all timeframes
    const data = await fetchDetailedBitcoinData();
    if (!data?.market_data?.current_price?.usd) throw new Error('Invalid data format');
    
    updateApiCache({
      data,
      timestamp: Date.now(),
      endpoint: 'detailed',
      source: 'api',
      fetchTime: Date.now() - fetchStart
    });
    
    saveToLocalStorage('btc-price-detailed', data);
    const result = extractTimeframeData(data, timeframe);
    
    // Enhanced logging for development
    if (VERBOSE_LOGGING) {
      logWithTime('update', `Updated BTC price (${timeframe}): $${result.price.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%) - change: $${result.change.toFixed(2)}`);
    } else {
      logWithTime('update', `Updated BTC price: $${result.price.toFixed(2)}`);
    }
    
    lastUpdateTimestamp.dataUpdate = Date.now();
    updateStatus.hasError = false;
    updateStatus.errorMessage = '';
    return result;
  } catch (error) {
    throw error;
  }
}

async function handleDataFetchError(timeframe: TimeFrame): Promise<BitcoinPrice> {
  // Try memory cache (even if expired)
  const cache = getApiCache();
  if (cache) {
    logWithTime('cache', 'Using expired cache');
    return extractTimeframeData(cache.data, timeframe);
  }
  
  // Try localStorage cache
  const key = timeframe === '1D' ? 'btc-price-simple' : 'btc-price-detailed';
  const localData = loadFromLocalStorage(key);
  if (localData) {
    logWithTime('cache', 'Using localStorage');
    return extractTimeframeData(localData, timeframe);
  }
  
  // Try CoinGecko simple price API as fallback
  try {
    logWithTime('fetch', 'Trying CoinGecko simple API fallback');
    
    // Use simple API which is less likely to be rate-limited
    const response = await fetch('/api/coingecko/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true', {
      headers: {
        'Accept': 'application/json',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      cache: 'no-store'
    });
    
    if (response.ok) {
      const simpleData = await response.json();
      if (simpleData?.bitcoin?.usd) {
        logWithTime('fetch', 'Using CoinGecko simple API data as fallback');
        const price = simpleData.bitcoin.usd;
        
        // Create basic data structure with the price and any available change data
        const fallbackData = {
          market_data: {
            current_price: { usd: price },
            price_change_percentage_24h: simpleData.bitcoin.usd_24h_change || 0,
            price_change_percentage_24h_in_currency: { usd: simpleData.bitcoin.usd_24h_change || 0 },
            last_updated_at: Math.floor(Date.now() / 1000)
          }
        };
        return extractTimeframeData(fallbackData, timeframe);
      }
    }
  } catch (error) {
    logWithTime('error', 'CoinGecko simple API fallback failed:', error);
  }
  
  throw new Error('Bitcoin price data unavailable');
}

function backgroundRefresh(timeframe: TimeFrame) {
  setTimeout(() => {
    fetchFreshData(timeframe).catch(e => logWithTime('error', 'Background refresh failed:', e));
  }, 0);
}

export const getBitcoinPrice = async (timeframe: TimeFrame = '1D'): Promise<BitcoinPrice> => {
  updateStatus.isLoading = true;
  
  try {
    const now = Date.now();
    const endpoint = timeframe === '1D' ? 'simple' : 'detailed';
    
    const cache = getApiCache();
    // Use extended cache lifetime to avoid rate limits
    if (cache && cache.timestamp + EXTENDED_CACHE_LIFETIME > now) {
      // Only trigger background refresh if the cache is more than 1 minute old
      // This significantly reduces API calls
      if (now - cache.timestamp > 60000) backgroundRefresh(timeframe);
      return extractTimeframeData(cache.data, timeframe);
    }
    
    return await fetchFreshData(timeframe);
  } catch (error: any) {
    logWithTime('error', 'Failed to get Bitcoin price:', error.message);
    updateStatus.hasError = true;
    updateStatus.errorMessage = error.message;
    lastUpdateTimestamp.error = Date.now();
    return await handleDataFetchError(timeframe);
  } finally {
    updateStatus.isLoading = false;
  }
};