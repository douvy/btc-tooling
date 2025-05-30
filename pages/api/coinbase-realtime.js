/**
 * Coinbase WebSocket API endpoint
 * Provides real-time Bitcoin price updates without rate limits
 * 
 * This endpoint:
 * 1. Establishes a WebSocket connection to Coinbase's public WebSocket API
 * 2. Subscribes to the BTC-USD ticker channel for real-time price updates
 * 3. Stores the latest price in memory for efficient retrieval
 * 4. Provides a REST API to access the latest price data
 * 
 * Benefits:
 * - Completely free with no API rate limits
 * - Updates multiple times per second (sub-second latency)
 * - Single persistent connection shared by all clients
 * - Low resource usage on both server and client
 */

let lastPrice = null;
let lastUpdateTime = 0;

// Initialize WebSocket connection (for server-side only)
let ws = null;

// Setup WebSocket connection if running on server
// Note: In production, Vercel serverless functions don't maintain persistent connections
// We'll need to handle this differently for production vs development
if (typeof global !== 'undefined') {
  console.log('Setting up Coinbase WebSocket connection in', process.env.NODE_ENV, 'environment');
  try {
    // Use the WebSocket API from Coinbase which has no rate limits
    const WebSocket = require('ws');
    ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    
    ws.on('open', function open() {
      console.log('Coinbase WebSocket connected');
      
      // Subscribe to BTC-USD ticker
      const subscribeMsg = {
        type: 'subscribe',
        product_ids: ['BTC-USD'],
        channels: ['ticker']
      };
      
      ws.send(JSON.stringify(subscribeMsg));
    });
    
    ws.on('message', function incoming(data) {
      try {
        const message = JSON.parse(data.toString());
        
        // Only process ticker messages
        if (message.type === 'ticker' && message.product_id === 'BTC-USD') {
          lastPrice = parseFloat(message.price);
          lastUpdateTime = Date.now();
          console.log(`Real-time BTC price: $${lastPrice}`);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    });
    
    ws.on('error', function error(err) {
      console.error('WebSocket error:', err);
    });
    
    ws.on('close', function close() {
      console.log('WebSocket connection closed');
      // Try to reconnect after a delay
      setTimeout(() => {
        ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      }, 5000);
    });
  } catch (err) {
    console.error('Error setting up WebSocket:', err);
  }
}

export default async function handler(req, res) {
  // If WebSocket is not available or hasn't received data yet
  if (!lastPrice) {
    console.log('WebSocket data not available, fetching direct price');
    
    // In production or when WebSocket fails, make a direct API call
    try {
      const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const data = await response.json();
      
      if (data && data.data && data.data.amount) {
        const price = parseFloat(data.data.amount);
        
        return res.status(200).json({
          success: true,
          price: price,
          timestamp: Date.now(),
          source: 'direct-api'
        });
      }
    } catch (error) {
      console.error('Error fetching direct price:', error);
    }
    
    // If direct API also fails, return error
    return res.status(200).json({
      success: false,
      message: 'Real-time price not available',
      timestamp: Date.now()
    });
  }
  
  // Return the most recent price from WebSocket if available
  res.status(200).json({
    success: true,
    price: lastPrice,
    timestamp: lastUpdateTime,
    age: Date.now() - lastUpdateTime,
    source: 'websocket'
  });
}