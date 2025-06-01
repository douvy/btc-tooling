import Image from 'next/image';
import { BitcoinPrice, TimeFrame } from '@/types';
import BitcoinPriceDisplay, { BitcoinPriceDisplayProps } from '@/components/bitcoin/BitcoinPriceDisplay';
import { useAppContext } from '@/context/AppContext';

/**
 * Props interface for the AppHeader component
 * All props are optional as data can be fetched from context
 */
interface AppHeaderProps {
  bitcoinData?: BitcoinPrice | null;
  timeframe?: TimeFrame;
  onTimeframeChange?: (timeframe: TimeFrame) => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: Error | null;
  priceChangeDirection?: 'up' | 'down' | null;
  latency?: number;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

/**
 * Main application header component that adapts to different screen sizes
 * Renders different header layouts based on viewport size and displays Bitcoin price data
 * 
 * @returns A responsive header with appropriate layout for current viewport
 */
export default function AppHeader(props: AppHeaderProps = {}) {
  // Get data from context
  const {
    bitcoinData: contextBitcoinData,
    timeframe: contextTimeframe,
    setTimeframe: contextSetTimeframe,
    isLoading: contextIsLoading,
    isRefreshing: contextIsRefreshing,
    error: contextError,
    priceChangeDirection: contextPriceChangeDirection,
    latency: contextLatency,
    connectionStatus: contextConnectionStatus
  } = useAppContext();
  
  // Use props if provided, otherwise use context
  const bitcoinData = props.bitcoinData || contextBitcoinData;
  const timeframe = props.timeframe || contextTimeframe;
  const onTimeframeChange = props.onTimeframeChange || contextSetTimeframe;
  const isLoading = props.isLoading !== undefined ? props.isLoading : contextIsLoading;
  const isRefreshing = props.isRefreshing !== undefined ? props.isRefreshing : contextIsRefreshing;
  const error = props.error || contextError;
  const priceChangeDirection = props.priceChangeDirection || contextPriceChangeDirection;
  const latency = props.latency !== undefined ? props.latency : contextLatency;
  const connectionStatus = props.connectionStatus || contextConnectionStatus;
  return (
    <header className="w-full border-b border-divider main-dark lg:sticky lg:top-0 z-20 backdrop-blur-md bg-main-dark bg-opacity-90" role="banner">
      {/* Desktop layout (lg and up) */}
      <DesktopHeader 
        bitcoinData={bitcoinData}
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        error={error}
        priceChangeDirection={priceChangeDirection}
        latency={latency}
        connectionStatus={connectionStatus}
      />
      
      {/* Medium layout (md to lg) */}
      <TabletHeader 
        bitcoinData={bitcoinData}
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        error={error}
        priceChangeDirection={priceChangeDirection}
        latency={latency}
        connectionStatus={connectionStatus}
      />
      
      {/* Mobile layout (sm and below) */}
      <MobileHeader />

      {/* Mobile price display - with increased padding and space */}
      <div className="md:hidden py-6 px-6">
        <BitcoinPriceDisplay 
          data={bitcoinData}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          variant="mobile"
          priceChangeDirection={priceChangeDirection}
          latency={latency}
          connectionStatus={connectionStatus as any}
        />
      </div>
    </header>
  );
}

function DesktopHeader({
  bitcoinData,
  timeframe,
  onTimeframeChange,
  isLoading,
  isRefreshing,
  error,
  priceChangeDirection,
  latency,
  connectionStatus,
}: AppHeaderProps) {
  return (
    <div className="hidden lg:flex items-center px-6 h-[80px]">
      {/* Left side with logo */}
      <div className="flex items-center flex-shrink-0">
        <LogoImage size={12} />
      </div>
      
      {/* Spacer */}
      <div className="flex-grow"></div>
      
      {/* Right side with price display - original API with latency monitor */}
      <div className="flex items-center">
        <BitcoinPriceDisplay 
          data={bitcoinData}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          variant="desktop"
          priceChangeDirection={priceChangeDirection}
          latency={latency}
          connectionStatus={connectionStatus as any}
        />
      </div>
    </div>
  );
}

function TabletHeader({
  bitcoinData,
  timeframe,
  onTimeframeChange,
  isLoading,
  isRefreshing,
  error,
  priceChangeDirection,
  latency,
  connectionStatus,
}: AppHeaderProps) {
  return (
    <div className="hidden md:block lg:hidden px-6">
      {/* Top row with logo */}
      <div className="flex items-center justify-between h-[72px]">
        <div className="flex items-center">
          <div className="flex items-center">
            <LogoImage size={12} />
            <h1 className="text-xl font-fuji-bold">BTC Tooling</h1>
          </div>
        </div>
        
        {/* Bitcoin price display - medium variant */}
        <BitcoinPriceDisplay 
          data={bitcoinData}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          error={error}
          variant="medium"
          priceChangeDirection={priceChangeDirection}
          latency={latency}
          connectionStatus={connectionStatus as any}
        />
      </div>
    </div>
  );
}

/**
 * Mobile header component for small screen sizes
 * Shows only the logo and app title
 */
function MobileHeader() {
  return (
    <div className="md:hidden px-6">
      {/* Top row with logo only */}
      <div className="flex items-center h-[60px]">
        <div className="flex items-center">
          <LogoImage size={10} />
          <h1 className="text-2xl font-fuji-bold">BTC Tooling</h1>
        </div>
      </div>
    </div>
  );
}

interface LogoImageProps {
  size: number;
}

function LogoImage({ size }: LogoImageProps) {
  const sizeClasses = {
    10: "w-10 h-10",
    12: "w-12 h-12"
  };
  
  const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || "w-10 h-10";
  
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center mr-3`}>
      <Image src="/images/logo.png" alt="BTC Tooling Logo" width={40} height={40} className="w-full object-cover" />
    </div>
  );
}