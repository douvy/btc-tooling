import { Server } from 'socket.io';
import axios from 'axios';

const CRYPTO_UPDATE_EVENT = 'crypto_update';
const ERROR_EVENT = 'error';
const UPDATE_INTERVAL = 15000; // 15 seconds (reduced frequency)
const CACHE_LIFETIME = 60000; // 60 seconds cache lifetime (increased)
const RATE_LIMIT_MAX = 8; // Reduced to be safe
const RATE_LIMIT_WINDOW = 60000; // 1 minute window

// API key from environment variable
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;

// Track active connection count for scaling
let connections = 0;

// Cache data to avoid API rate limiting
let priceCache = {
  simple: null,
  detailed: null,
  lastUpdate: {
    simple: 0,
    detailed: 0
  }
};

// Rate limiting
const rateLimiter = {
  count: 0,
  resetTime: Date.now() + RATE_LIMIT_WINDOW,
  queue: [],
  processing: false
};

// Mock data for when API is unavailable
const MOCK_SIMPLE_DATA = {
  bitcoin: {
    usd: 82151,
    usd_24h_change: 0.55,
    usd_24h_vol: 24500000000,
    last_updated_at: Math.floor(Date.now() / 1000)
  }
};

const MOCK_DETAILED_DATA = {
  market_data: {
    current_price: { usd: 82151 },
    price_change_percentage_24h: 0.55,
    price_change_percentage_7d: 1.2,
    price_change_percentage_30d: 8.75,
    price_change_percentage_1y: 118.34,
    total_volume: { usd: 24500000000 },
    last_updated_at: Math.floor(Date.now() / 1000)
  }
};

// Process the rate limit queue
const processQueue = async () => {
  if (rateLimiter.processing || rateLimiter.queue.length === 0) return;
  
  // Reset counter if window has passed
  if (Date.now() > rateLimiter.resetTime) {
    console.log('[WebSocket] Resetting rate limit counter');
    rateLimiter.count = 0;
    rateLimiter.resetTime = Date.now() + RATE_LIMIT_WINDOW;
  }
  
  // Don't process if we're at the limit
  if (rateLimiter.count >= RATE_LIMIT_MAX) {
    console.log(`[WebSocket] Rate limit reached (${rateLimiter.count}/${RATE_LIMIT_MAX}), waiting until ${new Date(rateLimiter.resetTime).toLocaleTimeString()}`);
    return;
  }
  
  // Get next request from queue
  const next = rateLimiter.queue.shift();
  if (!next) return;
  
  // Mark as processing to prevent concurrent executions
  rateLimiter.processing = true;
  
  // Execute the request
  rateLimiter.count++;
  console.log(`[WebSocket] Processing queued request (${rateLimiter.count}/${RATE_LIMIT_MAX})`);
  
  try {
    const result = await next.fn();
    next.resolve(result);
  } catch (error) {
    next.reject(error);
  } finally {
    rateLimiter.processing = false;
    
    // Process next item if available
    setTimeout(processQueue, 1000); // Add 1-second delay between requests
  }
};

// Add a request to the rate limiter queue
const queueRequest = (fn, priority = false) => {
  return new Promise((resolve, reject) => {
    const queueItem = { fn, resolve, reject };
    
    if (priority) {
      // Put high priority requests at the front of the queue
      rateLimiter.queue.unshift(queueItem);
    } else {
      rateLimiter.queue.push(queueItem);
    }
    
    processQueue();
  });
};

// Set up queue processor - check queue regularly
setInterval(processQueue, 6000);

/**
 * Direct API call to CoinGecko for simple price data
 */
const fetchSimpleBitcoinPrice = async () => {
  return queueRequest(async () => {
    console.log('[WebSocket] Fetching simple Bitcoin data from CoinGecko API');
    const url = 'https://api.coingecko.com/api/v3/simple/price';
    const params = {
      ids: 'bitcoin',
      vs_currencies: 'usd',
      include_24h_change: 'true',
      include_24h_vol: 'true',
      include_last_updated_at: 'true',
      precision: 'full'
    };
    
    const headers = {};
    if (COINGECKO_API_KEY) {
      headers['x-cg-api-key'] = COINGECKO_API_KEY;
    }
    
    try {
      const response = await axios.get(url, { 
        params,
        headers,
        timeout: 5000 // 5 second timeout
      });
      
      console.log('[WebSocket] Successfully fetched simple Bitcoin data');
      return {
        bitcoin: response.data.bitcoin
      };
    } catch (error) {
      console.error('[WebSocket] CoinGecko API error:', error.message);
      
      // Use mock data as fallback
      console.log('[WebSocket] Using mock data for simple Bitcoin price');
      return MOCK_SIMPLE_DATA;
    }
  });
};

