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
  const initialAssessment = "The Bitcoin market is navigating a complex transition. While institutionalization";
  
  // Rest of assessment to show when expanded - includes the content that was removed from initial
  const fullAssessment = " via ETFs provides a strong structural bid and the immediate liquidity environment appears supportive, significant macro risks loom large, primarily driven by US trade policy uncertainty and concerns about future liquidity conditions tied to massive debt rollovers. On-chain data suggests the cycle peak may not have been reached, but fearful sentiment and recent price weakness warrant caution. The low implied volatility is a potential red flag for complacency. Expect continued sensitivity to macro news, particularly regarding US-China relations and Fed policy adjustments in response to economic data and market stability concerns.";
  
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
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-[#d0d2d8]">Outlook:</span>
            </span> The overall outlook is cautiously optimistic but acknowledges significant near-term risks and volatility. The base case involves consolidation before a potential further move up later in the cycle, contingent on macro risks not materializing severely. The weakening USD and eventual Fed easing are supportive, but trade wars and liquidity concerns are major headwinds.
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
              </span> Fear & Greed Index indicates &quot;Fear&quot; (32), recovering from recent &quot;Extreme Fear&quot; but far from greedy. Options skew is slightly negative (cautious). QCP Broadcast highlights market caution driven by trade wars. This contrasts with the high price level, suggesting uncertainty or potential undervaluation based on sentiment.
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