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
  // CRITICAL FOR PRODUCTION: Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // If it's a preflight request, send 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // VERY IMPORTANT: Set headers to prevent caching of this API response
  // This ensures we always get fresh price data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Log request for debugging
  console.log('Coinbase realtime API called, environment:', process.env.NODE_ENV);

  // In production, always make a direct API call for fresh data
  // In development, use WebSocket if available
  if (process.env.NODE_ENV === 'production' || !lastPrice) {
    console.log('Using direct API call for price data');
    
    try {
      // Try multiple price sources for reliability
      const coinbasePromise = fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      // Add a backup API in case Coinbase fails
      const backupPromise = fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      // Race the promises to get the fastest response
      const responses = await Promise.allSettled([coinbasePromise, backupPromise]);
      
      // Try Coinbase first
      if (responses[0].status === 'fulfilled') {
        const response = responses[0].value;
        const data = await response.json();
        
        if (data && data.data && data.data.amount) {
          const price = parseFloat(data.data.amount);
          
          return res.status(200).json({
            success: true,
            price: price,
            timestamp: Date.now(),
            source: 'coinbase-direct'
          });
        }
      }
      
      // Try CoinGecko as backup
      if (responses[1].status === 'fulfilled') {
        const response = responses[1].value;
        const data = await response.json();
        
        if (data && data.bitcoin && data.bitcoin.usd) {
          const price = data.bitcoin.usd;
          
          return res.status(200).json({
            success: true,
            price: price,
            timestamp: Date.now(),
            source: 'coingecko-backup'
          });
        }
      }
      
      throw new Error('All price APIs failed');
    } catch (error) {
      console.error('Error fetching direct price:', error);
      
      // If direct API calls fail, try WebSocket as last resort
      if (lastPrice && Date.now() - lastUpdateTime < 60000) { // Only use if less than 1 minute old
        return res.status(200).json({
          success: true,
          price: lastPrice,
          timestamp: lastUpdateTime,
          age: Date.now() - lastUpdateTime,
          source: 'websocket-fallback'
        });
      }
      
      // If everything fails, return error
      return res.status(200).json({
        success: false,
        message: 'Real-time price not available',
        timestamp: Date.now()
      });
    }
  }
  
  // In development, use WebSocket price if available
  return res.status(200).json({
    success: true,
    price: lastPrice,
    timestamp: lastUpdateTime,
    age: Date.now() - lastUpdateTime,
    source: 'websocket'
  });
}