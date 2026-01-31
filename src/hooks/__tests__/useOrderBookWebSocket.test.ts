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

  it('returns expected hook interface', () => {
    const { result } = renderHook(() => useOrderBookWebSocket('BTCUSD', 'bitfinex'));

    // Verify the hook returns all expected properties
    expect(result.current).toHaveProperty('orderBook');
    expect(result.current).toHaveProperty('connectionStatus');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('lastUpdated');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('performanceMetrics');
  });

  it('has valid connection status', () => {
    const { result } = renderHook(() => useOrderBookWebSocket('BTCUSD', 'bitfinex'));

    const validStatuses = ['connecting', 'connected', 'disconnected', 'reconnecting', 'error', 'fallback_rest', 'fallback_cache'];
    expect(validStatuses).toContain(result.current.connectionStatus);
  });

  it('has performance metrics structure', () => {
    const { result } = renderHook(() => useOrderBookWebSocket('BTCUSD', 'bitfinex'));

    expect(result.current.performanceMetrics).toHaveProperty('fps');
    expect(result.current.performanceMetrics).toHaveProperty('updateCount');
    expect(result.current.performanceMetrics).toHaveProperty('averageUpdateTime');
  });
});