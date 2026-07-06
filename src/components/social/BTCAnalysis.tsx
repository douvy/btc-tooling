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
    "Price is set at the margin by active flows, and flows currently favor defense — structural cheapness is sidelined until the ETF wrapper channel confirms absorption.";

  const fullAssessment =
    analysisData?.strategicOutlook?.full ||
    " Strategy is now a board-authorized conditional seller: 847k BTC at ~$75.6k average (~$13–14B underwater), its preferred stack priced as distressed credit, mNAV below 1.0 for the first sustained period since 2020. Macro is hawkish rates, dovish plumbing: the Warsh Fed holds 3.50–3.75% while reserves sit only ~$80B above the floor, RRP is exhausted, and a ~$5.6T Q3 rollover wall looms. Yen carry is the tail risk — USD/JPY at 161.3 multi-decade highs against a cycle-low 1.71% US–JP spread is the textbook unwind precursor, with BTC the liquidity vent. The June jobs miss (+57k) sparked the bounce off $57.8k; July 14 CPI is the binary gate into the July 29 FOMC. Key tell: crypto leverage is clean (neutral funding, flat basis) yet options skew stays deeply negative — allocators are paying a 7–13 vol premium for downside protection through Q3.";

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
              "Bitcoin at ~$62.9k is in a flow-dominated markdown approaching structural value. June was the worst month in spot ETF history (~$4.1–4.5B redeemed, ~39.4k BTC shed) — the wrappers are now the marginal seller, with IBIT negative ten straight sessions before the first pause signals on July 2–3. On-chain says base-building: record 16.3M BTC held by long-term holders, STH supply flushed to prior-trough levels, exchange reserves at 7-year lows, and a majority of supply underwater — the zone where prior cycle bases formed. Still missing: a capitulation-scale SOPR flush and flow confirmation. Until both arrive, any rally is a squeeze, not a regime change."}
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
                `$53k: aggregate realized price — the untested structural floor. $49.7–49.9k: LTH cost basis / deep value band. $57.7k: cycle low — daily close below accelerates toward $53k. $62.65k: weekly 50 MA pivot. $68k–$73k: overhead resistance; $75.6k: MSTR cost basis where wrapper pressure re-emerges.`}
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
                `≥3 consecutive ETF net-inflow days >$200M with IBIT positive; July 14 CPI ≤0.20% MoM; STRC preferred back near par (treasury rails reopen); 30d skew flipping positive.`}
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
                `Daily close below $57.7k; ETF outflows ≥$500M/week for 2+ weeks; USD/JPY close below ~155–156 (carry unwind); MSTR monetizing >$500M BTC in a week; reserves <$2.98T with repo stress.`}
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
