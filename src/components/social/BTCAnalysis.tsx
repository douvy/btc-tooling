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
    "Bitcoin is in a mature but not climactic phase of its supercycle, with the Bitcoin-Gold ratio";

  const fullAssessment =
    analysisData?.strategicOutlook?.full ||
    " at multi-year highs (35.2) confirming its digital gold status. U.S. Strategic Bitcoin Reserve and regulatory clarity create unprecedented institutional tailwinds. Near-term outlook favors 75-90% BTC allocation, scaling to 25-65% over 12 months as topping risk increases from <5% currently to 70% by mid-2026. Price targets range $135K-275K depending on macro conditions. Primary risk: DXY reversal or the predicted September 2025 liquidity crisis could challenge the fiscal dominance narrative. Options markets show institutional hedging awareness despite overall bullish positioning.";

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
              "Bitcoin at $118,077.86 has entered an Institutional Supercycle driven by ETF demand, pro-crypto U.S. policy, and fiscal dominance rather than traditional crypto narratives. On-chain metrics show healthy growth without euphoria: MVRV Z-Score (3.5) and Puell Multiple (1.32) remain well below peak levels, while 85-90% of supply is held by long-term holders - the highest concentration ever at an ATH. Combined with low implied volatility (39), this suggests a mature institutional grind rather than speculative mania. The market now operates under fiscal dominance where Treasury actions create liquidity despite elevated Fed rates. The 10% YTD DXY decline and Reverse Repo facility drop from $2.5T to ~$200B provide powerful tailwinds for Bitcoin as a hedge against currency debasement."}
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
                `The Crypto Fear & Greed Index at "Greed" (70) reflects institutional confidence rather than retail euphoria. Institutional FOMO rates 85/100 - this cycle's defining feature - while retail participation remains measured at 65/100.
                Sentiment shows "controlled optimism" with sophisticated derivatives hedging, contrasting sharply with previous speculative peaks. The prevailing "Great Rotation" narrative from traditional stores of value into Bitcoin is driven by monetary policy shifts and regulatory clarity rather than speculation, creating a more durable foundation despite vulnerability to macro shocks.`}
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
