# Real-Time Bitcoin Halving Countdown

This feature adds a real-time Bitcoin halving countdown component that displays accurate data about the next Bitcoin halving event, with live updates from blockchain data.

## How It Works

1. The application fetches the current block height from the Blockchain.info API
2. Calculates the target block for the next halving (every 210,000 blocks)
3. Computes the estimated time remaining based on average block generation time
4. Displays a visual countdown with blocks remaining, current and future block rewards, and progress

## Technical Implementation

- Created a Next.js API route at `/api/halving` that fetches and processes blockchain data
- Implements a custom React hook `useHalvingData` for data fetching and state management
- Features client-side caching with localStorage to minimize API calls
- Includes robust error handling and fallback to cached data
- Provides manual refresh functionality for immediate updates

## Component Features

- Interactive circular countdown display
- Blocks remaining with visual progress bar
- Current and next block reward values
- Target block number display
- Historical halving information
- Real-time refresh capability

## Future Improvements

- Add countdown to seconds level precision
- Implement WebSocket connection for real-time block notifications
- Include price predictions and historical price data at previous halvings
- Add educational content about the significance of halving events

## Implementation Details

The halving countdown system consists of three main components:

1. **API Endpoint** (`/api/halving/route.ts`): Fetches blockchain data and calculates halving metrics
2. **Data Hook** (`/hooks/useHalvingData.ts`): Manages data fetching, caching, and state
3. **UI Component** (`/components/bitcoin/HalvingCountdown.tsx`): Renders the visual countdown

## Usage Example

```tsx
import { useHalvingData } from '@/hooks/useHalvingData';
import HalvingCountdown from '@/components/bitcoin/HalvingCountdown';

export default function MyPage() {
  const { halvingData, isLoading, error } = useHalvingData();
  
  const refreshData = async () => {
    // Manual refresh logic
  };
  
  return (
    <HalvingCountdown 
      halvingInfo={halvingData}
      isLoading={isLoading}
      error={error}
      onRefresh={refreshData}
    />
  );
}
```