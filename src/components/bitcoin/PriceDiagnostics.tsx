import React, { useState, useEffect } from 'react';
import { lastUpdateTimestamp, updateStatus } from '@/lib/api';

interface PriceDiagnosticsProps {
  visible?: boolean;
  onRefresh?: () => void;
  bitcoinPrice?: number | null;
  lastInterval?: number;
}

/**
 * Enhanced diagnostic component that shows data update status, errors,
 * and provides debugging tools
 */
export default function PriceDiagnostics({ 
  visible = true, 
  onRefresh, 
  bitcoinPrice = null,
  lastInterval = 0 
}: PriceDiagnosticsProps) {
  const [timestamps, setTimestamps] = useState(lastUpdateTimestamp);
  const [status, setStatus] = useState(updateStatus);
  const [time, setTime] = useState(new Date());
  const [expanded, setExpanded] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [lastRefreshTimes, setLastRefreshTimes] = useState<number[]>([]);
  
  // Update every second to show fresh times
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimestamps({...lastUpdateTimestamp});
      setStatus({...updateStatus});
      setTime(new Date());
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Track refreshes for analytics
  useEffect(() => {
    if (timestamps.dataUpdate > 0 && !lastRefreshTimes.includes(timestamps.dataUpdate)) {
      setRefreshCount(prev => prev + 1);
      setLastRefreshTimes(prev => {
        const newTimes = [...prev, timestamps.dataUpdate].slice(-10); // keep last 10 refresh times
        return newTimes;
      });
    }
  }, [timestamps.dataUpdate, lastRefreshTimes]);
  
  // Calculate average interval between updates
  const getAverageInterval = () => {
    if (lastRefreshTimes.length < 2) return 0;
    
    let totalInterval = 0;
    for (let i = 1; i < lastRefreshTimes.length; i++) {
      totalInterval += lastRefreshTimes[i] - lastRefreshTimes[i-1];
    }
    
    return Math.round(totalInterval / (lastRefreshTimes.length - 1));
  };
  
  if (!visible) return null;
  
  const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    
    const date = new Date(timestamp);
    const seconds = Math.floor((time.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return date.toLocaleTimeString();
  };
  
  // Calculate interval health (should be close to 5000ms)
  const avgInterval = getAverageInterval();
  const intervalHealth = avgInterval === 0 ? 'n/a' : 
    avgInterval > 4800 && avgInterval < 5200 ? 'Good' :
    avgInterval > 4500 && avgInterval < 5500 ? 'Fair' : 'Poor';
  
  return (
    <div className="fixed bottom-0 right-0 bg-gray-800 bg-opacity-90 text-white text-xs p-2 m-2 rounded-md z-50 font-mono max-w-[300px]">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="mr-2 text-gray-400 hover:text-white"
            aria-label={expanded ? "Collapse diagnostics" : "Expand diagnostics"}
          >
            {expanded ? '▼' : '►'}
          </button>
          <span className="font-bold">BTC Price Diagnostics</span>
        </div>
        <button 
          onClick={onRefresh} 
          className="bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 text-xs"
        >
          Refresh Now
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>Last Data Update:</div>
        <div className={timestamps.dataUpdate > 0 && (time.getTime() - timestamps.dataUpdate) < 10000 ? 'text-green-400' : 'text-gray-400'}>
          {formatTime(timestamps.dataUpdate)}
        </div>
        
        <div>Current Price:</div>
        <div className="text-green-400">
          {bitcoinPrice ? `$${bitcoinPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : 'Unknown'}
        </div>
        
        <div>Refresh Interval:</div>
        <div className={
          intervalHealth === 'Good' ? 'text-green-400' : 
          intervalHealth === 'Fair' ? 'text-yellow-400' : 'text-red-400'
        }>
          {avgInterval ? `${avgInterval}ms (${intervalHealth})` : 'Calculating...'}
        </div>
        
        <div>Status:</div>
        <div className={`${status.hasError ? 'text-red-400' : status.isFetching ? 'text-yellow-400' : 'text-green-400'}`}>
          {status.hasError ? 'Error' : status.isFetching ? 'Fetching...' : 'Ready'}
        </div>
        
        {status.hasError && (
          <div className="col-span-2 text-red-400 truncate" title={status.errorMessage}>
            {status.errorMessage}
          </div>
        )}
        
        {expanded && (
          <>
            <div className="col-span-2 border-t border-gray-700 mt-1 pt-1"></div>
            
            <div>Last API Call:</div>
            <div className={timestamps.apiCall > 0 && (time.getTime() - timestamps.apiCall) < 10000 ? 'text-green-400' : 'text-gray-400'}>
              {formatTime(timestamps.apiCall)}
            </div>
            
            <div>Last Error:</div>
            <div className={timestamps.error > 0 && (time.getTime() - timestamps.error) < 30000 ? 'text-red-400' : 'text-gray-400'}>
              {formatTime(timestamps.error)}
            </div>
            
            <div>API Status:</div>
            <div className={`${status.lastStatus < 200 || status.lastStatus >= 400 ? 'text-red-400' : 'text-green-400'}`}>
              {status.lastStatus}
            </div>
            
            <div>Total Updates:</div>
            <div className="text-gray-400">{refreshCount}</div>
            
            <div>Time Range:</div>
            <div className="text-gray-400">
              {lastRefreshTimes.length > 1 
                ? `${((lastRefreshTimes[lastRefreshTimes.length-1] - lastRefreshTimes[0])/1000).toFixed(1)}s`
                : 'n/a'}
            </div>
          </>
        )}
        
        <div className="col-span-2 text-gray-400 text-center text-[10px] mt-1">
          {time.toLocaleTimeString()} - {expanded ? "Click ▼ to collapse" : "Click ► for more details"}
        </div>
      </div>
    </div>
  );
}