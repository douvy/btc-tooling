import { useState, useEffect } from 'react';
import { MarketStats } from '@/types';

const REFRESH_INTERVAL = 60000; // 60 seconds

export function useMarketStats() {
  const [data, setData] = useState<MarketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/market-stats');
        if (!response.ok) {
          throw new Error(`Failed to fetch market stats: ${response.status}`);
        }
        const stats: MarketStats = await response.json();
        setData(stats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return { data, isLoading, error };
}
