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
  const initialAssessment = "Bitcoin is likely in a mid-to-late stage bull market, but the cycle is being altered";
  
  // Rest of assessment to show when expanded - includes the content that was removed from initial
  const fullAssessment = " by institutional flows and macro factors. The confluence of high valuations, potential liquidity crunches, and policy uncertainties demands a strategic and risk-aware approach. If the Fed is forced into significant easing (Quantitative Support) as Howell predicts, this would likely ignite the next major leg up for Bitcoin.";
  
  return (
    <div>
      <h2 className="text-xl font-fuji-bold mb-2">BTC Analysis</h2>
      <div>
        <div className="flex items-start mb-3">
          <div>
            <p className="text-muted text-sm">{displayDate}</p>
          </div>
        </div>
        
        <div className="text-base text-secondary">
          <p className="mb-3">
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-light-gray">Assessment:</span>
            </span> The Bitcoin market in May 2025 stands at a pivotal juncture, characterized by a record-high price of approximately $109,522, yet exhibiting a complex interplay of bullish on-chain metrics, maturing market structures, significant institutional inflows, and a rapidly evolving macroeconomic and geopolitical landscape. While many indicators suggest continued strength and potential for further upside, underlying liquidity concerns, particularly related to U.S. Treasury debt refinancing, and the unpredictable nature of global policy shifts, introduce significant uncertainties.
          </p>
          
          <p className={`${expanded ? 'mb-3' : 'mb-0'}`}>
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-light-gray">Strategic Outlook:</span>
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
                <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i>  <span className="text-light-gray">Sentiment:</span>
              </span> The Fear & Greed Index was at 66 ("Greed") as of May 18, up from 32 ("Fear") last month and down from a recent high of 75. WatcherGuru and Trump Telegram feeds reflect overwhelmingly bullish sentiment driven by trade deal announcements, pro-crypto regulatory news, and Trump-era policy signals. QCP Broadcast described the environment as "cautiously constructive," noting that while the trend is up, tactical caution is warranted due to policy volatility and macro crosscurrents.
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