/**
 * Direct API call to CoinGecko for detailed Bitcoin data
 */
const fetchDetailedBitcoinData = async () => {
  return queueRequest(async () => {
    console.log('[WebSocket] Fetching detailed Bitcoin data from CoinGecko API');
    const url = 'https://api.coingecko.com/api/v3/coins/bitcoin';
    const params = {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false
    };
    
    const headers = {};
    if (COINGECKO_API_KEY) {
      headers['x-cg-api-key'] = COINGECKO_API_KEY;
    }
    
    try {
      const response = await axios.get(url, { 
        params,
        headers,
        timeout: 5000 // 5 second timeout
      });
      
      console.log('[WebSocket] Successfully fetched detailed Bitcoin data');
      return response.data;
    } catch (error) {
      console.error('[WebSocket] CoinGecko API error:', error.message);
      
      // Use mock data as fallback
      console.log('[WebSocket] Using mock data for detailed Bitcoin data');
      return MOCK_DETAILED_DATA;
    }
  });
};

/**
 * Fetches cryptocurrency data with enhanced caching
 */
const fetchData = async (type, force = false) => {
  try {
    // Use cache if it's not expired (up to cache lifetime)
    const now = Date.now();
    if (!force && priceCache[type] && now - priceCache.lastUpdate[type] < CACHE_LIFETIME) {
      console.log(`[WebSocket] Using cached ${type} data (${Math.round((now - priceCache.lastUpdate[type]) / 1000)}s old)`);
      return priceCache[type];
    }
    
    // Fetch fresh data from API with rate limiting
    console.log(`[WebSocket] Cache ${force ? 'refresh requested' : 'expired'} for ${type} data, fetching new data...`);
    const data = type === 'simple' 
      ? await fetchSimpleBitcoinPrice()
      : await fetchDetailedBitcoinData();
      
    // Update cache
    priceCache[type] = data;
    priceCache.lastUpdate[type] = now;
    
    return data;
  } catch (error) {
    console.error(`[WebSocket] Error fetching ${type} data:`, error.message);
    
    // If cache exists but is expired, use it anyway as fallback
    if (priceCache[type]) {
      console.log(`[WebSocket] Using expired cache as fallback for ${type}`);
      return priceCache[type];
    }
    
    // No cache available, use mock data
    console.log(`[WebSocket] No cache available, using mock data for ${type}`);
    return type === 'simple' ? MOCK_SIMPLE_DATA : MOCK_DETAILED_DATA;
  }
};

/**
 * Format Bitcoin data from the API into the expected format
 */
const formatSimpleData = (data) => {
  // No bitcoin data available
  if (!data || !data.bitcoin || !data.bitcoin.usd) {
    return {
      market_data: {
        current_price: { usd: 82151 },
        price_change_percentage_24h: 0.55,
        total_volume: { usd: 24500000000 },
        last_updated_at: Math.floor(Date.now() / 1000)
      }
    };
  }
  
  // Format the data to match the expected structure
  return {
    market_data: {
      current_price: { usd: data.bitcoin.usd },
      price_change_percentage_24h: data.bitcoin.usd_24h_change || 0,
      total_volume: { usd: data.bitcoin.usd_24h_vol || 0 },
      last_updated_at: data.bitcoin.last_updated_at || Math.floor(Date.now() / 1000)
    }
  };
};

