/**
 * Coinbase Real-time Bitcoin Price API
 *
 * Provides consistent real-time Bitcoin price updates across all environments.
 *
 * Key features:
 * 1. Uses the same data source consistently in both development and production
 * 2. Multiple redundant API sources to ensure reliability
 * 3. Strict cache control to ensure fresh data
 * 4. Consistent response format for deterministic percentage calculations
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import WebSocket from 'ws';

interface CoinbaseTickerMessage {
  type: string;
  product_id: string;
  price: string;
}

interface CoinbaseSpotResponse {
  data?: { amount?: string };
}

interface CoinGeckoSimplePrice {
  bitcoin?: { usd?: number };
}

interface RealtimePriceResponse {
  success: boolean;
  price?: number;
  timestamp: number;
  age?: number;
  source?: string;
  stale?: boolean;
  message?: string;
}

// Initialize price tracking variables
let lastPrice: number | null = null;
let lastUpdateTime = 0;
let lastSource: string | null = null;

// In-memory cache TTL (15 seconds)
const CACHE_TTL = 15000;

// Keep WebSocket implementation for development environments
let ws: WebSocket | null = null;

// Setup WebSocket connection if running on server
// This only works in development as Vercel serverless functions don't maintain connections
if (typeof global !== 'undefined') {
  try {
    ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

    ws.on('open', function open() {
      const subscribeMsg = {
        type: 'subscribe',
        product_ids: ['BTC-USD'],
        channels: ['ticker']
      };

      ws?.send(JSON.stringify(subscribeMsg));
    });

    ws.on('message', function incoming(data) {
      try {
        const message: CoinbaseTickerMessage = JSON.parse(data.toString());

        if (message.type === 'ticker' && message.product_id === 'BTC-USD') {
          lastPrice = parseFloat(message.price);
          lastUpdateTime = Date.now();
          lastSource = 'websocket';
        }
      } catch {
        // Error processing message
      }
    });

    ws.on('error', function error() {
      // WebSocket error handler
    });

    ws.on('close', function close() {
      setTimeout(() => {
        ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      }, 5000);
    });
  } catch {
    // Error setting up WebSocket
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RealtimePriceResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Set cache prevention headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  // Check if we have fresh cached data (less than 15 seconds old)
  const now = Date.now();
  const isCacheFresh = lastPrice !== null && (now - lastUpdateTime < CACHE_TTL);

  // IMPORTANT: Use the same approach in both production and development
  // Always try HTTP APIs first for consistency, only use WebSocket as fallback

  // First attempt: Try HTTP APIs for fresh data
  if (!isCacheFresh) {
    try {
      // Set up abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      try {
        // Try both APIs in parallel
        const coinbasePromise = fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', {
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal
        });

        const coingeckoPromise = fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal
        });

        // Wait for both promises
        const responses = await Promise.allSettled([coinbasePromise, coingeckoPromise]);

        // Try Coinbase first (primary source)
        if (responses[0].status === 'fulfilled') {
          const response = responses[0].value;
          if (response.ok) {
            const data: CoinbaseSpotResponse = await response.json();

            if (data?.data?.amount) {
              const price = parseFloat(data.data.amount);

              // Update the cache
              lastPrice = price;
              lastUpdateTime = now;
              lastSource = 'coinbase-direct';

              return res.status(200).json({
                success: true,
                price,
                timestamp: now,
                source: 'coinbase-direct'
              });
            }
          }
        }

        // Try CoinGecko as backup
        if (responses[1].status === 'fulfilled') {
          const response = responses[1].value;
          if (response.ok) {
            const data: CoinGeckoSimplePrice = await response.json();

            if (data?.bitcoin?.usd) {
              const price = data.bitcoin.usd;

              // Update the cache
              lastPrice = price;
              lastUpdateTime = now;
              lastSource = 'coingecko-backup';

              return res.status(200).json({
                success: true,
                price,
                timestamp: now,
                source: 'coingecko-backup'
              });
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // API errors will fall through to the next section
    }
  }

  // Second attempt: Use WebSocket data if available (both dev and prod as fallback)
  if (lastPrice !== null && lastSource === 'websocket' && (now - lastUpdateTime < 60000)) {
    return res.status(200).json({
      success: true,
      price: lastPrice,
      timestamp: lastUpdateTime,
      age: now - lastUpdateTime,
      source: 'websocket'
    });
  }

  // Third attempt: Use any cached data even if older than preferred TTL
  if (lastPrice !== null) {
    return res.status(200).json({
      success: true,
      price: lastPrice,
      timestamp: lastUpdateTime,
      age: now - lastUpdateTime,
      source: `${lastSource}-stale`,
      stale: true
    });
  }

  // Final fallback: Return error if all methods failed
  return res.status(200).json({
    success: false,
    message: 'Real-time price not available',
    timestamp: now
  });
}
