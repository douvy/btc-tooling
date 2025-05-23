# BTC Tooling

Bitcoin market analytics dashboard with real-time data visualization, comprehensive market metrics, and trading tools.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-btctooling.com-blue)](https://btctooling.com)

![BTC Tooling Dashboard](/public/images/demo.jpg)

## Features

- **Live Bitcoin Price Tracking**: Multi-timeframe price data with change indicators
- **Advanced Charting**: TradingView-powered interactive price chart
- **Order Book Visualization**: Real-time depth chart with Bitfinex exchange support and dynamic amount controls
- **Halving Countdown**: Timer showing blocks remaining, rewards, and historical context
- **Bitcoin X/Twitter Integration**: Curated feed with 3 recent, relevant Bitcoin posts
- **Market Analysis Panel**: Concise BTC analysis with assessment, strategic outlook, and sentiment
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Custom Design System
- **Data**: Blockchain.info API, WebSockets for real-time updates
- **Performance**: Dynamic imports, client-side rendering for interactive components

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Access the dashboard at [http://localhost:3000](http://localhost:3000)

## Development

```bash
# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

The application is optimized for Vercel deployment with:

- Custom API proxies for CoinGecko and Coinbase with proper caching
- Serverless function optimization (memory: 512MB, timeout: 10s)
- Deprecation warning fixes for Node.js compatibility
- Comprehensive environment variable configuration

## Architecture

The application follows a modular component architecture with clear separation of concerns:

```
src/
├── app/         # Next.js App Router and API routes
├── components/  # React components (bitcoin, layout, social)
├── hooks/       # Custom React hooks for data fetching
├── lib/         # Utility functions and API clients
├── styles/      # Global styles and typography
└── types/       # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -m 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Open a Pull Request

If you find this project useful, please consider giving it a star