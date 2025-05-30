/**
 * API Proxy for Bitcoin Ticker data - Direct from CoinGecko
 * This file now exclusively uses CoinGecko API, not blockchain.info
 */

import { 
  SERVERLESS_TIMEOUT, CACHE_CONTROL, handleOptions, setCorsHeaders, 
  forwardHeaders 
} from '../utils/proxyUtils';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  setCorsHeaders(res);
  
  // We're using a Demo API key which requires api.coingecko.com domain
  const targetUrl = 'https://api.coingecko.com/api/v3/coins/bitcoin';
  const logPrefix = '[CoinGecko Bitcoin Proxy]';
  
  // Log request with timestamp for debugging
  const timestamp = new Date().toISOString();
  console.log(`${logPrefix} [${timestamp}] Request: ${req.method} /api/blockchain/ticker`);
  
  // Extract timeframe if provided
  const timeframe = req.query.timeframe;
  
  // Get API key if available
  const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };
  
  // Add API key to headers as recommended by CoinGecko
  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }
  
  // Build the query parameters for CoinGecko
  const queryParams = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
    sparkline: 'false',
    include_market_cap: 'true',
    include_24hr_vol: 'true',
    include_24hr_change: 'true',
    include_last_updated_at: 'true',
    _t: Date.now().toString() // Cache buster
  });
  
  // IMPORTANT: API key needs to be in both header and URL for CoinGecko API
  if (apiKey) {
    // Use x_cg_demo_api_key for the Demo API
    queryParams.append('x_cg_demo_api_key', apiKey);
    console.log(`${logPrefix} Using CoinGecko Demo API key: ${apiKey.substring(0, 5)}...`);
  } else {
    console.warn(`${logPrefix} No CoinGecko API key found!`);
  }
  
  const fullUrl = `${targetUrl}?${queryParams.toString()}`;
  
  // DEBUGGING: Log the full URL to confirm API key is being included
  console.log(`${logPrefix} Full URL (with API key): ${fullUrl}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVERLESS_TIMEOUT);
    
    const fetchStart = Date.now();
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
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
    
    if (response.ok) {
      const cgData = await response.json();
      
      // Make sure we have valid data
      if (!cgData?.market_data?.current_price?.usd) {
        throw new Error('Invalid data format from CoinGecko');
      }
      
      const marketData = cgData.market_data;
      
      // Get the current price directly from CoinGecko
      const price = marketData.current_price.usd;
      console.log(`${logPrefix} CURRENT BITCOIN PRICE FROM COINGECKO (NOT BLOCKCHAIN.INFO): $${price.toFixed(2)}`);
      // Also log to the actual console output for easier debugging
      console.warn(`ACTUAL BITCOIN PRICE FROM COINGECKO: $${price.toFixed(2)}`);
      // Show in a way that's very visible for debugging
      console.log(`
      ===================================================
      🔴🔴🔴 CURRENT BITCOIN PRICE: $${price.toFixed(2)} 🔴🔴🔴
      ===================================================
      `);
      
      // Use the percentage changes already provided by CoinGecko
      const hourChange = marketData.price_change_percentage_1h_in_currency?.usd || 0;
      const dayChange = marketData.price_change_percentage_24h || marketData.price_change_percentage_24h_in_currency?.usd || 0;
      const weekChange = marketData.price_change_percentage_7d_in_currency?.usd || marketData.price_change_percentage_7d || 0;
      const monthChange = marketData.price_change_percentage_30d_in_currency?.usd || marketData.price_change_percentage_30d || 0;
      const yearChange = marketData.price_change_percentage_1y_in_currency?.usd || marketData.price_change_percentage_1y || 0;
      
      // Calculate dollar changes using the correct formula
      const hourBefore = price / (1 + (hourChange / 100));
      const dayBefore = price / (1 + (dayChange / 100));
      const weekBefore = price / (1 + (weekChange / 100));
      const monthBefore = price / (1 + (monthChange / 100));
      const yearBefore = price / (1 + (yearChange / 100));
      
      const hourDollarChange = price - hourBefore;
      const dayDollarChange = marketData.price_change_24h || (price - dayBefore);
      const weekDollarChange = price - weekBefore;
      const monthDollarChange = price - monthBefore;
      const yearDollarChange = price - yearBefore;
      
      // Calculate all-time change using $101 as the reference point
      const allTimeStartPrice = 101;
      const allTimeDollarChange = price - allTimeStartPrice;
      const allTimePercentChange = ((price - allTimeStartPrice) / allTimeStartPrice) * 100;
      
      // Log the percentage calculations for debugging
      console.log(`${logPrefix} Using COINGECKO data: 1H=${hourChange.toFixed(2)}%, 1D=${dayChange.toFixed(2)}%, 1W=${weekChange.toFixed(2)}%, 1M=${monthChange.toFixed(2)}%, 1Y=${yearChange.toFixed(2)}%`);
      
      // Create a response structure that matches what the rest of the app expects
      const transformedData = {
        bitcoin: {
          usd: price,
          usd_24h_change: dayChange,
          usd_24h_vol: marketData.total_volume?.usd || 0,
          last_updated_at: marketData.last_updated_at || Math.floor(Date.now() / 1000)
        },
        market_data: {
          current_price: { usd: price },
          
          // 24h data
          price_change_24h: dayDollarChange,
          price_change_percentage_24h: dayChange,
          price_change_percentage_24h_in_currency: { usd: dayChange },
          
          // Hourly changes
          price_change_percentage_1h: hourChange,
          price_change_percentage_1h_in_currency: { usd: hourChange },
          price_change_1h_in_currency: { usd: hourDollarChange },
          
          // Weekly changes
          price_change_percentage_7d: weekChange,
          price_change_percentage_7d_in_currency: { usd: weekChange },
          price_change_7d_in_currency: { usd: weekDollarChange },
          
          // Monthly changes
          price_change_percentage_30d: monthChange,
          price_change_percentage_30d_in_currency: { usd: monthChange },
          price_change_30d_in_currency: { usd: monthDollarChange },
          
          // Yearly changes
          price_change_percentage_1y: yearChange,
          price_change_percentage_1y_in_currency: { usd: yearChange },
          price_change_1y_in_currency: { usd: yearDollarChange },
          
          // All-time data
          price_change_all_time_in_currency: { usd: allTimeDollarChange },
          price_change_percentage_all_time_in_currency: { usd: allTimePercentChange },
          
          // Volume data
          total_volume: { usd: marketData.total_volume?.usd || 0 },
          last_updated_at: marketData.last_updated_at || Math.floor(Date.now() / 1000)
        }
      };
      
      console.log(`${logPrefix} Transformed data from CoinGecko format`);
      
      // Save to cache file for future use
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Create a cache object with timestamp
        const cacheData = {
          ...transformedData,
          timestamp: Date.now()
        };
        
        // Write to tmp directory which is writable in serverless environments
        const cachePath = path.join('/tmp', 'btc-price-cache.json');
        fs.writeFileSync(cachePath, JSON.stringify(cacheData));
        console.log(`${logPrefix} Cached data written to ${cachePath}`);
      } catch (fsError) {
        console.warn(`${logPrefix} Error writing cache file:`, fsError);
      }
      
      res.status(response.status);
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      res.json(transformedData);
    } else {
      // Handle error response
      const errorData = await response.text();
      
      // Try to extract the error message
      let errorMessage = `CoinGecko API error: ${response.status}`;
      try {
        const parsedError = JSON.parse(errorData);
        if (parsedError?.status?.error_message) {
          errorMessage = parsedError.status.error_message;
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      // If we're hitting rate limits, try to use cached data
      if (response.status === 429 || response.status === 403) {
        console.warn(`${logPrefix} Rate limited, looking for cached data`);
        
        try {
          // Try to load from server-side cache
          let cachedData = null;
          
          // Use a local file as cache since we're in a serverless environment
          try {
            const fs = require('fs');
            const path = require('path');
            
            // Try to read from the cache file in tmp
            const cachePath = path.join('/tmp', 'btc-price-cache.json');
            if (fs.existsSync(cachePath)) {
              const cacheContent = fs.readFileSync(cachePath, 'utf8');
              cachedData = JSON.parse(cacheContent);
              console.log(`${logPrefix} Found cache file, last updated: ${new Date(cachedData.timestamp || 0).toISOString()}`);
            }
          } catch (fsError) {
            console.warn(`${logPrefix} Error reading cache file:`, fsError);
          }
          
          // If cached data is available, use it
          if (cachedData?.market_data?.current_price?.usd) {
            console.log(`${logPrefix} Using cached data due to rate limiting`);
            
            // Update the timestamp
            cachedData.market_data.last_updated_at = Math.floor(Date.now() / 1000);
            
            // Return the cached data
            res.status(200);
            res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
            res.json(cachedData);
            return;
          }
        } catch (cacheError) {
          // Cache error handled silently
        }
      }
      
      // Fall back to error response
      res.status(response.status);
      res.setHeader('Cache-Control', CACHE_CONTROL.ERROR);
      res.json({
        error: true,
        message: errorMessage,
        status: response.status,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    const errorMessage = error.name === 'AbortError' ? 'Request timed out' : error.message;
    
    res.setHeader('Cache-Control', CACHE_CONTROL.ERROR);
    res.status(error.name === 'AbortError' ? 504 : 500).json({
      error: true,
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}