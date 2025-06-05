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
    "The Bitcoin market is in a unique phase, less driven by its own idiosyncratic cycles";
  
  const fullAssessment = analysisData?.strategicOutlook?.full || 
    " and more by the confluence of institutional adoption and macroeconomic, particularly fiscal, policy. Bitcoin is likely in a mid-to-late stage bull market, but the characteristics are different from past cycles due to institutional involvement and ETF flows. The institutionalization of Bitcoin via ETFs and treasury holdings provides a strong long-term demand base, though the path will be shaped by how governments and central banks manage inflation, debt, and economic growth. A scenario of high fiscal spending accommodated by central bank balance sheet expansion is the most bullish for Bitcoin.";
    
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
            </span> {analysisData?.assessment || "The Bitcoin market in mid-2025 stands at a pivotal juncture at $104,772.94, characterized by unprecedented institutional adoption and evolving on-chain dynamics that suggest a maturing asset class. While Bitcoin has achieved new all-time highs above $100,000, driven significantly by spot ETF inflows and a narrative of fiscal dominance, on-chain metrics (CDD, VDD Multiple, MVRV Z-Score) remain moderate compared to previous cycle peaks, indicating strong long-term holder conviction without extreme euphoria. The market is no longer solely driven by crypto-native cycles, increasingly intertwined with traditional finance and macroeconomic policy shifts."}
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
              </span> {analysisData?.sentiment || `The CMC Fear & Greed Index currently sits at 55 (Neutral), recovering from "Extreme Fear" in March 2025. QCP Capital highlights "retail euphoria remains alive and well" and a "growing conviction behind a bullish breakout narrative," with fiscal dominance as a key sentiment driver. Markets seem "inured to negative developments," indicating a strong underlying bid heavily focused on macroeconomic narratives rather than crypto-specific factors. The focus on "fiscal dominance" by sophisticated investors indicates that macro narratives are heavily influencing crypto sentiment.`}
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