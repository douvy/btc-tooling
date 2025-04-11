import { getMockOrderBook, getMockBitcoinPrice } from '../mockData';

describe('Mock Data Functions', () => {
  describe('getMockOrderBook', () => {
    it('generates order book data for bitfinex exchange', () => {
      const orderBook = getMockOrderBook('bitfinex');
      
      expect(orderBook).toHaveProperty('asks');
      expect(orderBook).toHaveProperty('bids');
      expect(orderBook).toHaveProperty('spread');
      expect(orderBook.exchange).toBe('bitfinex');
      
      // Check structure of asks and bids
      expect(orderBook.asks.length).toBeGreaterThan(0);
      expect(orderBook.bids.length).toBeGreaterThan(0);
      
      // Check first ask entry
      const firstAsk = orderBook.asks[0];
      expect(firstAsk).toHaveProperty('price');
      expect(firstAsk).toHaveProperty('amount');
      expect(firstAsk).toHaveProperty('total');
      expect(firstAsk).toHaveProperty('sum');
      
      // Check first bid entry
      const firstBid = orderBook.bids[0];
      expect(firstBid).toHaveProperty('price');
      expect(firstBid).toHaveProperty('amount');
      expect(firstBid).toHaveProperty('total');
      expect(firstBid).toHaveProperty('sum');
      
      // Check order of asks and bids
      if (orderBook.asks.length > 1) {
        expect(orderBook.asks[0].price).toBeLessThan(orderBook.asks[1].price);
      }
      
      if (orderBook.bids.length > 1) {
        expect(orderBook.bids[0].price).toBeGreaterThan(orderBook.bids[1].price);
      }
      
      // Check spread calculation
      if (orderBook.asks.length > 0 && orderBook.bids.length > 0) {
        expect(orderBook.spread).toBeCloseTo(orderBook.asks[0].price - orderBook.bids[0].price);
      }
    });
    
    it('generates order book data for coinbase exchange', () => {
      const orderBook = getMockOrderBook('coinbase');
      expect(orderBook.exchange).toBe('coinbase');
    });
    
    it('generates order book data for binance exchange', () => {
      const orderBook = getMockOrderBook('binance');
      expect(orderBook.exchange).toBe('binance');
    });
    
    it('defaults to bitfinex for unknown exchanges', () => {
      const orderBook = getMockOrderBook('unknown' as any);
      expect(orderBook.exchange).toBe('bitfinex');
    });
  });
  
  describe('getMockBitcoinPrice', () => {
    it('generates bitcoin price data with expected properties', () => {
      const price = getMockBitcoinPrice();
      
      expect(price).toHaveProperty('price');
      expect(price).toHaveProperty('change');
      expect(price).toHaveProperty('changePercent');
      expect(price).toHaveProperty('direction');
      
      // Check if price is reasonable for Bitcoin
      expect(price.price).toBeGreaterThan(1000);
      
      // Check if direction matches change
      if (price.change > 0) {
        expect(price.direction).toBe('up');
      } else if (price.change < 0) {
        expect(price.direction).toBe('down');
      }
      
      // Check if changePercent is calculated correctly
      const calculatedPercent = (price.change / (price.price - price.change)) * 100;
      expect(price.changePercent).toBeCloseTo(calculatedPercent, 1);
    });
  });
});