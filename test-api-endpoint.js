// Quick test to verify blockchain.info endpoint
console.log('Testing blockchain.info ticker endpoint');

async function testEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/api/blockchain/ticker');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    // Check for critical fields
    if (data?.market_data?.current_price?.usd) {
      console.log('Current price:', data.market_data.current_price.usd);
    } else {
      console.log('WARNING: Missing current_price.usd field');
    }
    
    // Check 24h percentage change
    if (data?.market_data?.price_change_percentage_24h_in_currency?.usd) {
      console.log('24h percent change:', data.market_data.price_change_percentage_24h_in_currency.usd);
    } else if (data?.market_data?.price_change_percentage_24h) {
      console.log('24h percent change:', data.market_data.price_change_percentage_24h);
    } else {
      console.log('WARNING: Missing 24h percent change fields');
    }
    
    // Check other timeframes
    const timeframes = ['1h', '24h', '7d', '30d', '1y'];
    for (const timeframe of timeframes) {
      const field = `price_change_percentage_${timeframe}_in_currency`;
      if (data?.market_data?.[field]?.usd) {
        console.log(`${timeframe} percent change:`, data.market_data[field].usd);
      } else {
        console.log(`WARNING: Missing ${timeframe} percent change field`);
      }
    }
    
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

testEndpoint();