import { setCorsHeaders, CACHE_CONTROL, SERVERLESS_TIMEOUT, handleOptions } from './utils/proxyUtils';

// Sample data for different exchanges
const MOCK_DATA = {
  bitfinex: {
    asks: Array.from({ length: 25 }, (_, i) => ({
      price: 82500 + (i * 100),
      amount: Math.random() * 2 + 0.1,
      total: (82500 + (i * 100)) * (Math.random() * 2 + 0.1),
      sum: 0, // Will be calculated
    })),
    bids: Array.from({ length: 25 }, (_, i) => ({
      price: 82400 - (i * 100),
      amount: Math.random() * 2 + 0.1,
      total: (82400 - (i * 100)) * (Math.random() * 2 + 0.1),
      sum: 0, // Will be calculated
    })),
    spread: 100,
    exchange: 'bitfinex'
  },
  coinbase: {
    asks: Array.from({ length: 25 }, (_, i) => ({
      price: 82510 + (i * 110),
      amount: Math.random() * 2 + 0.05,
      total: (82510 + (i * 110)) * (Math.random() * 2 + 0.05),
      sum: 0, // Will be calculated
    })),
    bids: Array.from({ length: 25 }, (_, i) => ({
      price: 82390 - (i * 90),
      amount: Math.random() * 2 + 0.05,
      total: (82390 - (i * 90)) * (Math.random() * 2 + 0.05),
      sum: 0, // Will be calculated
    })),
    spread: 120,
    exchange: 'coinbase'
  },
  binance: {
    asks: Array.from({ length: 25 }, (_, i) => ({
      price: 82520 + (i * 95),
      amount: Math.random() * 3 + 0.15,
      total: (82520 + (i * 95)) * (Math.random() * 3 + 0.15),
      sum: 0, // Will be calculated
    })),
    bids: Array.from({ length: 25 }, (_, i) => ({
      price: 82410 - (i * 105),
      amount: Math.random() * 3 + 0.15,
      total: (82410 - (i * 105)) * (Math.random() * 3 + 0.15),
      sum: 0, // Will be calculated
    })),
    spread: 110,
    exchange: 'binance'
  }
};

// Calculate cumulative sums for the mock data
Object.keys(MOCK_DATA).forEach(exchange => {
  let askSum = 0;
  MOCK_DATA[exchange].asks.forEach((ask, i) => {
    askSum += ask.amount;
    MOCK_DATA[exchange].asks[i].sum = askSum;
  });
  
  let bidSum = 0;
  MOCK_DATA[exchange].bids.forEach((bid, i) => {
    bidSum += bid.amount;
    MOCK_DATA[exchange].bids[i].sum = bidSum;
  });
});

/**
 * Handler for order book API requests
 * This endpoint provides fallback data for the OrderBook component when WebSockets fail
 */
export default async function handler(req, res) {
  // Enable CORS
  setCorsHeaders(res);
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }
  
  // Set up timeout for serverless functions
  const timeout = setTimeout(() => {
    res.status(504).json({ error: 'Gateway Timeout', code: 504 });
  }, SERVERLESS_TIMEOUT);
  
  try {
    // Get exchange from query params, default to bitfinex
    const exchange = req.query.exchange || 'bitfinex';
    
    // Validate exchange is supported
    if (!['bitfinex', 'coinbase', 'binance'].includes(exchange)) {
      res.status(400).json({ 
        error: 'Invalid exchange specified', 
        supportedExchanges: ['bitfinex', 'coinbase', 'binance'],
        code: 400 
      });
      return;
    }
    
    // Add a short, randomized delay to simulate network latency (50-300ms)
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 250) + 50));
    
    // Slightly modify the mock data each time to simulate real-time updates
    const responseData = JSON.parse(JSON.stringify(MOCK_DATA[exchange]));
    
    // Add slight price variations (±0.25%)
    const priceFactor = 1 + ((Math.random() * 0.5) - 0.25) / 100;
    
    responseData.asks.forEach(ask => {
      ask.price *= priceFactor;
      ask.total = ask.price * ask.amount;
    });
    
    responseData.bids.forEach(bid => {
      bid.price *= priceFactor;
      bid.total = bid.price * bid.amount;
    });
    
    // Update spread based on new prices
    if (responseData.asks.length > 0 && responseData.bids.length > 0) {
      responseData.spread = responseData.asks[0].price - responseData.bids[0].price;
    }
    
    // Set cache headers to allow some caching but ensure fresh data
    res.setHeader('Cache-Control', CACHE_CONTROL.DEFAULT);
    
    // Send the response
    res.status(200).json(responseData);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', message: error.message, code: 500 });
  } finally {
    clearTimeout(timeout);
  }
}