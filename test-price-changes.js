// Test script to verify price changes calculation
// Run with: node test-price-changes.js

const timeframes = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];

// Mock the blockchain.info data shape after transformation
const mockBlockchainData = {
  market_data: {
    current_price: { usd: 67230.50 },
    price_change_24h: 1250.75,
    price_change_percentage_24h: 1.89,
    price_change_percentage_1h_in_currency: { usd: 0.45 },
    price_change_percentage_24h_in_currency: { usd: 1.89 },
    price_change_percentage_7d_in_currency: { usd: 4.75 },
    price_change_percentage_30d_in_currency: { usd: 9.25 },
    price_change_percentage_1y_in_currency: { usd: 42.8 },
    // Dollar changes for each timeframe
    price_change_1h_in_currency: { usd: 300.5 },
    price_change_7d_in_currency: { usd: 3050.25 },
    price_change_30d_in_currency: { usd: 5680.75 },
    price_change_1y_in_currency: { usd: 20125.50 },
    // All-time data
    price_change_all_time_in_currency: { usd: 67230.44 },
    price_change_percentage_all_time_in_currency: { usd: 112050.73 },
    last_updated_at: Math.floor(Date.now() / 1000)
  }
};

function normalizeDecimalPlaces(value, decimalPlaces = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return parseFloat(value.toFixed(decimalPlaces));
}

function extractTimeframeData(data, timeframe) {
  try {
    if (!data?.market_data?.current_price?.usd) {
      throw new Error('Invalid Bitcoin data format');
    }
    
    const marketData = data.market_data;
    const price = marketData.current_price.usd;
    let changePercent = 0;
    let dollarChange = 0;
    
    if (timeframe === '1D' || timeframe === '24h') {
      if (typeof marketData.price_change_24h === 'number') {
        dollarChange = marketData.price_change_24h;
        if (!changePercent) {
          const previousPrice = price - dollarChange;
          if (previousPrice > 0) {
            changePercent = (dollarChange / previousPrice) * 100;
          }
        }
      }
      
      if (!changePercent || Math.abs(changePercent) < 0.00001) {
        changePercent = 
          typeof marketData.price_change_percentage_24h === 'number' ? marketData.price_change_percentage_24h :
          marketData.price_change_percentage_24h_in_currency?.usd || 0;
      }
    }
    else if (timeframe === '1H') {
      changePercent = 
        typeof marketData.price_change_percentage_1h === 'number' ? marketData.price_change_percentage_1h :
        marketData.price_change_percentage_1h_in_currency?.usd || 0;
      
      if (marketData.price_change_1h_in_currency?.usd) {
        dollarChange = marketData.price_change_1h_in_currency.usd;
      }
    }
    else if (timeframe === '1W' || timeframe === '7d') {
      changePercent = 
        typeof marketData.price_change_percentage_7d === 'number' ? marketData.price_change_percentage_7d :
        marketData.price_change_percentage_7d_in_currency?.usd || 0;
      
      if (marketData.price_change_7d_in_currency?.usd) {
        dollarChange = marketData.price_change_7d_in_currency.usd;
      }
    }
    else if (timeframe === '1M' || timeframe === '30d') {
      changePercent = 
        typeof marketData.price_change_percentage_30d === 'number' ? marketData.price_change_percentage_30d :
        marketData.price_change_percentage_30d_in_currency?.usd || 0;
      
      if (marketData.price_change_30d_in_currency?.usd) {
        dollarChange = marketData.price_change_30d_in_currency.usd;
      }
    }
    else if (timeframe === '1Y') {
      changePercent = 
        typeof marketData.price_change_percentage_1y === 'number' ? marketData.price_change_percentage_1y :
        marketData.price_change_percentage_1y_in_currency?.usd || 
        marketData.price_change_percentage_365d_in_currency?.usd || 
        marketData.price_change_percentage_365d || 0;
      
      if (marketData.price_change_1y_in_currency?.usd) {
        dollarChange = marketData.price_change_1y_in_currency.usd;
      }
    }
    else if (timeframe === 'ALL') {
      if (marketData.price_change_percentage_all_time_in_currency?.usd) {
        changePercent = marketData.price_change_percentage_all_time_in_currency.usd;
      }
      
      if (marketData.price_change_all_time_in_currency?.usd) {
        dollarChange = marketData.price_change_all_time_in_currency.usd;
      }
      
      if (Math.abs(changePercent) < 0.00001 || Math.abs(dollarChange) < 0.00001) {
        const bitcoinStartPrice = 0.06;
        dollarChange = price - bitcoinStartPrice;
        changePercent = ((price - bitcoinStartPrice) / bitcoinStartPrice) * 100;
      }
    }
    
    // Calculate the missing value ($ or %) if one is zero or missing
    if (Math.abs(changePercent) > 0.00001 && Math.abs(dollarChange) < 0.00001) {
      const previousPrice = price / (1 + (changePercent / 100));
      dollarChange = price - previousPrice;
    } else if (Math.abs(dollarChange) > 0.00001 && Math.abs(changePercent) < 0.00001) {
      const previousPrice = price - dollarChange;
      if (previousPrice > 0) {
        changePercent = (dollarChange / previousPrice) * 100;
      }
    }
    
    console.log(`Processed data for ${timeframe}:`, {
      price,
      dollarChange,
      percentChange: changePercent
    });
    
    const absDollarChange = Math.abs(dollarChange);
    const direction = changePercent >= 0 ? 'up' : 'down';
    
    const normalizedPrice = normalizeDecimalPlaces(price, 2);
    const normalizedChange = normalizeDecimalPlaces(absDollarChange, 2);
    const normalizedPercentChange = normalizeDecimalPlaces(Math.abs(changePercent), 2);
    
    return {
      price: normalizedPrice,
      change: normalizedChange,
      changePercent: normalizedPercentChange,
      direction: direction,
      timeframe
    };
  } catch (error) {
    console.error('Error extracting timeframe data:', error);
    throw error;
  }
}

// Test all timeframes
console.log('Testing price change calculations for all timeframes:');
console.log('====================================================');

timeframes.forEach(timeframe => {
  try {
    const result = extractTimeframeData(mockBlockchainData, timeframe);
    console.log(`[${timeframe}] Price: $${result.price.toFixed(2)}, Change: $${result.change.toFixed(2)} (${result.direction === 'up' ? '+' : '-'}${result.changePercent.toFixed(2)}%)`);
  } catch (error) {
    console.error(`Error processing ${timeframe}:`, error);
  }
});

console.log('\nDone!');