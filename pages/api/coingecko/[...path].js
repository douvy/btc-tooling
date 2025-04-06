/**
 * API Proxy for CoinGecko
 * Forwards requests to CoinGecko API with performance optimizations for Vercel
 * Includes proper error handling, CORS support, and caching.
 */

// Serverless function timeout (will abort requests after 9.5s to avoid Vercel's 10s limit)
const SERVERLESS_TIMEOUT = 9500;

// Cache TTL configuration (in seconds)
const CACHE_CONTROL = {
  DEFAULT: 'public, max-age=5, stale-while-revalidate=10',
  ERROR: 'no-cache, no-store, must-revalidate'
};

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 15, // Maximum requests per window (increased to allow for component updates)
  WINDOW_MS: 60000, // 1 minute window
  requestCounts: {}, // In-memory store for request counts
  resetTime: Date.now() + 60000 // Next reset time
};

// CORS headers for development environments
const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-cg-api-key'
};

export default async function handler(req, res) {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.status(200).send('OK');
    return;
  }

  // Set CORS headers for all responses
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Check rate limit (basic implementation for serverless)
  try {
    checkRateLimit(req, res);
  } catch (error) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again in a minute',
      retryAfter: Math.ceil((RATE_LIMIT.resetTime - Date.now()) / 1000)
    });
  }

  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  
  // Add detailed logging for debugging
  const debug = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  const logPrefix = '[CoinGecko Proxy]';
  
  if (debug || process.env.NODE_ENV === 'development') {
    console.log(`${logPrefix} Request: ${req.method} /api/coingecko/${apiPath}`);
    console.log(`${logPrefix} Query params:`, req.query);
    console.log(`${logPrefix} Using API key: ${apiKey ? 'Yes' : 'No'}`);
  }
  
  // Build target URL
  const targetUrl = `https://api.coingecko.com/api/v3/${apiPath}`;
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  Object.entries(req.query).forEach(([key, value]) => {
    if (key !== 'path') {
      queryParams.append(key, value);
    }
  });
  
  // Add cache-busting parameter for development
  if (process.env.NODE_ENV === 'development') {
    queryParams.append('_t', Date.now());
  }
  
  const fullUrl = `${targetUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  // Set up headers with complete set of requirements
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  // Add API key using the correct header format
  if (apiKey) {
    headers['x-cg-api-key'] = apiKey;
    if (debug) console.log(`${logPrefix} Added API key header`);
  } else if (process.env.NODE_ENV === 'production') {
    // In production, log missing API key to monitoring
    console.warn(`${logPrefix} Missing API key in production!`);
  }
  
  try {
    // Use AbortController to prevent serverless function timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVERLESS_TIMEOUT);
    
    // Forward the request with timeout protection
    const fetchStart = Date.now();
    const response = await fetch(fullUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
      cache: 'no-store', // Prevent browser caching
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    const fetchTime = Date.now() - fetchStart;
    
    // Get response body
    const responseText = await response.text();
    
    // Log performance metrics
    if (debug || process.env.NODE_ENV === 'development') {
      console.log(`${logPrefix} Response: ${response.status} (${fetchTime}ms)`);
      console.log(`${logPrefix} Headers:`, Object.fromEntries([...response.headers.entries()]));
    }

    // Log rate limit headers from CoinGecko if present (important for debugging)
    const cgRateLimit = response.headers.get('x-ratelimit-limit');
    const cgRateRemaining = response.headers.get('x-ratelimit-remaining');
    if (cgRateLimit && cgRateRemaining && (debug || process.env.NODE_ENV === 'development')) {
      console.log(`${logPrefix} CoinGecko Rate Limit: ${cgRateRemaining}/${cgRateLimit} remaining`);
    }
    
    // Set response status
    res.status(response.status);
    
    // Set Cache-Control header based on response status
    const cacheControl = response.ok ? CACHE_CONTROL.DEFAULT : CACHE_CONTROL.ERROR;
    res.setHeader('Cache-Control', cacheControl);
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Forward important headers from original response
    forwardHeaders(response, res);
    
    // Send the response
    res.send(responseText);
    
  } catch (error) {
    const errorMessage = error.name === 'AbortError' 
      ? 'Request timed out' 
      : error.message;
      
    console.error(`${logPrefix} Error:`, errorMessage);
    
    // Set appropriate status code
    const statusCode = error.name === 'AbortError' ? 504 : 500;
    
    // No caching for errors
    res.setHeader('Cache-Control', CACHE_CONTROL.ERROR);
    
    // Return error response
    res.status(statusCode).json({
      error: true,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Forward important headers from the API response to our response
 */
function forwardHeaders(sourceRes, destRes) {
  const headersToForward = [
    'content-type',
    'etag',
    'last-modified',
    'vary',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
  ];
  
  headersToForward.forEach(header => {
    const value = sourceRes.headers.get(header);
    if (value) {
      destRes.setHeader(header, value);
    }
  });
  
  // Add custom headers
  destRes.setHeader('X-Proxy-Time', new Date().toISOString());
  destRes.setHeader('X-Proxy-Source', 'coingecko');
}

/**
 * Enhanced rate limiting implementation
 * Note: This is a simple in-memory implementation that works for moderate traffic
 * For high-traffic sites, use a more robust solution like Redis
 */
function checkRateLimit(req, res) {
  // Reset counts if window has passed
  const now = Date.now();
  if (now > RATE_LIMIT.resetTime) {
    RATE_LIMIT.requestCounts = {};
    RATE_LIMIT.resetTime = now + RATE_LIMIT.WINDOW_MS;
  }
  
  // Get client identifier (IP or API key)
  const clientId = req.headers['x-forwarded-for'] || 
                   req.socket.remoteAddress || 
                   'unknown';
  
  // Initialize or increment request count
  RATE_LIMIT.requestCounts[clientId] = (RATE_LIMIT.requestCounts[clientId] || 0) + 1;
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT.MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', 
    Math.max(0, RATE_LIMIT.MAX_REQUESTS - RATE_LIMIT.requestCounts[clientId]));
  res.setHeader('X-RateLimit-Reset', 
    Math.ceil(RATE_LIMIT.resetTime / 1000));
  
  // Check if rate limit exceeded
  if (RATE_LIMIT.requestCounts[clientId] > RATE_LIMIT.MAX_REQUESTS) {
    throw new Error('Rate limit exceeded');
  }
}