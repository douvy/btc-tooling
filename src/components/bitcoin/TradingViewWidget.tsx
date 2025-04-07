import { TimeFrame } from '@/types';
import { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  timeframe: TimeFrame;
  onError: () => void;
  onLoaded: () => void;
}

// Add type definition for TradingView global
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: any) => any;
    };
  }
}

// Mapping our app timeframes to TradingView intervals
const timeframeMap: Record<TimeFrame, string> = {
  '1H': '60',     // 60 minutes
  '1D': 'D',      // 1 day
  '1W': 'W',      // 1 week
  '1M': 'M',      // 1 month
  '1Y': '12M',    // 12 months = 1 year
  'ALL': 'ALL'    // All time
};

// Creating a script tag once to avoid duplicates
let scriptAdded = false;

export default function TradingViewWidget({ 
  timeframe, 
  onError, 
  onLoaded 
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // This effect loads the script, sets up the widget, and handles cleanup
  useEffect(() => {
    // Track whether we've mounted this component
    let isMounted = true;
    
    // Clean error handling helper
    const safeOnError = () => {
      if (isMounted) {
        onError();
      }
    };
    
    // Generate a unique ID for the container
    const containerId = 'tradingview_' + Math.random().toString(36).substring(2, 10);
    
    // Try to create the widget with the TradingView object if it exists
    const tryCreateWidget = () => {
      // Create a new div element for the TradingView widget to use
      if (!containerRef.current) return false;
      
      // Set the ID on the container
      containerRef.current.id = containerId;
      
      try {
        // Check if TradingView object exists and is a function
        if (
          typeof window !== 'undefined' && 
          window.TradingView && 
          typeof window.TradingView.widget === 'function'
        ) {
          new window.TradingView.widget({
            container_id: containerId,
            symbol: 'BITFINEX:BTCUSD',
            interval: timeframeMap[timeframe],
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',  // Candlestick chart
            locale: 'en',
            toolbar_bg: '#131722',
            enable_publishing: false,
            allow_symbol_change: false,
            hide_side_toolbar: false,
            details: true,
            studies: ['Volume@tv-basicstudies'],
            height: '100%',
            width: '100%',
            autosize: true,
            show_popup_button: true,
            // Using standard TradingView appearance
            disabled_features: [
              'header_symbol_search',
              'header_compare'
            ],
            enabled_features: [
              'use_localstorage_for_settings'
            ],
            charts_storage_url: 'https://saveload.tradingview.com',
            client_id: 'tradingview.com',
            user_id: 'public_user_id',
          });
          
          // Signal success immediately - don't add a delay which could cause refresh issues
          if (isMounted) {
            onLoaded();
          }
          return true;
        }
        return false;
      } catch (e) {
        console.error('TradingView widget creation failed:', e);
        safeOnError();
        return false;
      }
    };
    
    // First try to create widget immediately if TradingView is already loaded
    if (tryCreateWidget()) {
      return;
    }
    
    // If not successful, we need to load the script
    if (!scriptAdded) {
      scriptAdded = true;
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.id = 'tradingview-script';
      
      // Once loaded, try again to create widget
      script.onload = () => {
        // Try immediately without any delay
        if (!tryCreateWidget() && isMounted) {
          safeOnError();
        }
      };
      
      script.onerror = () => {
        console.error('Failed to load TradingView script');
        safeOnError();
      };
      
      document.head.appendChild(script);
    } else {
      // Script already added but not ready yet, just go to error handler
      // This avoids any polling or timers that might cause refreshes
      safeOnError();
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [timeframe, onError, onLoaded]);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      aria-label={`Bitcoin price chart with ${timeframe} timeframe`}
    />
  );
}