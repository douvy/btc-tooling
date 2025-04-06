/**
 * API Proxy for CoinGecko
 */

import { 
  SERVERLESS_TIMEOUT, CACHE_CONTROL, handleOptions, setCorsHeaders, 
  buildQueryParams, forwardHeaders, createRateLimiter, checkRateLimit
} from '../utils/proxyUtils';

const rateLimiter = createRateLimiter('coingecko', 15, 60000);

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
  
  const targetUrl = `https://api.coingecko.com/api/v3/${apiPath}`;
  const queryString = buildQueryParams(req);
  const fullUrl = `${targetUrl}${queryString ? `?${queryString}` : ''}`;
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  if (apiKey) headers['x-cg-api-key'] = apiKey;
  
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
    }

    res.status(response.status);
    res.setHeader('Cache-Control', response.ok ? CACHE_CONTROL.DEFAULT : CACHE_CONTROL.ERROR);
    
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