const SocketHandler = async (req, res) => {
  // Check if socket.io server is already initialized
  if (res.socket.server.io) {
    console.log('[WebSocket] Socket server already initialized');
    res.end();
    return;
  }

  // Initialize socket.io server
  const io = new Server(res.socket.server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });
  res.socket.server.io = io;

  // Fetch initial data if needed
  try {
    // Prefetch data to populate cache
    if (!priceCache.simple) {
      console.log('[WebSocket] Prefetching simple data on server initialization');
      // Use priority queue to get this data first
      await fetchData('simple', true);
    }
    
    if (!priceCache.detailed) {
      console.log('[WebSocket] Prefetching detailed data on server initialization');
      await fetchData('detailed', true);
    }
  } catch (error) {
    console.error('[WebSocket] Error prefetching data:', error.message);
  }

  // Handle connections
  io.on('connection', (socket) => {
    connections++;
    console.log(`[WebSocket] Client connected. Total connections: ${connections}`);
    
    // Send initial data immediately
    sendUpdate(socket);
    
    // Client can request specific timeframes
    socket.on('subscribe', async (timeframe) => {
      // Store the current subscription in the socket
      socket.currentTimeframe = timeframe || '1D';
      console.log(`[WebSocket] Client subscribed to ${socket.currentTimeframe} timeframe`);
      
      // Send data for the requested timeframe
      sendUpdate(socket);
    });
    
    // Handle ping for latency monitoring
    socket.on('ping', () => {
      // Immediately respond with pong for latency measurement
      socket.emit('pong');
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      connections--;
      console.log(`[WebSocket] Client disconnected. Total connections: ${connections}`);
    });
  });

  // Set up a broadcast timer only if there are connections
  const broadcastTimer = setInterval(() => {
    if (connections > 0) {
      broadcastUpdates(io);
    }
  }, UPDATE_INTERVAL);

  // Ensure the timer is cleared if the server restarts
  res.socket.server.broadcastTimer = broadcastTimer;
  
  console.log('[WebSocket] Socket server initialized');
  res.end();
};

// Send update to a specific client
const sendUpdate = async (socket) => {
  try {
    const timeframe = socket.currentTimeframe || '1D';
    const type = timeframe === '1D' ? 'simple' : 'detailed';
    const data = await fetchData(type);
    
    // For simple data, we need to format it
    const formattedData = type === 'simple' ? formatSimpleData(data) : data;
    
    socket.emit(CRYPTO_UPDATE_EVENT, {
      data: formattedData,
      timeframe,
      timestamp: Date.now()
    });
  } catch (error) {
    socket.emit(ERROR_EVENT, {
      message: error.message,
      timestamp: Date.now()
    });
  }
};

// Broadcast to all connected clients - only fetch if data is stale
const broadcastUpdates = async (io) => {
  try {
    const now = Date.now();
    const isSimpleStale = !priceCache.simple || now - priceCache.lastUpdate.simple > CACHE_LIFETIME;
    const isDetailedStale = !priceCache.detailed || now - priceCache.lastUpdate.detailed > CACHE_LIFETIME;
    
    // Only fetch data that's stale
    let simpleData = priceCache.simple;
    let detailedData = priceCache.detailed;
    
    // Track what needs updating
    let simpleUpdated = false;
    let detailedUpdated = false;
    
    if (isSimpleStale) {
      try {
        simpleData = await fetchData('simple');
        simpleUpdated = true;
      } catch (error) {
        console.error('[WebSocket] Error updating simple data:', error.message);
      }
    }
    
    if (isDetailedStale) {
      try {
        detailedData = await fetchData('detailed');
        detailedUpdated = true;
      } catch (error) {
        console.error('[WebSocket] Error updating detailed data:', error.message);
      }
    }
    
    // Skip broadcast if nothing was updated and not forced
    if (!simpleUpdated && !detailedUpdated) {
      console.log('[WebSocket] Skipping broadcast - no data updated');
      return;
    }
    
    const timestamp = Date.now();
    
    // Get all connected sockets
    const sockets = await io.fetchSockets();
    
    // Send the appropriate data to each socket based on its subscription
    sockets.forEach(socket => {
      const timeframe = socket.currentTimeframe || '1D';
      const isSimple = timeframe === '1D';
      const data = isSimple ? formatSimpleData(simpleData) : detailedData;
      
      socket.emit(CRYPTO_UPDATE_EVENT, {
        data,
        timeframe,
        timestamp
      });
    });
    
    console.log(`[WebSocket] Broadcast complete to ${sockets.length} clients`);
  } catch (error) {
    console.error('[WebSocket] Broadcast error:', error.message);
    
    // Notify all clients of the error
    io.emit(ERROR_EVENT, {
      message: 'Failed to update cryptocurrency data',
      timestamp: Date.now()
    });
  }
};

export default SocketHandler;