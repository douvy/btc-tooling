import React from 'react';
import { render, screen } from '@testing-library/react';
import OrderBookTooltip from '../OrderBookTooltip';
import { act } from 'react-dom/test-utils';

describe('OrderBookTooltip Component', () => {
  // Mock window properties for mobile/desktop detection
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024 // Default to desktop view
    });
    
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when tooltip is not visible', () => {
    const { container } = render(
      <OrderBookTooltip
        isVisible={false}
        x={100}
        y={100}
        type="bid"
        price={62500}
        amount={0.5}
        total={31250}
        sum={2.5}
        totalSum={10}
        percentage={25}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders bid tooltip with correct content', () => {
    render(
      <OrderBookTooltip
        isVisible={true}
        x={100}
        y={100}
        type="bid"
        price={62500}
        amount={0.5}
        total={31250}
        sum={2.5}
        totalSum={10}
        percentage={25}
      />
    );
    
    // Check if tooltip content is displayed
    expect(screen.getByText('Buy @ $62500.00')).toBeInTheDocument();
    expect(screen.getByText('Size:')).toBeInTheDocument();
    expect(screen.getByText('Value:')).toBeInTheDocument();
    expect(screen.getByText('Cumulative:')).toBeInTheDocument();
    expect(screen.getByText('% of Book:')).toBeInTheDocument();
    expect(screen.getByText('25.00%')).toBeInTheDocument();
    expect(screen.getByText('Hover to explore the order book')).toBeInTheDocument();
  });

  it('renders ask tooltip with correct content', () => {
    render(
      <OrderBookTooltip
        isVisible={true}
        x={100}
        y={100}
        type="ask"
        price={62700}
        amount={0.75}
        total={47025}
        sum={3.25}
        totalSum={10}
        percentage={32.5}
      />
    );
    
    // Check if tooltip content is displayed
    expect(screen.getByText('Sell @ $62700.00')).toBeInTheDocument();
    expect(screen.getByText('32.50%')).toBeInTheDocument();
  });

  it('adapts to mobile view', async () => {
    // Set window width to mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500 // Mobile view
    });
    
    // Trigger resize to update mobile detection
    window.dispatchEvent(new Event('resize'));
    
    render(
      <OrderBookTooltip
        isVisible={true}
        x={100}
        y={100}
        type="bid"
        price={62500}
        amount={0.5}
        total={31250}
        sum={2.5}
        totalSum={10}
        percentage={25}
      />
    );
    
    // Check for mobile-specific elements
    expect(screen.getByText('Tap to place orders at this price')).toBeInTheDocument();
    expect(screen.getByText('BID')).toBeInTheDocument();
  });
  
  it('displays progress bar for percentage visualization', () => {
    render(
      <OrderBookTooltip
        isVisible={true}
        x={100}
        y={100}
        type="bid"
        price={62500}
        amount={0.5}
        total={31250}
        sum={2.5}
        totalSum={10}
        percentage={25}
      />
    );
    
    // Check for progress bar elements
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});