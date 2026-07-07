# BTC Tooling

Bitcoin market analytics dashboard with real-time data visualization, comprehensive market metrics, and trading tools.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-btctooling.com-blue)](https://btctooling.com)

![BTC Tooling Dashboard](/public/images/demo.jpg)

## Features

- **Live Bitcoin Price Tracking**: Multi-timeframe price data with change indicators
- **Advanced Charting**: TradingView-powered interactive price chart
- **Order Book Visualization**: Real-time depth via exchange WebSockets (Bitfinex, Coinbase, Binance) with dynamic amount controls
- **Market Stats**: Sats per dollar, market cap, supply, ATH metrics, hash rate, fee rate, and block height
- **Halving Countdown**: Blocks remaining, rewards, and historical context
- **BTC Analysis**: Curated market assessment with key levels and trigger scenarios
- **X Insights**: Curated feed of relevant Bitcoin posts
- **Responsive Design**: Optimized for desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling**: Tailwind CSS with a custom design system
- **Data**: CoinGecko, mempool.space, exchange WebSockets (Bitfinex/Coinbase/Binance), TradingView embed

## Quick Start

```bash
# Install dependencies (pnpm required)
pnpm install

# Start development server
pnpm dev
```

Access the dashboard at [http://localhost:3000](http://localhost:3000)

### Environment variables

| Variable | Purpose |
| --- | --- |
| `COINGECKO_API_KEY` | Server-side CoinGecko API key (price data) |

## Development

```bash
pnpm lint             # ESLint (zero warnings expected)
pnpm exec tsc --noEmit # Type check
pnpm test             # Jest unit tests
pnpm build            # Production build
pnpm start            # Serve production build
```

CI runs all of the above on every push and pull request.

## Deployment

Deployed on Vercel. See [SETUP-VERCEL.md](SETUP-VERCEL.md) for environment configuration and function settings.

## Architecture

```
src/
├── app/         # Next.js App Router, pages, and API routes
├── pages/api/   # Legacy pages-router API routes (price feed)
├── components/  # React components (bitcoin, layout, social)
├── context/     # App-wide state (price, order book, halving)
├── hooks/       # Custom React hooks for data fetching
├── lib/         # Utility functions and API clients
└── types/       # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Open a Pull Request

If you find this project useful, please consider giving it a star
