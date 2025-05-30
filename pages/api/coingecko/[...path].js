/**
 * API Proxy for CoinGecko
 */

import { 
  SERVERLESS_TIMEOUT, CACHE_CONTROL, handleOptions, setCorsHeaders, 
  buildQueryParams, forwardHeaders, createRateLimiter, checkRateLimit
} from '../utils/proxyUtils';

// Conservative rate limit: 10 requests/minute, 6 seconds between requests
// This is well below the 30 req/min limit to avoid any rate limit issues
const rateLimiter = createRateLimiter('coingecko', 10, 60000);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  setCorsHeaders(res);

  if (!checkRateLimit(rateLimiter, req, res)) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again in a minute',
      retryAfter: Math.ceil((rateLimiter.resetTime - Date.now()) / 1000)
    });
  }

  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  const debug = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  const logPrefix = '[CoinGecko Proxy]';
  
  if (debug || process.env.NODE_ENV === 'development') {
    console.log(`${logPrefix} Request: ${req.method} /api/coingecko/${apiPath}`);
  }
  
  // Track request in our rate monitor
  try {
    await fetch('/api/coingecko/check-rate', { method: 'GET' }).catch(() => {});
  } catch (e) {
    // Ignore errors
  }
  
  // We're using a Demo API key which requires api.coingecko.com domain
  const targetUrl = `https://api.coingecko.com/api/v3/${apiPath}`;
  
  // Build query string and add API key directly to the URL
  let queryParams = new URLSearchParams(buildQueryParams(req));
  
  // IMPORTANT: API key goes in both header and URL for CoinGecko Demo API
  if (apiKey) {
    // Add the API key to the query string with the correct parameter name
    queryParams.append('x_cg_demo_api_key', apiKey);
    console.log(`${logPrefix} Using CoinGecko Demo API key: ${apiKey.substring(0, 5)}...`);
  } else {
    console.warn(`${logPrefix} No CoinGecko API key found!`);
  }
  
  // Add cache busting parameter
  queryParams.append('_t', Date.now().toString());
  
  // Create the full URL with API key
  const fullUrl = `${targetUrl}?${queryParams.toString()}`;
  
  // DEBUGGING: Log the full URL to confirm API key is being included
  console.log(`${logPrefix} Full URL (with API key): ${fullUrl}`);
  
  // Set standard headers
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  // Add API key to headers as recommended by CoinGecko
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVERLESS_TIMEOUT);
    
    const fetchStart = Date.now();
    const response = await fetch(fullUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    const responseText = await response.text();
    
    if (debug || process.env.NODE_ENV === 'development') {
      console.log(`${logPrefix} Response: ${response.status} (${Date.now() - fetchStart}ms)`);
      
      // Check for rate limit headers to confirm if API key is working
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      const rateLimitTotal = response.headers.get('x-ratelimit-limit');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');
      
      if (rateLimitRemaining && rateLimitTotal) {
        console.log(`${logPrefix} Rate Limit: ${rateLimitRemaining}/${rateLimitTotal} remaining, reset in ${rateLimitReset || 'unknown'} seconds`);
        
        // Add warning if rate limit is getting low
        if (parseInt(rateLimitRemaining) < 5) {
          console.warn(`${logPrefix} ⚠️ WARNING: Rate limit getting low: ${rateLimitRemaining}/${rateLimitTotal} remaining!`);
        }
      } else {
        console.warn(`${logPrefix} No rate limit headers found - API key may not be working correctly!`);
        
        // Log all headers for debugging
        console.log(`${logPrefix} Response headers:`, Object.fromEntries([...response.headers.entries()]));
      }
      
      // Log first part of response for debugging
      if (responseText.length > 0) {
        try {
          // Try to parse as JSON and log the keys
          const responseData = JSON.parse(responseText);
          if (responseData.error) {
            console.error(`${logPrefix} API Error:`, responseData.error);
          } else if (responseData.status && responseData.status.error_code) {
            console.error(`${logPrefix} API Error:`, responseData.status.error_message);
          }
        } catch (e) {
          // If not JSON, log first part of response
          console.log(`${logPrefix} Response preview: ${responseText.substring(0, 100)}...`);
        }
      }
    }

    res.status(response.status);
    
    // Use extremely long cache times to reduce API calls (120 seconds for success, 30 seconds for errors)
    const cacheControl = response.ok 
      ? 'public, max-age=120, stale-while-revalidate=600' 
      : 'public, max-age=30, stale-while-revalidate=120';
    
    res.setHeader('Cache-Control', cacheControl);
    
    forwardHeaders(response, res, 'coingecko', [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ]);
    
    res.send(responseText);
    
  } catch (error) {
    const errorMessage = error.name === 'AbortError' ? 'Request timed out' : error.message;
    console.error(`${logPrefix} Error:`, errorMessage);
    
    res.setHeader('Cache-Control', CACHE_CONTROL.ERROR);
    res.status(error.name === 'AbortError' ? 504 : 500).json({
      error: true,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}