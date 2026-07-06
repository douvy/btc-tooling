# Deploying to Vercel

Next.js 16 app deployed on Vercel. Uses pnpm.

## Environment Variables

Set in Vercel project settings:

- `COINGECKO_API_KEY` (required): CoinGecko demo API key, used server-side by `/api/price-check` and `/api/price-history`.

## API Routes

App router (`src/app/api/`):

- `/api/market-stats` - market cap, volume, supply (CoinGecko, revalidates every 1m)
- `/api/halving` - halving countdown data (revalidates every 1h)
- `/api/substack` - latest Substack posts (revalidates every 1h)

Pages router (`src/pages/api/`):

- `/api/coinbase-realtime` - real-time BTC price via Coinbase WebSocket
- `/api/price-check` - simple current price (CoinGecko)
- `/api/price-history` - historical prices for timeframe changes (CoinGecko)

Order book data comes directly from exchange public WebSockets (Bitfinex/Coinbase/Binance) in the browser (no server route).

## vercel.json

- `pages/api/**` functions: 512MB memory, 10s max duration
- `/api/coinbase-realtime` is never cached; other API routes use `max-age=5, stale-while-revalidate=10`
- Regions: iad1, sfo1, lhr1

## Troubleshooting

- "Failed to fetch" errors: verify `COINGECKO_API_KEY` is set; check CoinGecko status
- Slow responses: check function region vs. user location; responses are cached 5s
- Function errors: check Vercel Function Logs (source maps are enabled in production)
