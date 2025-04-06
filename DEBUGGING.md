# Bitcoin Price Tracker Debugging Guide

## Current Issues

- **Inaccurate BTC Price**: The application is displaying approximately $69,524 for the Bitcoin price when the current market price is around $82,151. This discrepancy of over $12,000 indicates a fundamental data issue either in API fetching, data parsing, or display logic.

- **Inconsistent 5-Second Updates**: Although configured to refresh price data every 5 seconds (via `REFRESH_INTERVAL = 5000`), the actual updates are sporadic and unreliable. This is likely due to issues with the update mechanism in `useTimeframe.ts`, including potential problems with the timer implementation, page visibility handling, or ineffective cleanup.

- **Incorrect Price Fluctuations**: The timeframe selectors (1H, 1D, 1W, 1M, 1Y, ALL) are showing inaccurate dollar changes and percentage fluctuations. The dollar change values are calculated incorrectly, not properly deriving previous price from current price and percentage change.

- **Data Bugs During Price Updates**: Price animations and direction indicators (up/down arrows) sometimes show incorrect transitions. The state management during price updates has race conditions causing jumps in data, especially during timeframe switching.

## Implementation Details

- **Next.js with API Routes**: The application uses Next.js 15 with the Pages Router structure. API routes are implemented in the `/pages/api/` directory, providing proxy endpoints to external cryptocurrency APIs. These routes handle request forwarding, error handling, and response caching.

- **Custom `useTimeframe` Hook**: A central custom hook (`useTimeframe.ts`) manages all Bitcoin price data fetching, timeframe selection, and update scheduling. This hook implements state management for the current price, historical data caching across timeframes, loading states, and error handling.

- **CoinGecko API Integration**: The application uses CoinGecko's premium API which requires authentication via the `x-cg-api-key` header. The API provides current BTC price along with percentage changes across various timeframes (1h, 24h, 7d, 30d, 1y). Responses are structured with nested objects containing price and market data.

- **Stale-While-Revalidate Pattern**: A 3-second cache is implemented for API responses to improve performance and reduce API calls. This follows the stale-while-revalidate pattern, where cached data is immediately returned while fresh data is fetched in the background to update the cache.

- **Multiple Fallback Mechanisms**: The application implements a multi-level fallback system:
  1. In-memory cache (primary, 3-second lifetime)
  2. localStorage persistence (secondary, 10-minute lifetime)
  3. Coinbase API (tertiary API source)
  4. Static fallback data (final safety net)

## Debugging To-Do List

### 1. API Proxy Routes

