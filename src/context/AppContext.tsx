'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  ReactNode 
} from 'react';
import { BitcoinPrice, TimeFrame, HalvingInfo, AnalysisData, OrderBook as OrderBookType } from '@/types';
import { useBitcoinPrice } from '@/hooks/useBitcoinPrice';
import { useHalvingData } from '@/hooks/useHalvingData';

/**
 * Application global state interface
 * 
 * This context provides centralized state management for the Bitcoin Tooling application.
 * It contains several logical sections:
 * 
 * 1. Bitcoin price data - Real-time price information with timeframe control
 * 2. Halving data - Information about the upcoming Bitcoin halving event
 * 3. Order book data - Real-time market depth from exchanges
 * 4. Error handling - Centralized error state management
 * 5. UI effects - Document title updates and other UI-related functionality
 * 
 * @example
 * // Basic usage in a component
 * function MyComponent() {
 *   const { bitcoinData, timeframe, setTimeframe } = useAppContext();
 *   return <div>Current price: ${bitcoinData?.price}</div>;
 * }
 */
interface AppContextState {
  // Bitcoin price data
  bitcoinData: BitcoinPrice | null;
  timeframe: TimeFrame;
  setTimeframe: (timeframe: TimeFrame) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  priceChangeDirection: 'up' | 'down' | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  latency: number;
  
  // Halving countdown data
  halvingData: HalvingInfo | null;
  isHalvingLoading: boolean;
  refreshHalvingData: () => void;
  
  // OrderBook data
  orderBookData: OrderBookType | null;
  setOrderBookData: React.Dispatch<React.SetStateAction<OrderBookType | null>>;
  orderBookStatus: {
    isLoading: boolean;
    error: Error | null;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
    lastUpdated: Date | null;
  };
  setOrderBookStatus: React.Dispatch<React.SetStateAction<{
    isLoading: boolean;
    error: Error | null;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
    lastUpdated: Date | null;
  }>>;
  
  // Error handling
  error: Error | null;
  halvingError: Error | null;
  setGlobalError: (error: Error | null) => void;
  clearError: () => void;
  hasError: boolean;
  
  // Side effects
  updateDocumentTitle: (price: number | undefined) => void;
}

// Create context with undefined initial value
const AppContext = createContext<AppContextState | undefined>(undefined);

/**
 * Global application state provider
 * 
 * This component provides the application context to all children in the component tree.
 * It's responsible for:
 * 
 * 1. Initializing all application state
 * 2. Setting up data fetching hooks
 * 3. Managing global error state
 * 4. Providing UI effects like document title updates
 * 
 * Performance note: This provider should be placed high in the component tree,
 * but not at the very root to avoid re-rendering unrelated parts of the app.
 * Consider using multiple specialized providers if certain state is only needed
 * in specific sections of the application.
 * 
 * @param props.children - Child components that will have access to the context
 */
export function AppProvider({ children }: { children: ReactNode }) {
  // Use Bitcoin price hook
  const { 
    timeframe, 
    setTimeframe, 
    bitcoinData, 
    isLoading, 
    error, 
    isRefreshing,
    priceChangeDirection,
    latency,
    connectionStatus
  } = useBitcoinPrice('1D');
  
  // Use halving data hook
  const { 
    halvingData, 
    isLoading: isHalvingLoading, 
    error: halvingError,
    refreshData: refreshHalvingDataFromHook 
  } = useHalvingData();
  
  // Global error state
  const [globalError, setGlobalError] = useState<Error | null>(null);
  
  // Clear error handler
  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);
  
  // Document title update handler
  const updateDocumentTitle = useCallback((price: number | undefined) => {
    if (price) {
      const formattedPrice = price.toLocaleString('en-US', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      document.title = `$${formattedPrice} - BTC Tooling`;
    }
  }, []);
  
  // Update document title when bitcoin price changes
  useEffect(() => {
    updateDocumentTitle(bitcoinData?.price);
  }, [bitcoinData?.price, updateDocumentTitle]);
  
  // Refresh halving data wrapper function
  const refreshHalvingData = useCallback(() => {
    try {
      refreshHalvingDataFromHook();
    } catch (err) {
      // Instead of silently handling, add error to context
      if (err instanceof Error) {
        setGlobalError(err);
      }
    }
  }, [refreshHalvingDataFromHook, setGlobalError]);
  
  // Add orderBook data to context
  const [orderBookData, setOrderBookData] = useState<OrderBookType | null>(null);
  const [orderBookStatus, setOrderBookStatus] = useState<{
    isLoading: boolean;
    error: Error | null;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
    lastUpdated: Date | null;
  }>({
    isLoading: true,
    error: null,
    connectionStatus: 'connecting',
    lastUpdated: null
  });

  // Context value
  const contextValue: AppContextState = {
    // Bitcoin price data
    bitcoinData,
    timeframe,
    setTimeframe,
    isLoading,
    isRefreshing,
    priceChangeDirection,
    connectionStatus,
    latency,
    
    // Halving data
    halvingData,
    isHalvingLoading,
    refreshHalvingData,
    
    // OrderBook data
    orderBookData,
    setOrderBookData,
    orderBookStatus,
    setOrderBookStatus,
    
    // Error handling
    error: error || globalError,
    halvingError,
    setGlobalError,
    clearError,
    hasError: !!(error || halvingError || globalError),
    
    // Side effects
    updateDocumentTitle
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access the application context
 * 
 * This hook provides type-safe access to the global application state.
 * It automatically checks that it's being used within an AppProvider and
 * throws a helpful error message if not.
 * 
 * Performance considerations:
 * - The context contains many values that update at different frequencies
 * - For optimal performance, only destructure the values you need
 * - Consider using useMemo for derived values from context data
 * 
 * @example
 * // Only destructure what you need to minimize re-renders
 * const { halvingData } = useAppContext();
 * 
 * // Derive values with useMemo when appropriate
 * const formattedPrice = useMemo(() => {
 *   const { bitcoinData } = useAppContext();
 *   return bitcoinData ? `$${bitcoinData.price.toLocaleString()}` : '-';
 * }, [bitcoinData]);
 * 
 * @returns The application context state
 * @throws {Error} If used outside of AppProvider
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}