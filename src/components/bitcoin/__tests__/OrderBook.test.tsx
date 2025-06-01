import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

// Import the OrderBook component
import OrderBook from '../OrderBook';

// Mock the useOrderBookWebSocket hook
jest.mock('@/hooks/useOrderBookWebSocket', () => ({
  useOrderBookWebSocket: jest.fn(() => ({
    orderBook: {
      asks: [
        { price: 62500, amount: 0.5, total: 31250, sum: 0.5 },
        { price: 62600, amount: 1.2, total: 75120, sum: 1.7 },
        { price: 62700, amount: 0.8, total: 50160, sum: 2.5 },
      ],
      bids: [
        { price: 62400, amount: 0.75, total: 46800, sum: 0.75 },
        { price: 62300, amount: 1.5, total: 93450, sum: 2.25 },
        { price: 62200, amount: 0.4, total: 24880, sum: 2.65 },
      ],
      spread: 100,
      exchange: 'bitfinex'
    },
    connectionStatus: 'connected',
    error: null,
    lastUpdated: new Date(),
    isLoading: false,
    performanceMetrics: {
      fps: 5,
      updateCount: 10,
      averageUpdateTime: 8.5
    }
  }))
}));

// Mock window.innerWidth for responsive tests
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024 // Default to desktop view for most tests
});

describe('OrderBook Component', () => {
  beforeEach(() => {
    // Mock window.innerWidth for responsive design tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024 // Default to desktop view
    });
    
    // Reset window event listeners
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with correct title', () => {
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    expect(screen.getByText('Order Book')).toBeInTheDocument();
  });

  it('displays exchange tabs correctly', () => {
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    expect(screen.getByText('Bitfinex')).toBeInTheDocument();
    expect(screen.getByText('Coinbase')).toBeInTheDocument();
    expect(screen.getByText('Binance')).toBeInTheDocument();
  });

  it('displays the amount controls correctly', () => {
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    
    // Test presence of amount input
    expect(screen.getByText('BTC')).toBeInTheDocument();
    
    // Test increment and decrement buttons
    const decrementButton = screen.getByLabelText('Decrease amount');
    const incrementButton = screen.getByLabelText('Increase amount');
    expect(decrementButton).toBeInTheDocument();
    expect(incrementButton).toBeInTheDocument();
  });

  it('handles amount changes', () => {
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    
    // Test increment
    const incrementButton = screen.getByLabelText('Increase amount');
    fireEvent.click(incrementButton);
    
    // Get the amount input and check if it's updated
    const amountInput = screen.getByLabelText('Amount in BTC') as HTMLInputElement;
    expect(parseFloat(amountInput.value)).toBeGreaterThan(0);
  });

  it('displays ask and bid orders', () => {
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    
    // Check if asks and bids are displayed
    expect(screen.getAllByText('62500.00')[0]).toBeInTheDocument(); // First ask price
    expect(screen.getAllByText('62400.00')[0]).toBeInTheDocument(); // First bid price
  });

  it('switches between view modes', async () => {
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    
    // Test view mode buttons
    const sumButton = screen.getByText('Sum');
    const detailedButton = screen.getByText('Detailed');
    
    expect(sumButton).toBeInTheDocument();
    expect(detailedButton).toBeInTheDocument();
    
    // Click on Detailed button
    fireEvent.click(detailedButton);
    await waitFor(() => {
      // In detailed mode, we should see "Total" instead of "Sum"
      expect(screen.getByText('Total (USD)')).toBeInTheDocument();
    });
  });

  it('adapts to mobile view', async () => {
    // Set window width to mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500 // Mobile view
    });
    
    // Force window resize event
    window.dispatchEvent(new Event('resize'));
    
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    
    // Wait for mobile detection to take effect
    await waitFor(() => {
      // Check for mobile-specific elements
      expect(screen.getByText('Amt')).toBeInTheDocument(); // Mobile has abbreviated labels
    });
  });

  it('displays connection status correctly', () => {
    render(<OrderBook currentPrice={62450} priceChange={1.2} />);
    
    // Check for connection status indicator
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});