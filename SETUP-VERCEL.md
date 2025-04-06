# Setting Up Your Bitcoin Price Tracker on Vercel

This guide covers how to set up your Bitcoin price tracker for smooth deployment on Vercel, including fixing deprecation warnings, optimizing API performance, and ensuring proper configuration.

## Table of Contents

1. [Fixing Deprecation Warnings](#fixing-deprecation-warnings)
2. [API Proxy Setup](#api-proxy-setup)
3. [Vercel Deployment Configuration](#vercel-deployment-configuration)
4. [Environment Variables](#environment-variables)
5. [Debugging and Monitoring](#debugging-and-monitoring)

## Fixing Deprecation Warnings

We've fixed the `[DEP0060] DeprecationWarning: The 'util._extend' API is deprecated` warning with a custom patch that monkey-patches the deprecated method:

### How It Works:

1. The `util-deprecation-fix.js` file is loaded at the start of Next.js configuration.
2. It replaces the deprecated `util._extend` with `Object.assign`.
3. In production, deprecation warnings are also suppressed via `process.noDeprecation = true`.

### How to Debug Deprecation Warnings:

If you encounter additional deprecation warnings, use:

```bash
npm run trace-deprecation
```

This will run Next.js with the `--trace-deprecation` flag, showing detailed stack traces for each deprecation warning.

## API Proxy Setup

We've implemented two API proxies for data fetching:

1. **CoinGecko API** (`/api/coingecko/[...path].js`):
   - Primary data source for Bitcoin prices
   - Includes rate limiting and caching
   - Properly forwards your API key

2. **Coinbase API** (`/api/coinbase/[[...path]].js`):
   - Fallback when CoinGecko is unavailable
   - Provides basic Bitcoin price data

### Key Features:

- **Serverless Optimization**: Both proxies have a 9.5s timeout to prevent Vercel's 10s function timeout.
- **Stale-While-Revalidate Caching**: Responses include proper cache headers.
- **Rate Limiting**: Basic rate limiting to protect against API abuse.

## Vercel Deployment Configuration

The `vercel.json` file includes several optimizations:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "functions": {
    "api/**/*": {
      "memory": 512,
      "maxDuration": 10
    }
  }
}
```

### What This Does:

- Allocates more memory (512MB) for API functions
- Sets the maximum duration to 10 seconds
- Configures cache headers for API routes

## Environment Variables

You need to set these environment variables in your Vercel project settings:

1. **Required**:
   - `NEXT_PUBLIC_COINGECKO_API_KEY`: Your CoinGecko API key

2. **Optional**:
   - `NEXT_PUBLIC_DEBUG_MODE`: Set to "true" to enable verbose logging (default: "false" in production)
   - `NEXT_PUBLIC_USE_FALLBACKS`: Set to "true" to enable Coinbase fallback (default: "true")

## Debugging and Monitoring

### Development:

- Check the browser console for detailed API logs
- Use Network tab in DevTools to monitor API requests
- Run `npm run trace-deprecation` to debug deprecation warnings

### Production:

- Enable Vercel Analytics for real-time monitoring
- Source maps are enabled for better error tracking
- Check Vercel Function Logs for serverless function issues

## Troubleshooting

### "Failed to fetch" errors:

1. Verify your API key is correctly set in Vercel environment variables
2. Check if CoinGecko is experiencing downtime
3. The app should automatically fall back to Coinbase API

### Slow responses:

1. API responses are cached for 5 seconds with stale-while-revalidate
2. Check if your Vercel deployment region is far from your users
3. Consider adding more regions in `vercel.json`

### Memory errors:

If you see "FATAL ERROR: Reached heap limit" in functions logs:
1. Increase the memory allocation in `vercel.json` (up to 1024MB)
2. Optimize the API response processing in your code