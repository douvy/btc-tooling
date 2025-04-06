# BTC Tooling React Migration

This project is a conversion of the BTC Tooling dashboard from vanilla HTML/CSS/JS to a modern React stack using:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## Getting Started

1. Initialize the Next.js project:
```bash
npx create-next-app@latest .
# Select the following options:
# - Would you like to use TypeScript? Yes
# - Would you like to use ESLint? Yes 
# - Would you like to use Tailwind CSS? Yes
# - Would you like to use the `src/` directory? Yes
# - Would you like to use App Router? Yes
# - Would you like to customize the default import alias? Yes, use @/*
```

2. Install additional dependencies:
```bash
npm install react-icons classnames
```

3. Copy assets from the original project:
```bash
mkdir -p public/images public/fonts
cp -r ../assets/img/* public/images/
cp -r ../fonts/* public/fonts/
```

4. Create font styles:
```bash
mkdir -p src/styles
# Create src/styles/fonts.css with custom font declarations
```

5. Configure Tailwind with the custom colors:
```bash
# Edit tailwind.config.ts to add custom colors from the original project
```

6. Create the component structure:
```bash
mkdir -p src/components/layout src/components/bitcoin src/components/social
mkdir -p src/hooks src/lib src/types
```

## Project Structure

```
btc-tooling-react/
├── public/
│   ├── fonts/             # Custom fonts 
│   └── images/            # Image assets
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Root layout with metadata
│   │   └── page.tsx       # Homepage
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx    # Site header with responsive designs
│   │   │   └── Footer.tsx    # Site footer
│   │   ├── bitcoin/
│   │   │   ├── PriceDisplay.tsx       # Bitcoin price display  
│   │   │   ├── TimeframeSelector.tsx  # Timeframe buttons
│   │   │   ├── PriceChart.tsx         # BTC/USD chart
│   │   │   ├── OrderBook.tsx          # Order book component
│   │   │   └── HalvingCountdown.tsx   # Halving countdown timer
│   │   └── social/
│   │       └── TwitterFeed.tsx        # Twitter feed panel
│   ├── hooks/
│   │   └── useTimeframe.ts            # Custom hook for timeframe state
│   ├── lib/
│   │   └── utils.ts                   # Helper functions
│   ├── types/
│   │   └── index.ts                   # TypeScript definitions
│   └── styles/
│       └── fonts.css                  # Font definitions
├── tailwind.config.js    # Tailwind configuration
└── package.json         # Project dependencies
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Next Steps

- Add API integration for live Bitcoin price data
- Implement real interactive charts using a library like Chart.js or Recharts
- Add more technical indicators
- Implement dark/light mode toggle
- Add responsive optimizations for mobile devices