import { HalvingInfo } from '@/types';
import { useAppContext } from '@/context/AppContext';

/**
 * Props for the HalvingCountdown component
 * All props are optional as data can be fetched from context
 */
interface HalvingCountdownProps {
  halvingInfo?: HalvingInfo;
  error?: Error | null;
}

export default function HalvingCountdown({
  halvingInfo: propHalvingInfo,
  error: propError
}: HalvingCountdownProps) {
  // Get data from context if not provided via props
  const {
    halvingData: contextHalvingData,
    halvingError: contextError
  } = useAppContext();

  // Use props if provided, otherwise use context values
  const halvingInfo = propHalvingInfo || contextHalvingData;
  const error = propError || contextError;

  // Guard against missing data
  if (!halvingInfo) {
    return (
      <div className="rounded-sm overflow-hidden p-4 bg-dark-card animate-pulse">
        <div className="h-8 bg-dark-card rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-dark-card rounded mb-4"></div>
        <div className="h-12 bg-dark-card rounded"></div>
      </div>
    );
  }

  return (
    <section className="rounded-sm overflow-hidden" aria-labelledby="halving-title">
      <h2 id="halving-title" className="text-xl font-semibold mt-6 sm:mt-4 mb-6">
        Halving Countdown
      </h2>

      {/* Hero: Days remaining */}
      <div className="mb-6">
        <div className="flex items-baseline gap-3">
          <span className="text-5xl font-fuji-bold text-white">{halvingInfo.daysRemaining}</span>
          <span className="text-xl text-secondary">days</span>
        </div>
        <p className="text-sm text-muted mt-1">~{halvingInfo.date}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted mb-2">
          <span>{halvingInfo.blocksRemaining.toLocaleString()} blocks remaining</span>
          <span>{halvingInfo.progress}%</span>
        </div>
        <div className="w-full bg-divider rounded-full h-1.5" role="progressbar" aria-valuenow={halvingInfo.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-1.5 rounded-full" style={{ width: `${halvingInfo.progress}%`, backgroundColor: '#F7931A' }} aria-hidden="true"></div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <p className="text-sm text-muted mb-1">Current</p>
          <p className="text-lg font-fuji-bold text-white">{halvingInfo.currentReward} <span className="text-sm font-semibold text-secondary">BTC</span></p>
        </div>
        <div>
          <p className="text-sm text-muted mb-1">Next</p>
          <p className="text-lg font-fuji-bold">{halvingInfo.nextReward} <span className="text-sm font-semibold text-secondary">BTC</span></p>
        </div>
        <div>
          <p className="text-sm text-muted mb-1">Target</p>
          <p className="text-lg font-medium">{halvingInfo.targetBlock.toLocaleString()}</p>
        </div>
      </div>

      {/* Previous halvings */}
      <div className="pt-4 border-t border-divider">
        <p className="text-sm text-muted mb-2">Previous halvings</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-secondary">2024</span><span className="text-muted">6.25 → 3.125 BTC</span></div>
          <div className="flex justify-between"><span className="text-secondary">2020</span><span className="text-muted">12.5 → 6.25 BTC</span></div>
          <div className="flex justify-between"><span className="text-secondary">2016</span><span className="text-muted">25 → 12.5 BTC</span></div>
          <div className="flex justify-between"><span className="text-secondary">2012</span><span className="text-muted">50 → 25 BTC</span></div>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-error text-xs">Using cached data</p>
      )}
    </section>
  );
}