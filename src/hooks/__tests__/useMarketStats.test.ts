import { renderHook, waitFor } from '@testing-library/react';
import { useMarketStats } from '../useMarketStats';
import { MarketStats } from '@/types';

const mockStats: MarketStats = {
  satsPerDollar: 1583,
  marketCap: 1_270_000_000_000,
  supplyPercentIssued: 95.48,
  athPrice: 126_160,
  athPercentChange: -49.9,
  daysSinceAth: 272,
  hashRateEhs: 955,
  fastestFee: 1,
  blockHeight: 956_872,
};

describe('useMarketStats', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns data on successful fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    const { result } = renderHook(() => useMarketStats());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it('sets error on non-ok response (e.g. 503) without data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'Failed to fetch market stats' }),
    });

    const { result } = renderHook(() => useMarketStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toContain('503');
  });

  it('keeps last good data when a refresh fails', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    });

    const { result } = renderHook(() => useMarketStats());
    await waitFor(() => expect(result.current.data).toEqual(mockStats));

    // Next poll fails
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    jest.advanceTimersByTime(60_000);

    await waitFor(() => expect(result.current.error?.message).toBe('network down'));
    // Last good data is retained
    expect(result.current.data).toEqual(mockStats);
    jest.useRealTimers();
  });
});
