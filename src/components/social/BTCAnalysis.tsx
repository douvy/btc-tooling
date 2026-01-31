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
    "February is a real stress window. TGA is elevated and rising (~$923B, +$54B w/w)";

  const fullAssessment =
    analysisData?.strategicOutlook?.full ||
    " —with ON RRP exhausted (low single-digit billions), TGA is now the key short-horizon liquidity driver, and rising TGA is a drain. Net liquidity sits around $5.6-5.7T. $2.30T in Treasury maturities roll in February, elevating probability of auction indigestion (yields/term premium up, risk assets down) or policy response (risk assets rebound). Japan remains a live transmission channel—JGB yields at multi-decade highs (10Y ~2.3%) tighten global risk conditions. Real yields at ~1.95% near the 2% threshold are an opportunity-cost headwind. Curve un-inversion (10Y-2Y positive) historically precedes economic weakness/risk-off episodes. Derivatives show a coiled spring market: persistent negative skew (puts priced richer than calls), compressed basis (mid-single digits annualized), CME OI slipping, and heavy strike gravity around $90k. Thin float + short-gamma pockets + rich puts = discontinuous moves more likely than orderly trends.";

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
              "Bitcoin at $83,942 is in a structural bull market with tactical macro/liquidity drawdown risk—mid-cycle consolidation with high gap-risk. On-chain metrics remain constructive: MVRV Z-Score at 2.5-3.0 is neutral-to-elevated, far below historic blowoff conditions. The core thin float setup is intact—HODL Waves show ~70-75% of supply held >1 year, with short-term bands materially smaller than prior cycle peaks. Less tradable inventory means higher convexity in both directions. But the near-term market is fighting overhead supply: STH Cost Basis at $98.4k is the key break-even wall — recent buyers are underwater, and rallies toward $98k meet defensive selling. Active Investor Mean ($87.8k) was recently lost, flipping it to near-term resistance. True Market Mean at $81.1k is the first major market-structure support. LTH Realized Price at $38.35k anchors the deep structural floor."}
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
                <span className="text-light-gray">Key Levels:</span>
              </span>{" "}
              {analysisData?.keyLevels ||
                `$90k: psychological + options gravity zone; reclaim stabilizes tape. $87.8k: Active Investor Mean pivot; failure keeps rallies weak. $81.1k: True Market Mean; first serious support. $98.4k: STH cost-basis ceiling; reclaim/hold is "trend back on" confirmation.`}
            </p>

            <p className="mb-3">
              <span className="font-fuji-bold text-base">
                <i
                  className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"
                  aria-hidden="true"
                ></i>{" "}
                <span className="text-light-gray">Bullish triggers:</span>
              </span>{" "}
              {analysisData?.bullishTriggers ||
                `TGA stops rising and begins spending down; spot-led reclaim of $90k→$98k with supply absorption; basis stabilizes or spot demand overwhelms.`}
            </p>

            <p className="mb-3">
              <span className="font-fuji-bold text-base">
                <i
                  className="fa-solid fa-circle text-[0.4rem] mr-1 align-middle"
                  aria-hidden="true"
                ></i>{" "}
                <span className="text-light-gray">Bearish triggers:</span>
              </span>{" "}
              {analysisData?.bearishTriggers ||
                `Failed auctions / term premium jump into Feb rollover; sustained real-yield break above ~2% + risk-off correlation; Japan/FX volatility escalation pushing BTC into "ATM mode."`}
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