- **Verify API Route Implementation**: Ensure `/pages/api/coingecko/[...path].js` and `/pages/api/coinbase/[[...path]].js` are correctly implemented:
  ```javascript
  // Check path parameter handling
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  // Verify URL construction
  const targetUrl = `https://api.coingecko.com/api/v3/${apiPath}`;
  ```

- **Check Header Forwarding**: Confirm all required headers are correctly forwarded:
  ```javascript
  // Headers must include:
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  // API key must be added if available:
  if (apiKey) {
    headers['x-cg-api-key'] = apiKey;
  }
  ```

- **Test API Routes Directly**: Use browser network tab or tools like Postman/curl to test the API routes:
  ```bash
  # Test CoinGecko proxy
  curl "http://localhost:3000/api/coingecko/simple/price?ids=bitcoin&vs_currencies=usd&include_24h_change=true"
  
  # Test Coinbase fallback
  curl "http://localhost:3000/api/coinbase/prices/BTC-USD/spot"
  ```

- **Debug Response Format**: Add console logging to verify API response formats:
  ```javascript
  console.log('CoinGecko Response:', JSON.stringify(data, null, 2));
  ```

### 2. Timeframe Data Mapping

- **Verify API Field Mapping**: Ensure correct field extraction from API responses for each timeframe:
  ```javascript
  switch (timeframe) {
    case '1H':
      // For 1-hour data, use the hourly currency data
      changePercent = 
        marketData.price_change_percentage_1h_in_currency?.usd !== undefined
        ? marketData.price_change_percentage_1h_in_currency.usd
        : 0;
      break;
    case '1D':
      // For 24-hour data
      changePercent = marketData.price_change_percentage_24h || 0;
      break;
    case '1W':
      // For 7-day data
      changePercent = marketData.price_change_percentage_7d || 0;
      break;
    case '1M':
      // For 30-day data
      changePercent = marketData.price_change_percentage_30d || 0;
      break;
    case '1Y':
      // For 1-year data
      changePercent = marketData.price_change_percentage_1y || 0;
      break;
    case 'ALL':
      // ALL time (use longest available timeframe)
      changePercent = 
        marketData.ath_change_percentage?.usd ||
        marketData.price_change_percentage_1y || 
        marketData.price_change_percentage_200d || 
        100; // Default to 100% if no historical data available
      break;
    default:
      // Default to 24h
      changePercent = marketData.price_change_percentage_24h || 0;
  }
  ```

- **Test Each Timeframe**: Add logging to verify correct data mapping for each timeframe:
  ```javascript
  console.log(`[${timeframe}] Raw API data:`, {
    price: marketData.current_price.usd,
    changeField: `price_change_percentage_${timeframeMapping[timeframe]}`,
    changeValue: changePercent,
    direction: changePercent >= 0 ? 'up' : 'down'
  });
  ```

### 3. Dollar Change Calculation

- **Fix Calculation Formula**: Implement the correct dollar change calculation formula:
  ```javascript
  export function calculateDollarChange(currentPrice: number, percentChange: number): number {
    if (percentChange === 0) return 0;
    
    // Calculate the previous price based on the correct formula
    const previousPrice = currentPrice / (1 + (percentChange / 100));
    
    // Calculate the absolute dollar change
    const dollarChange = Math.abs(currentPrice - previousPrice);
    
    // For debugging
    console.log('Dollar change calculation:', {
      currentPrice: currentPrice.toFixed(2),
      percentChange: percentChange.toFixed(2) + '%',
      previousPrice: previousPrice.toFixed(2),
      formula: `${currentPrice} / (1 + (${percentChange}/100)) = ${previousPrice}`,
      dollarChange: dollarChange.toFixed(2)
    });
    
    return dollarChange;
  }
  ```

- **Verify Calculation Results**: Test the function with known values:
  ```javascript
  // Example: BTC at $82,151 with 0.5% increase
  // Previous price should be $81,741.29
  // Dollar change should be $409.71
  const testPrice = 82151;
  const testPercent = 0.5;
  const dollarChange = calculateDollarChange(testPrice, testPercent);
  console.log(`Test: ${testPrice} with ${testPercent}% change = $${dollarChange.toFixed(2)}`);
  ```

### 4. Update Mechanism

- **Fix `useTimeframe` Hook Timer**: Replace the unreliable interval with a recursive timeout pattern:
  ```javascript
  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;
    
    // Recursive timer function for precise intervals
    const scheduleNextFetch = () => {
      // Clear any existing timer
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      
      // Schedule the next fetch
      timerIdRef.current = setTimeout(() => {
        // Only fetch if page is visible
        if (document.visibilityState === 'visible' && isMountedRef.current) {
          fetchBitcoinData()
            .finally(() => {
              // Schedule next update only after current one completes
              if (isMountedRef.current) {
                scheduleNextFetch();
              }
            });
        } else {
          // If page is hidden, just reschedule without fetching
          scheduleNextFetch();
        }
      }, REFRESH_INTERVAL);
    };
    
    // Initial fetch and start the cycle
    fetchBitcoinData(true).finally(() => {
      if (isMountedRef.current) {
        scheduleNextFetch();
      }
    });

    // Clean up properly on unmount
    return () => {
      isMountedRef.current = false;
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchBitcoinData]);
  ```

- **Add Performance Time Logging**: Track actual refresh intervals:
  ```javascript
  // Inside fetchBitcoinData function
  const fetchStart = performance.now();
  const data = await getBitcoinPrice(timeframe);
  const fetchDuration = Math.round(performance.now() - fetchStart);
  
  console.log(`Fetch complete in ${fetchDuration}ms`, {
    timeframe,
    price: data.price,
    change: data.change,
    timeSinceLastFetch: Date.now() - lastFetchTimeRef.current
  });
  
  // Update timestamp for next interval calculation
  lastFetchTimeRef.current = Date.now();
  ```

### 5. Performance Testing

- **Test Under Tab Switching**: Verify that updates continue properly when the browser tab is switched away and back:
  1. Open the application in a browser tab
  2. Switch to another tab for 15-20 seconds
  3. Return to the application
  4. Check if price updates resume immediately

- **Test Rapid Timeframe Switching**: Verify that switching between timeframes doesn't cause data inconsistencies:
  1. Switch from 1D → 1H → 1W → 1M → 1Y → ALL rapidly
  2. Check for any UI glitches, incorrect data displays, or state errors
  3. Verify that each timeframe shows appropriate data after switching

- **Memory Usage Monitoring**: 
  1. Open Chrome DevTools → Performance tab
  2. Record performance for 2 minutes during active usage
  3. Check for memory leaks (continuously increasing memory usage)
  4. Verify that garbage collection works properly

## API References

- **CoinGecko API Documentation**: https://docs.coingecko.com/v3.0.1/reference/introduction

- **Key Endpoints Used**:
  - `/simple/price`: Used for basic price data (1D timeframe)
    ```
    https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24h_change=true
    ```
  - `/coins/bitcoin`: Used for detailed price data (other timeframes)
    ```
    https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false
    ```

- **Reference for Price Verification**: https://www.coingecko.com/en/coins/bitcoin

- **Coinbase Fallback API**:
  - Spot price endpoint: `https://api.coinbase.com/v2/prices/BTC-USD/spot`

