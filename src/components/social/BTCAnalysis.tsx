import Image from 'next/image';
import { useState } from 'react';

// Static component with hardcoded content for guaranteed deployment
interface BTCAnalysisProps {
  date?: string;
  content?: string;
}

export default function BTCAnalysis({ date }: BTCAnalysisProps) {
  const displayDate = date || 'APR 18, 2025';
  const [expanded, setExpanded] = useState(false);
  
  // First half of assessment - shortened to move the Show More link 4 lines higher
  const initialAssessment = "Bitcoin is navigating a complex environment. Structural adoption (ETFs, SBR) provides";
  
  // Rest of assessment to show when expanded - includes the content that was removed from initial
  const fullAssessment = " strong tailwinds. The post-halving period is historically bullish. However, macro risks (tariffs, liquidity, potential stagflation) are significant headwinds. On-chain and derivatives data suggest the market isn't at a typical euphoric peak. A simple extrapolation of past cycles is insufficient. Strategy requires balancing structural positives with macro risks. Timing potential liquidity events or policy shifts is key. Bitcoin is likely in a mid-to-late stage bull market, but the cycle is being altered by institutional flows and macro factors. The peak may be higher and potentially later than historical cycles, but the path will likely be volatile and heavily influenced by Fed policy and geopolitical events.";
  
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
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-[#d0d2d8]">Assessment:</span>
            </span> The Bitcoin market in early May 2025 presents a complex and somewhat contradictory picture. Structurally, the market appears robust, driven by significant institutional adoption via ETFs, a supportive post-halving supply dynamic, and a strengthening narrative as a potential hedge against geopolitical uncertainty and monetary debasement. Bitcoin price is near all-time highs, reflecting these positive forces.

However, significant headwinds and risks loom large. On-chain metrics, while not bearish, are not displaying the widespread euphoria characteristic of previous cycle peaks, suggesting either a different cycle structure or that the top is not imminent.
          </p>
          
          <p className={`${expanded ? 'mb-3' : 'mb-0'}`}>
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-[#d0d2d8]">Strategic Outlook:</span>
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
              </span> The Fear & Greed Index was neutral (53) in April after recovering from extreme fear (15) in March. WatcherGuru and Trump Telegram feeds (April) indicate extreme market fear in traditional markets due to tariff announcements, with Bitcoin being positioned as a "store of value" / "tariff-proof" asset by some commentators (Bessent, Saylor, E. Trump). Retail investors were reportedly buying the equity dip heavily. QCP Broadcast noted swings from "extreme panic" to "cautious optimism" based on tariff news and Fed signals.
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