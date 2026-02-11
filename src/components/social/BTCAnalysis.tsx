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
    "Macro plumbing is the dominant driver. ON RRP is exhausted — TGA swings now hit reserves directly.";

  const fullAssessment =
    analysisData?.strategicOutlook?.full ||
    " TGA at ~$909B is an active drain; bank reserves at ~$2.94T are adequate but thinning. ~$1.82T in Treasuries roll in Feb, ~$2.09T in March — if term premium spikes on weak demand, long-duration assets de-rate together. Japan remains the highest-conviction risk-off channel: JGB 10Y at ~2.29% with long-end yields at extremes threatens carry unwind → global deleveraging → BTC sold as liquidity source. Derivatives show fear hedging with squeeze potential: negative funding, deeply negative skew, OI clustered around $60k–$65k puts and $100k calls. Direction will be decided by macro liquidity, not crypto narratives. Key tell: bond vol (MOVE) — re-acceleration toward 130–140+ likely precedes a policy backstop and violent reversal.";

  // Optional attribution section if source or author is provided
  const hasAttribution = analysisData?.source || analysisData?.author;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">BTC Analysis</h2>
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
              "Bitcoin at ~$68.8k is in a mid-cycle correction driven by mechanical deleveraging — a liquidity air-pocket, not a trend-following selloff. MVRV Z-Score at ~0.70 signals the profit overhang is wrung out; ~9.3M BTC sits underwater (highest since Jan 2023), meaning remaining selling pressure is increasingly forced (liquidations, risk limits, ETF redemptions, miner cash needs). STH Cost Basis at ~$98.4k is the overhead ceiling — any rally into ~$80k–$98k meets dense supply from underwater buyers. LTH Realized Price at ~$40.45k anchors the deep cycle floor. Downside is increasingly asymmetric: forced selling ends abruptly if liquidity improves or a credible sovereign bid materializes."}
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
                `$60k–$65k: tactical decision zone (sovereign narrative + put gravity). $80k–$98k: overhead supply band. $98.4k: STH cost-basis ceiling — reclaim = trend confirmation. $40.45k: LTH realized price / deep structural floor.`}
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
                `TGA drawdown; short squeeze on negative funding; BOJ stabilization; spot-led reclaim of $90k+ with visible accumulation.`}
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
                `JGB carry unwind escalation; Feb–Mar rollover duration shock; sub-$60k gamma cascade; miner capitulation near production cost.`}
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
