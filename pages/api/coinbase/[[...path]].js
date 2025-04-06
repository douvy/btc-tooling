/**
 * API Proxy for Coinbase (Fallback)
 * Forwards requests to Coinbase API with Vercel serverless optimizations
 * Includes CORS support, error handling, and proper caching
 */

// Serverless function timeout (will abort requests after 9.5s to avoid Vercel's 10s limit)
const SERVERLESS_TIMEOUT = 9500;

// Cache TTL configuration (in seconds)
const CACHE_CONTROL = {
  DEFAULT: 'public, max-age=5, stale-while-revalidate=10',
  ERROR: 'no-cache, no-store, must-revalidate'
};

// Default path for Bitcoin price
const DEFAULT_PATH = 'prices/BTC-USD/spot';

// CORS headers for development environments
const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
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

  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path || DEFAULT_PATH;
  
  // Add detailed logging for debugging
  const debug = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  const logPrefix = '[Coinbase Proxy]';
  
  if (debug || process.env.NODE_ENV === 'development') {
    console.log(`${logPrefix} Request: ${req.method} /api/coinbase/${apiPath}`);
    console.log(`${logPrefix} Query params:`, req.query);
  }
  
  // Build target URL
  const targetUrl = `https://api.coinbase.com/v2/${apiPath}`;
  
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
  
  // Set up headers with Coinbase API version and no-cache directives
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'CB-VERSION': '2023-12-21', // Coinbase API version
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
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
    
    // Set response status
    res.status(response.status);
    
    // Set Cache-Control header based on response status
    const cacheControl = response.ok ? CACHE_CONTROL.DEFAULT : CACHE_CONTROL.ERROR;
    res.setHeader('Cache-Control', cacheControl);
    
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Forward important headers from original response
    forwardHeaders(response, res);
    
    // Process the response to normalize format for our application if needed
    let processedData = responseText;
    
    if (response.ok && apiPath === DEFAULT_PATH) {
      try {
        // Try to parse the response to format it for consistency with CoinGecko
        const data = JSON.parse(responseText);
        
        // Only modify if it matches expected Coinbase structure
        if (data?.data?.amount) {
          // Create a structure compatible with our app logic
          const compatibleResponse = {
            bitcoin: {
              usd: parseFloat(data.data.amount),
              usd_24h_change: 0, // Coinbase doesn't provide this in the basic endpoint
              last_updated_at: Math.floor(Date.now() / 1000)
            }
          };
          
          // Update the response to use our compatible format
          processedData = JSON.stringify(compatibleResponse);
          res.setHeader('Content-Type', 'application/json');
          
          if (debug) {
            console.log(`${logPrefix} Normalized response format for application compatibility`);
          }
        }
      } catch (err) {
        // If there's an error in the transform, just use the original response
        if (debug) {
          console.error(`${logPrefix} Error normalizing response:`, err);
        }
      }
    }
    
    // Send the response
    res.send(processedData);
    
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
      timestamp: new Date().toISOString(),
      fallback: true
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
    'cb-after',
    'cb-before'
  ];
  
  headersToForward.forEach(header => {
    const value = sourceRes.headers.get(header);
    if (value) {
      destRes.setHeader(header, value);
    }
  });
  
  // Add custom headers
  destRes.setHeader('X-Proxy-Time', new Date().toISOString());
  destRes.setHeader('X-Proxy-Source', 'coinbase');
  destRes.setHeader('X-Proxy-Type', 'fallback');
}