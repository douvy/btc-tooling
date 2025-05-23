# BTC Tooling

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://btctooling.com)
[![GitHub Stars](https://img.shields.io/github/stars/btc-tooling/btc-tooling?style=social)](https://github.com/btc-tooling/btc-tooling/stargazers)

Complete Bitcoin analytics dashboard with real-time price tracking, order books, and market insights.

![Dashboard](https://btctooling.com/demo.jpg)

## Why Star This Project?

- Production-ready Bitcoin analytics platform
- Real-time data visualization using WebSockets
- Multi-exchange order book with depth visualization
- Clean, modular React/TypeScript codebase
- Easy to fork and customize for your needs
- Actively maintained and updated

## Features

- Live Bitcoin price tracking across multiple timeframes
- TradingView-powered price charts
- Real-time order book visualization (Bitfinex, Coinbase, Binance)
- Halving countdown with blockchain data
- Twitter/X integration with curated BTC content
- Responsive design for all devices

## Tech

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS, WebSockets, Blockchain.info API
- Vercel-optimized deployment

## Quick Start

```bash
# Clone repository
git clone https://github.com/btc-tooling/btc-tooling.git
cd btc-tooling

# Install dependencies
npm install

# Start development server
npm run dev
```

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

## Deployment

The application is optimized for Vercel deployment with:

- Custom API proxies for CoinGecko and Coinbase with proper caching
- Serverless function optimization (memory: 512MB, timeout: 10s)
- Deprecation warning fixes for Node.js compatibility

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT

---

⭐ **If you find this useful, please star the repo!** ⭐