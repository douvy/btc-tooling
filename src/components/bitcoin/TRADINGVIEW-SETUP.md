# TradingView Charting Library Integration

This implementation uses TradingView's JavaScript Widget for displaying BTC/USD price charts. The current implementation uses the publicly available widget which has some limitations, but provides a robust and professional charting solution.

## Current Implementation

The current implementation uses the free TradingView widget which:
- Provides real-time BTC/USD data from Bitstamp
- Supports candlestick charts with volume indicators
- Allows changing timeframes (1H, 1D, 1W, 1M, 1Y, ALL)
- Includes interactive features (tooltip, crosshair)
- Matches the application's dark theme

## Upgrading to the Full Charting Library

For enhanced customization and functionality, you may want to upgrade to TradingView's full Charting Library. Here's how:

### Step 1: Obtain the Library

The TradingView Charting Library is a proprietary product and requires an agreement with TradingView:

1. Apply for access at: https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/
2. Complete TradingView's application process
3. Sign their license agreement
4. They will provide you with access to the library repository

### Step 2: Install the Library

Once you have access:

1. Clone their private repository
2. Follow their installation instructions to add the library to your project
3. The library is typically placed in a `/public/charting_library/` directory

### Step 3: Update Our Integration

After installing the library, update the `TradingViewWidget.tsx` component:

1. Remove the script loading code (it's not needed with the full library)
2. Update imports to use the installed library
3. Create a data feed connector for your preferred Bitcoin price data source
4. Configure additional features available in the full library

## Data Source Considerations

The current implementation uses Bitstamp's data through TradingView's public widget.

When using the full library, you'll need to:
1. Select a Bitcoin price data provider
2. Implement a JavaScript data feed that follows TradingView's datafeed protocol
3. Common data sources include:
   - Cryptocurrency exchanges APIs (Coinbase, Binance, Bitstamp)
   - Aggregated data providers (CryptoCompare, CoinAPI)
   - WebSocket feeds for real-time updates

## Licensing and Attribution

The current implementation uses the public widget which requires:
1. The TradingView logo and branding to remain visible
2. No modifications to their widget code
3. Compliance with their terms of service

If using the full Charting Library:
1. Follow all terms of the license agreement provided by TradingView
2. Add any required attributions
3. Respect any usage limitations specified in your agreement

## Support and Resources

- TradingView Documentation: https://github.com/tradingview/charting_library/
- TradingView Widget Documentation: https://www.tradingview.com/widget/advanced-chart/
- Support: Visit TradingView's support channels specified in your agreement