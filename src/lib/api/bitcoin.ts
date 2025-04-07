import { BitcoinPrice, TimeFrame } from '@/types';
import { extractTimeframeData } from '@/lib/priceUtils';
import { logWithTime } from './logger';
import { lastUpdateTimestamp, updateStatus, CACHE_LIFETIME } from './constants';
import { saveToLocalStorage, loadFromLocalStorage, getApiCache, updateApiCache } from './cache';
import { fetchDetailedBitcoinData, fetchSimpleBitcoinPrice, fetchFromCoinbase } from './endpoints';

async function fetchFreshData(timeframe: TimeFrame): Promise<BitcoinPrice> {
  const isSimpleEndpoint = timeframe === '1D';
  const fetchStart = Date.now();
  
  try {
    if (isSimpleEndpoint) {
      const data = await fetchSimpleBitcoinPrice();
      if (!data?.bitcoin?.usd) throw new Error('Invalid data format');
      
      const formattedData = {
        market_data: {
          current_price: { usd: data.bitcoin.usd },
          price_change_percentage_24h: data.bitcoin.usd_24h_change || 0,
          total_volume: { usd: data.bitcoin.usd_24h_vol || 0 },
          last_updated_at: data.bitcoin.last_updated_at || Date.now() / 1000
        }
      };
      
      updateApiCache({
        data: formattedData,
        timestamp: Date.now(),
        endpoint: 'simple',
        source: 'api',
        fetchTime: Date.now() - fetchStart
      });
      
      saveToLocalStorage('btc-price-simple', formattedData);
      const result = extractTimeframeData(formattedData, timeframe);
      logWithTime('update', `Updated BTC price: $${result.price.toFixed(2)}`);
      lastUpdateTimestamp.dataUpdate = Date.now();
      updateStatus.hasError = false;
      updateStatus.errorMessage = '';
      return result;
    }
    
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
    logWithTime('update', `Updated BTC price: $${result.price.toFixed(2)}`);
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
  
  // Try Coinbase API
  try {
    const coinbaseData = await fetchFromCoinbase();
    if (coinbaseData?.data?.amount) {
      logWithTime('fetch', 'Using Coinbase fallback');
      const price = parseFloat(coinbaseData.data.amount);
      const fallbackData = {
        market_data: {
          current_price: { usd: price },
          price_change_percentage_24h: 0
        }
      };
      return extractTimeframeData(fallbackData, timeframe);
    }
  } catch {}
  
  // Return static fallback
  logWithTime('error', 'Using static fallback');
  return {
    price: 82151, 
    change: 450.83,
    changePercent: 0.55,
    direction: 'up'
  };
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
    if (cache && cache.timestamp + CACHE_LIFETIME > now && cache.endpoint === endpoint) {
      if (now - cache.timestamp > 1000) backgroundRefresh(timeframe);
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