import Image from 'next/image';
import { useState } from 'react';
import { AnalysisData } from '@/types';

/**
 * Props for the BTCAnalysis component
 */
export interface BTCAnalysisProps {
  /** Optional content override to replace default analysis text */
  content?: string;
  
  /** Optional structured analysis data */
  analysisData?: AnalysisData;
}

export default function BTCAnalysis({ content, analysisData }: BTCAnalysisProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Use data from analysisData if provided, otherwise use default content
  const initialAssessment = analysisData?.strategicOutlook?.initial || 
    "Bitcoin is likely in a mid-to-late stage bull market, but the cycle is being altered";
  
  const fullAssessment = analysisData?.strategicOutlook?.full || 
    " by institutional flows and macro factors. The confluence of high valuations, potential liquidity crunches, and policy uncertainties demands a strategic and risk-aware approach. If the Fed is forced into significant easing (Quantitative Support) as Howell predicts, this would likely ignite the next major leg up for Bitcoin.";
    
  // Optional attribution section if source or author is provided
  const hasAttribution = analysisData?.source || analysisData?.author;
  
  return (
    <div>
      <h2 className="text-xl font-fuji-bold mb-2">BTC Analysis</h2>
      <div>
        <div className="text-base text-secondary">
          <p className="mb-3">
            <span className="font-fuji-bold text-base">
              <i className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle" aria-hidden="true"></i> <span className="text-light-gray">Assessment:</span>
            </span> {analysisData?.assessment || "The Bitcoin market in May 2025 stands at a pivotal juncture, characterized by a record-high price of approximately $109,522, yet exhibiting a complex interplay of bullish on-chain metrics, maturing market structures, significant institutional inflows, and a rapidly evolving macroeconomic and geopolitical landscape. While many indicators suggest continued strength and potential for further upside, underlying liquidity concerns, particularly related to U.S. Treasury debt refinancing, and the unpredictable nature of global policy shifts, introduce significant uncertainties."}
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
                aria-expanded={expanded}
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
              </span> {analysisData?.sentiment || `The Fear & Greed Index was at ${analysisData?.fearGreedIndex || 66} ("${analysisData?.fearGreedIndex && analysisData.fearGreedIndex > 50 ? 'Greed' : 'Fear'}") as of May 18, up from 32 ("Fear") last month and down from a recent high of 75. WatcherGuru and Trump Telegram feeds reflect overwhelmingly bullish sentiment driven by trade deal announcements, pro-crypto regulatory news, and Trump-era policy signals. QCP Broadcast described the environment as "cautiously constructive," noting that while the trend is up, tactical caution is warranted due to policy volatility and macro crosscurrents.`}
            </p>
            
            {hasAttribution && (
              <p className="text-xs text-muted italic mt-2 mb-2">
                {analysisData?.source && `Source: ${analysisData.source}`}
                {analysisData?.source && analysisData?.author && ' | '}
                {analysisData?.author && `Author: ${analysisData.author}`}
              </p>
            )}
            
            <button 
              onClick={() => setExpanded(false)}
              className="text-primary hover:text-primary/90 font-medium transition-colors duration-1000"
              aria-expanded={expanded}
            >
              Show Less
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}