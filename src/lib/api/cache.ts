import { logWithTime } from './logger';

/**
 * Cache mechanism with metadata for diagnostics
 */
export interface PriceCache {
  data: any;
  timestamp: number;
  endpoint: string;
  source: 'api' | 'localStorage' | 'fallback';
  fetchTime: number;
}

// Cache with 3-second lifetime for frequent updates
// Use a variable that TypeScript knows is mutable
let _apiCache: PriceCache | null = null;

// Getter function to access the cache
export function getApiCache(): PriceCache | null {
  return _apiCache;
}

// Setter function to update the cache
export function updateApiCache(cache: PriceCache): void {
  _apiCache = cache;
}

/**
 * Save to localStorage for offline/error fallback
 */
export function saveToLocalStorage(key: string, data: any) {
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
export function loadFromLocalStorage(key: string): any | null {
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
          logWithTime('cache', 'localStorage data too old:', key);
        }
      }
    }
  } catch (error) {
    logWithTime('error', 'Failed to load from localStorage:', error);
  }
  return null;
}