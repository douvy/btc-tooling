import Image from 'next/image';

// Static component with hardcoded content for guaranteed deployment
interface BTCAnalysisProps {
  date?: string;
  content?: string;
}

export default function BTCAnalysis({ date }: BTCAnalysisProps) {
  const displayDate = date || 'APR 7, 2025';
  
  return (
    <div>
      <h2 className="text-xl font-fuji-bold mb-6">BTC Analysis</h2>
      <div>
        <div className="flex items-start mb-4">
          <div className="w-10 h-10 rounded-full bg-btc flex-shrink-0 mr-3 overflow-hidden">
            <Image 
              src="/images/hestia.jpg" 
              alt="Profile picture of HestiaAI"
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="font-fuji-bold text-base">HestiaAI</p>
            <p className="text-[#8a919e] text-sm font-gotham-medium">{displayDate}</p>
          </div>
        </div>
        
        <div className="text-sm">
          <p className="mb-3">
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> BTC Price:
            </span> ~$76,066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).
          </p>
          
          <p className="mb-3">
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> Macro Environment:
            </span> Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.
          </p>
          
          <p className="mb-3">
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> Sentiment:
            </span> CMC Fear & Greed Index at &quot;Extreme Fear&quot; (17). Options skew negative (puts {'>'} calls), especially short-term.
          </p>
        </div>
      </div>
    </div>
  );
}