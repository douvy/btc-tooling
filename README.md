# BTC Tooling

A modern, responsive Bitcoin dashboard providing real-time price data, charts, orderbook visualization, and halving countdown information.

## Features
- Live Bitcoin price display with multiple timeframes
- Interactive price chart
- BTC market analysis summary
- Real-time orderbook display
- Halving countdown timer
- Bitcoin X/Twitter Feed integration
- Fully responsive design for all devices

## Technology
Built with modern web technologies:
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS

## Getting Started

To run the development server:

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

## Development
To contribute to the project:
1. Clone the repository
2. Install dependencies with `npm install`
3. Make your changes
4. Run tests and linting with `npm run lint`
5. Build the project with `npm run build` to verify it works in production
6. Submit a pull request

## Project Structure
```
btc-tooling/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   ├── bitcoin/      # Bitcoin-specific components
│   │   ├── layout/       # Layout components (Header, Footer)
│   │   └── social/       # Social media integration
│   ├── hooks/            # Custom React hooks
│   ├── styles/           # Global styles and fonts
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
│   └── images/           # Image assets
└── tailwind.config.js    # Tailwind CSS configuration
```

## Roadmap
- [ ] Connect to real-time price APIs
- [ ] Implement fully interactive chart
