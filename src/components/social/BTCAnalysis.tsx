import Image from "next/image";
import { useState } from "react";
import { AnalysisData } from "@/types";

/**
 * Props for the BTCAnalysis component
 */
export interface BTCAnalysisProps {
  /** Optional content override to replace default analysis text */
  content?: string;

  /** Optional structured analysis data */
  analysisData?: AnalysisData;
}

export default function BTCAnalysis({
  content,
  analysisData,
}: BTCAnalysisProps) {
  const [expanded, setExpanded] = useState(false);

  // Use data from analysisData if provided, otherwise use default content
  const initialAssessment =
    analysisData?.strategicOutlook?.initial ||
    "The bull case is intact but don't chase here. Two major liquidity cycles are peaking (65-month";

  const fullAssessment =
    analysisData?.strategicOutlook?.full ||
    " global cycle and 200-day cycle both turned down late summer), setting up potential chop or pullback through year-end before any final push into early 2026. Trade the range: $108-120k is your box. Buy dips toward $108k or $102-100k when ETF flows stay strong, trim into $118-120k until we see a convincing breakout. Above $120k opens $131-135k+; below $108k tests the critical 50-week support near $99k. Geopolitical noise (US-China tariff war, potential government shutdown) can spike volatility. Don't obsess over price targets—watch the overheat bundle instead: exit when 2+ of these fire simultaneously: MVRV Z above 4, LTH multiple above 3.8x, VDD above 2.9, vol spiking over 60, Fear & Greed hitting 80-90, or ETF flows reversing while price stays pinned high.";

  // Optional attribution section if source or author is provided
  const hasAttribution = analysisData?.source || analysisData?.author;

  return (
    <div>
      <h2 className="text-xl font-fuji-bold mb-2">BTC Analysis</h2>
      <div>
        <div className="text-base text-secondary">
          <p className="mb-3">
            <span className="font-fuji-bold text-base">
              <i
                className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"
                aria-hidden="true"
              ></i>{" "}
              <span className="text-light-gray">Assessment:</span>
            </span>{" "}
            {analysisData?.assessment ||
              "Bitcoin at $112,360 is in a healthy mid-cycle grind, not a speculative blowoff. The recent $125.7k ATH followed by a $19B liquidation and dip under $110k got absorbed without breaking anything—institutional buyers showed up. On-chain metrics confirm we're nowhere near cooked: MVRV Z-Score sits at 2.0-2.5 (tops happen above 4-6), long-term holders aren't selling (VDD under 1.0), and the LTH price multiple of 3.07x has room before the 3.8-4.5x danger zone. ETFs are the story: 621k BTC accumulated since launch, with the last five days adding $3.4B as GBTC outflows finally flipped positive. Global liquidity is supportive—M2 growing ~5% YoY, stablecoins at record $252B, gold/silver hitting ATHs, and the dollar weak. The Fed is cutting gradually while keeping things less restrictive, not loose, which is the goldilocks zone for risk assets."}
          </p>

          <p className={`${expanded ? "mb-3" : "mb-0"}`}>
            <span className="font-fuji-bold text-base">
              <i
                className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"
                aria-hidden="true"
              ></i>{" "}
              <span className="text-light-gray">Strategic Outlook:</span>
            </span>{" "}
            {initialAssessment}
            <span
              className={`transition-opacity duration-300 ease-in-out ${expanded ? "opacity-100" : "opacity-0 h-0 overflow-hidden inline-block"}`}
            >
              {expanded && fullAssessment}
            </span>
            {!expanded && "..."}
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
              expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <p className="mb-3">
              <span className="font-fuji-bold text-base">
                <i
                  className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"
                  aria-hidden="true"
                ></i>{" "}
                <span className="text-light-gray">Sentiment:</span>
              </span>{" "}
              {analysisData?.sentiment ||
                `Fear & Greed at 57 shows post-shakeout recovery, not mania. Institutional FOMO (70/100) is strong through ETF accumulation but measured. Retail FOMO (55/100) is nervous despite ATH headlines. On-chain euphoria scores just 35/100—this is mid-cycle, not late-stage delirium. Overall 72/100 captures the mood: professional accumulation, not degen pileup. Implied vol at 38 looks cheap. Asia/offshore is driving marginal flows while US institutions grind through ETFs—slower burn, more durable.`}
            </p>

            {hasAttribution && (
              <p className="text-xs text-muted italic mt-2 mb-2">
                {analysisData?.source && `Source: ${analysisData.source}`}
                {analysisData?.source && analysisData?.author && " | "}
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
