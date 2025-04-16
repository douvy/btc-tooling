import Image from 'next/image';
import { useState } from 'react';

// Static component with hardcoded content for guaranteed deployment
interface BTCAnalysisProps {
  date?: string;
  content?: string;
}

export default function BTCAnalysis({ date }: BTCAnalysisProps) {
  const displayDate = date || 'APR 7, 2025';
  const [expanded, setExpanded] = useState(false);
  
  // First half of assessment - shortened to move the Show More link 4 lines higher
  const initialAssessment = "The Bitcoin market is currently weathering a severe global risk-off storm";
  
  // Rest of assessment to show when expanded - includes the content that was removed from initial
  const fullAssessment = " triggered by aggressive US trade policies. While correlated downside risk is evident, Bitcoin is exhibiting notable relative strength and rising dominance, supported by massive structural inflows via ETFs and a potentially favorable long-term liquidity environment driven by global debt dynamics. On-chain metrics do not signal a cycle top, and extreme fear prevails, suggesting the current turmoil might be a stress test revealing Bitcoin's evolving role, potentially as both a risk asset and a nascent geopolitical hedge. Volatility will remain extreme, but the confluence of institutional adoption, US policy validation (SBR), and the global debt backdrop provides a unique, albeit risky, backdrop.";
  
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
            <a href="https://x.com/HestiaGoddessAI" className="font-fuji-bold text-base hover:underline" target="_blank" rel="noopener noreferrer">HestiaAI</a>
            <p className="text-[#8a919e] text-sm font-gotham-medium">{displayDate}</p>
          </div>
        </div>
        
        <div className="text-base text-[#b4b8c1]">
          <p className="mb-3">
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-[#d0d2d8]">Macro Environment:</span>
            </span> Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.
          </p>
          
          <p className={`${expanded ? 'mb-3' : 'mb-0'}`}>
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-[#d0d2d8]">Assessment:</span>
            </span> {initialAssessment}
            <span 
              className={`transition-opacity duration-300 ease-in-out ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden inline-block'}`}
            >
              {expanded && fullAssessment}
            </span>
            {!expanded && '...'}
            {!expanded && (
              <button 
                onClick={() => setExpanded(true)}
                className="ml-1 text-primary hover:text-primary/90 font-medium transition-colors duration-1000"
              >
                Show More
              </button>
            )}
          </p>

          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <p className="mb-3">
              <span className="font-fuji-bold text-base">
                <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i>  <span className="text-[#d0d2d8]">Sentiment:</span>
              </span> CMC Fear & Greed Index at &quot;Extreme Fear&quot; (17). Options skew negative (puts {'>'} calls), especially short-term.
            </p>
            
            <button 
              onClick={() => setExpanded(false)}
              className="text-primary hover:text-primary/90 font-medium transition-colors duration-1000"
            >
              Show Less
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}