## Common Issues to Watch For

- **API Response Null Fields**: The CoinGecko API might not always include all percentage fields for all timeframes. Always use fallbacks with `||` operators:
  ```javascript
  changePercent = marketData.price_change_percentage_7d || 0;
  ```

- **State Update Race Conditions**: Be careful with multiple state updates that depend on each other. Use functional updates where appropriate:
  ```javascript
  // Instead of:
  setTimeframesData({...timeframesData, [timeframe]: data});
  
  // Use:
  setTimeframesData(prev => ({...prev, [timeframe]: data}));
  ```

- **Cleanup on Unmount**: Ensure all timers and subscriptions are cleaned up to prevent memory leaks and ghost updates:
  ```javascript
  useEffect(() => {
    // Setup code...
    
    return () => {
      // Cleanup ALL resources
      isMountedRef.current = false;
      clearTimeout(timerRef.current);
      clearTimeout(animationTimeoutRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);
  ```

- **API Rate Limiting**: CoinGecko's API has rate limits that may cause 429 errors. Implement exponential backoff:
  ```javascript
  async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  }
  ```

## Environment Setup

Create a `.env.local` file in the project root with the following variables:

```
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key_here
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_TELEMETRY_DISABLED=1
```

For Vercel deployment, also configure these environment variables in the Vercel project settings.

### Configuration Checks

- Verify that `next.config.js` contains the API rewrites for local development:
  ```javascript
  async rewrites() {
    return [
      // Proxy requests to CoinGecko API to avoid CORS issues
      {
        source: '/api/coingecko/:path*',
        destination: 'https://api.coingecko.com/api/v3/:path*',
      },
      // Alternative API proxy (Coinbase as fallback)
      {
        source: '/api/coinbase/:path*',
        destination: 'https://api.coinbase.com/v2/:path*',
      },
    ];
  },
  ```

- Ensure the API proxy routes are correctly implemented in:
  - `/pages/api/coingecko/[...path].js`
  - `/pages/api/coinbase/[[...path]].js`

- Check that `vercel.json` has appropriate function configuration:
  ```json
  "functions": {
    "pages/api/**/*": {
      "memory": 512,
      "maxDuration": 10
    }
  }
  ```

By following this debugging guide, you should be able to systematically address all the issues with the Bitcoin price tracker application and restore it to proper functionality.