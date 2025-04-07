import { logWithTime } from './logger';
import { lastUpdateTimestamp, updateStatus, REQUEST_TIMEOUT, MAX_RETRIES, RETRY_DELAY } from './constants';

/**
 * Enhanced fetch with retry, logging, and error handling
 */
export async function enhancedFetch(url: string, options: RequestInit, retryCount = 0): Promise<Response> {
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
    
    // Make the request
    const response = await fetch(urlWithCacheBust, options);
    
    // Update tracking
    lastUpdateTimestamp.apiCall = Date.now();
    updateStatus.lastStatus = response.status;
    
    // Log response details
    const fetchTime = Date.now() - fetchStart;
    logWithTime('fetch', `Response: ${response.status} (${fetchTime}ms)`);
    
    // Handle non-successful responses
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
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