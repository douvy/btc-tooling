import { useState, useEffect } from 'react';
import { HalvingInfo } from '@/types';

// Default fallback data
const fallbackHalvingData: HalvingInfo = {
  daysRemaining: 1084,
  date: 'Mar. 31, 2028',
  blocksRemaining: 158881,
  currentReward: 6.25,
  nextReward: 3.125,
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
  const [halvingData, setHalvingData] = useState<HalvingInfo>(fallbackHalvingData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Flag to track if the component is mounted
    let isMounted = true;
    
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
        console.error('Failed to fetch halving data:', err);
        
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
              console.error('Error parsing cached halving data:', parseErr);
            }
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
        console.error('Error parsing cached halving data:', err);
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
  }, []);
  
  return {
    halvingData,
    isLoading,
    error
  };
}