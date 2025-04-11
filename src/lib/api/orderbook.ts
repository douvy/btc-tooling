import { OrderBook } from '@/types';
import { getMockOrderBook } from '@/lib/mockData';

/**
 * REST API endpoints for fallback order book data when WebSockets fail
 */

// Bitfinex API endpoint for order book
const BITFINEX_API_URL = 'https://api-pub.bitfinex.com/v2';

// Coinbase API endpoint for order book
const COINBASE_API_URL = 'https://api.exchange.coinbase.com';

// Binance API endpoint for order book
const BINANCE_API_URL = 'https://api.binance.com/api/v3';

/**
 * Fetches the latest order book data from the Bitfinex REST API
 */
export async function fetchBitfinexOrderBook(
  symbol: string = 'BTCUSD',
  precision: string = 'P0',
  len: number = 25
): Promise<OrderBook> {
  try {
    // Format the symbol for Bitfinex
    const formattedSymbol = `t${symbol}`;
    
    // Fetch the data
    const response = await fetch(
      `${BITFINEX_API_URL}/book/${formattedSymbol}/${precision}?len=${len}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Process the data into our standard format
    const asks: any[] = [];
    const bids: any[] = [];
    
    data.forEach((entry: number[]) => {
      const [price, count, amount] = entry;
      
      // Negative amount means ask (sell) order
      if (amount < 0) {
        asks.push({
          price,
          amount: Math.abs(amount),
          total: price * Math.abs(amount),
          sum: 0 // will be calculated below
        });
      } 
      // Positive amount means bid (buy) order
      else if (amount > 0) {
        bids.push({
          price,
          amount,
          total: price * amount,
          sum: 0 // will be calculated below
        });
      }
    });
    
    // Sort the asks and bids
    asks.sort((a, b) => a.price - b.price);
    bids.sort((a, b) => b.price - a.price);
    
    // Calculate cumulative sums
    let askSum = 0;
    asks.forEach((ask, i) => {
      askSum += ask.amount;
      asks[i].sum = askSum;
    });
    
    let bidSum = 0;
    bids.forEach((bid, i) => {
      bidSum += bid.amount;
      bids[i].sum = bidSum;
    });
    
    // Calculate spread
    const spread = asks.length > 0 && bids.length > 0 
      ? asks[0].price - bids[0].price
      : 0;
    
    return {
      asks,
      bids,
      spread,
      exchange: 'bitfinex'
    };
  } catch (error) {
    console.error('[API] Failed to fetch Bitfinex order book:', error);
    
    // Return mock data as a last resort
    return getMockOrderBook('bitfinex');
  }
}

/**
 * Fetches the latest order book data from the Coinbase REST API
 */
export async function fetchCoinbaseOrderBook(
  symbol: string = 'BTCUSD',
  level: number = 2
): Promise<OrderBook> {
  try {
    // Format the symbol for Coinbase
    const formattedSymbol = `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
    
    // Fetch the data
    const response = await fetch(
      `${COINBASE_API_URL}/products/${formattedSymbol}/book?level=${level}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Process the data into our standard format
    const asks = data.asks.map((entry: string[]) => {
      const price = parseFloat(entry[0]);
      const amount = parseFloat(entry[1]);
      
      return {
        price,
        amount,
        total: price * amount,
        sum: 0 // will be calculated below
      };
    });
    
    const bids = data.bids.map((entry: string[]) => {
      const price = parseFloat(entry[0]);
      const amount = parseFloat(entry[1]);
      
      return {
        price,
        amount,
        total: price * amount,
        sum: 0 // will be calculated below
      };
    });
    
    // Calculate cumulative sums
    let askSum = 0;
    asks.forEach((ask, i) => {
      askSum += ask.amount;
      asks[i].sum = askSum;
    });
    
    let bidSum = 0;
    bids.forEach((bid, i) => {
      bidSum += bid.amount;
      bids[i].sum = bidSum;
    });
    
    // Calculate spread
    const spread = asks.length > 0 && bids.length > 0 
      ? asks[0].price - bids[0].price
      : 0;
    
    return {
      asks,
      bids,
      spread,
      exchange: 'coinbase'
    };
  } catch (error) {
    console.error('[API] Failed to fetch Coinbase order book:', error);
    
    // Return mock data as a last resort
    return getMockOrderBook('coinbase');
  }
}

/**
 * Fetches the latest order book data from the Binance REST API
 */
export async function fetchBinanceOrderBook(
  symbol: string = 'BTCUSD',
  limit: number = 100
): Promise<OrderBook> {
  try {
    // Format the symbol for Binance (different symbols have different formats)
    const formattedSymbol = symbol.toUpperCase();
    
    // Fetch the data
    const response = await fetch(
      `${BINANCE_API_URL}/depth?symbol=${formattedSymbol}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Process the data into our standard format
    const asks = data.asks.map((entry: string[]) => {
      const price = parseFloat(entry[0]);
      const amount = parseFloat(entry[1]);
      
      return {
        price,
        amount,
        total: price * amount,
        sum: 0 // will be calculated below
      };
    });
    
    const bids = data.bids.map((entry: string[]) => {
      const price = parseFloat(entry[0]);
      const amount = parseFloat(entry[1]);
      
      return {
        price,
        amount,
        total: price * amount,
        sum: 0 // will be calculated below
      };
    });
    
    // Calculate cumulative sums
    let askSum = 0;
    asks.forEach((ask, i) => {
      askSum += ask.amount;
      asks[i].sum = askSum;
    });
    
    let bidSum = 0;
    bids.forEach((bid, i) => {
      bidSum += bid.amount;
      bids[i].sum = bidSum;
    });
    
    // Calculate spread
    const spread = asks.length > 0 && bids.length > 0 
      ? asks[0].price - bids[0].price
      : 0;
    
    return {
      asks,
      bids,
      spread,
      exchange: 'binance'
    };
  } catch (error) {
    console.error('[API] Failed to fetch Binance order book:', error);
    
    // Return mock data as a last resort
    return getMockOrderBook('binance');
  }
}

/**
 * Fetches order book data from the appropriate REST API based on exchange
 */
export async function fetchOrderBook(
  exchange: string,
  symbol: string = 'BTCUSD'
): Promise<OrderBook> {
  switch (exchange) {
    case 'bitfinex':
      return fetchBitfinexOrderBook(symbol);
    case 'coinbase':
      return fetchCoinbaseOrderBook(symbol);
    case 'binance':
      return fetchBinanceOrderBook(symbol);
    default:
      console.warn(`[API] Unknown exchange: ${exchange}, using mock data`);
      return getMockOrderBook(exchange as any);
  }
}