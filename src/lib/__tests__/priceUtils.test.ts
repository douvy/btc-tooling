import { formatPrice, formatPercentage, calculatePriceChange } from '../priceUtils';

describe('Price Utility Functions', () => {
  describe('formatPrice', () => {
    it('formats prices correctly with default options (includes $ symbol)', () => {
      expect(formatPrice(1234.5678)).toBe('$1,234.57');
      expect(formatPrice(1.2)).toBe('$1.20');
      expect(formatPrice(1000000)).toBe('$1,000,000.00');
    });

    it('respects the decimals parameter', () => {
      expect(formatPrice(1234.5678, 4)).toBe('$1,234.5678');
      expect(formatPrice(1.2, 0)).toBe('$1');
      expect(formatPrice(1000000, 1)).toBe('$1,000,000.0');
    });

    it('handles currency symbol', () => {
      expect(formatPrice(1234.56, 2, '$')).toBe('$1,234.56');
      expect(formatPrice(1234.56, 2, '€')).toBe('€1,234.56');
      expect(formatPrice(1234.56, 2, '')).toBe('1,234.56');
    });

    it('handles zero and negative values', () => {
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(-1234.56)).toBe('$-1,234.56');
    });
  });
  
  describe('formatPercentage', () => {
    it('formats percentages correctly with default options', () => {
      expect(formatPercentage(12.345)).toBe('12.35%');
      expect(formatPercentage(1.2)).toBe('1.20%');
      expect(formatPercentage(100)).toBe('100.00%');
    });
    
    it('respects the decimals parameter', () => {
      expect(formatPercentage(12.345, 3)).toBe('12.345%');
      expect(formatPercentage(1.2, 0)).toBe('1%');
      expect(formatPercentage(100, 1)).toBe('100.0%');
    });
    
    it('handles zero and negative values', () => {
      expect(formatPercentage(0)).toBe('0.00%');
      expect(formatPercentage(-12.345)).toBe('-12.35%');
    });
    
    it('shows plus sign when requested', () => {
      expect(formatPercentage(12.345, 2, true)).toBe('+12.35%');
      expect(formatPercentage(-12.345, 2, true)).toBe('-12.35%');
      expect(formatPercentage(0, 2, true)).toBe('0.00%');
    });
  });
  
  describe('calculatePriceChange', () => {
    it('calculates price change correctly', () => {
      expect(calculatePriceChange(100, 110)).toEqual({
        change: 10,
        changePercent: 10,
        direction: 'up'
      });
      
      expect(calculatePriceChange(100, 90)).toEqual({
        change: -10,
        changePercent: -10,
        direction: 'down'
      });
    });
    
    it('handles zero values', () => {
      expect(calculatePriceChange(0, 100)).toEqual({
        change: 100,
        changePercent: 0, // Avoid division by zero
        direction: 'up'
      });
      
      expect(calculatePriceChange(100, 100)).toEqual({
        change: 0,
        changePercent: 0,
        direction: 'up' // No change is considered "up" by convention
      });
    });
  });
});