import { useState } from 'react';
import { TimeFrame } from '@/types';

export function useTimeframe(initialTimeframe: TimeFrame = '1D') {
  const [timeframe, setTimeframe] = useState<TimeFrame>(initialTimeframe);

  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    setTimeframe(newTimeframe);
    console.log('Timeframe changed to:', newTimeframe);
    // In a real implementation, this would fetch new data
  };

  return {
    timeframe,
    setTimeframe: handleTimeframeChange,
  };
}