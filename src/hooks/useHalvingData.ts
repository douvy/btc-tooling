import { useState, useEffect, useCallback } from 'react';
import { HalvingInfo } from '@/types';

// Only log in development mode
const isDev = process.env.NODE_ENV === 'development';

// Default fallback data - updated for post-2024 halving
const fallbackHalvingData: HalvingInfo = {
  daysRemaining: 1084,
  date: 'Mar. 31, 2028',
  blocksRemaining: 158881,
  currentReward: 3.125,   // Current reward after 2024 halving
  nextReward: 1.5625,     // Next halving will be to 1.5625 BTC
  targetBlock: 1050000,
  progress: 15
};

/**
 * Hook to fetch Bitcoin halving countdown data
 * 
 * Attempts to fetch data from the API, with fallback to default data
 * Implements data caching to minimize API requests
 * Refreshes data every 6 hours
 * 
 * @returns Object containing the halving data and loading state
 */
export function useHalvingData() {
  const [halvingData, setHalvingData] = useState<HalvingInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  // Add state to track refresh requests
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  useEffect(() => {
    // Flag to track if the component is mounted
    let isMounted = true;
    
    // Track manual refresh requests
    // (removed debug logging)
    
    const fetchHalvingData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/halving');
        
        if (!response.ok) {
          throw new Error(`Error fetching halving data: ${response.status}`);
        }
        
        const data: HalvingInfo = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted) {
          setHalvingData(data);
          setIsLoading(false);
          
          // Store in local storage with timestamp for caching
          localStorage.setItem('halvingData', JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);

          // Try to use cached data from localStorage if available
          const cachedData = localStorage.getItem('halvingData');
          if (cachedData) {
            try {
              const { data } = JSON.parse(cachedData);
              setHalvingData(data);
            } catch (parseErr) {
              // Cache parse failed, use fallback
              setHalvingData(fallbackHalvingData);
            }
          } else {
            // No cache, use fallback
            setHalvingData(fallbackHalvingData);
          }
        }
      }
    };
    
    // Check if we have cached data that's recent enough (less than 6 hours old)
    const cachedData = localStorage.getItem('halvingData');
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        
        if (now - timestamp < SIX_HOURS) {
          // Use cached data if it's less than 6 hours old
          setHalvingData(data);
          setIsLoading(false);
        } else {
          // Cached data is too old, fetch fresh data
          fetchHalvingData();
        }
      } catch (err) {
        // Handle parse errors silently
        fetchHalvingData();
      }
    } else {
      // No cached data, fetch fresh data
      fetchHalvingData();
    }
    
    // Set up a timer to refresh data every 6 hours
    const intervalId = setInterval(fetchHalvingData, SIX_HOURS);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshCounter]); // Include refreshCounter in dependencies to trigger data fetch on manual refresh
  
  /**
   * Manually trigger a refresh of the halving data
   * This function is safe to call multiple times in succession
   * It will clear localStorage cache and trigger a fresh API call
   */
  const refreshData = useCallback(() => {
    // Clear the localStorage cache to force a fresh API call
    try {
      localStorage.removeItem('halvingData');
    } catch (err) {
      // Silently handle localStorage errors
    }
    
    // Increment the refresh counter to trigger the effect
    setRefreshCounter(prev => prev + 1);
    
    // Set loading state to true for visual feedback
    setIsLoading(true);
  }, []);

  return {
    halvingData,
    isLoading,
    error,
    refreshData
  };
}