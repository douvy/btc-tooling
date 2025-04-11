import { renderHook, act } from '@testing-library/react';
import { useOrderBookWebSocket } from '../useOrderBookWebSocket';
import { getMockOrderBook } from '@/lib/mockData';

// Mock the mockData module
jest.mock('@/lib/mockData', () => ({
  getMockOrderBook: jest.fn(() => ({
    asks: [
      { price: 62500, amount: 0.5, total: 31250, sum: 0.5 },
      { price: 62600, amount: 1.2, total: 75120, sum: 1.7 },
    ],
    bids: [
      { price: 62400, amount: 0.75, total: 46800, sum: 0.75 },
      { price: 62300, amount: 1.5, total: 93450, sum: 2.25 },
    ],
    spread: 100,
    exchange: 'bitfinex'
  }))
}));

// Mock WebSocket
class MockWebSocket {
  onopen: any;
  onclose: any;
  onmessage: any;
  onerror: any;
  readyState: number;
  
  constructor() {
    this.readyState = 0;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  send() {}
  close() {}
}

global.WebSocket = MockWebSocket as any;

describe('useOrderBookWebSocket Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useOrderBookWebSocket('BTCUSD', 'bitfinex'));
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.connectionStatus).toBe('connecting');
    expect(result.current.orderBook).toBeNull();
  });

  it('falls back to mock data', async () => {
    const { result, rerender } = renderHook(() => useOrderBookWebSocket('BTCUSD', 'bitfinex'));
    
    // Advance timers to allow mock data to be set
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    rerender();
    
    expect(getMockOrderBook).toHaveBeenCalledWith('bitfinex');
    expect(result.current.connectionStatus).toBe('fallback_mock');
    expect(result.current.orderBook).not.toBeNull();
  });

  it('updates performance metrics periodically', () => {
    const { result } = renderHook(() => useOrderBookWebSocket('BTCUSD', 'bitfinex'));
    
    const initialUpdateCount = result.current.performanceMetrics.updateCount;
    
    // Advance timers to trigger performance update
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.performanceMetrics.updateCount).toBeGreaterThan(initialUpdateCount);
  });

  it('handles different exchanges', () => {
    const { result: bitfinexResult } = renderHook(() => 
      useOrderBookWebSocket('BTCUSD', 'bitfinex')
    );
    
    const { result: coinbaseResult } = renderHook(() => 
      useOrderBookWebSocket('BTCUSD', 'coinbase')
    );
    
    const { result: binanceResult } = renderHook(() => 
      useOrderBookWebSocket('BTCUSD', 'binance')
    );
    
    // Advance timers to allow mock data to be set
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // All should be using mock data
    expect(getMockOrderBook).toHaveBeenCalledWith('bitfinex');
    expect(getMockOrderBook).toHaveBeenCalledWith('coinbase');
    expect(getMockOrderBook).toHaveBeenCalledWith('binance');
  });
});