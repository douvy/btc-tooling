---
name: update-analysis
description: Update the BTC Analysis section from a pasted market analysis article. Condenses the article into the dashboard's snippet/show-more format, verifies, commits, and pushes.
---

# Update BTC Analysis

Update the default content strings in `src/components/social/BTCAnalysis.tsx` from a pasted article.

## Input

If the user didn't paste the article with the command, ask for it. Expect a full Bitcoin market analysis article (assessment, outlook, levels, triggers).

## What to edit

Only the **default fallback strings** in `BTCAnalysis.tsx` (the `||` fallbacks). Do not change component structure, markup, or props. There are 6 strings:

1. **Assessment** (`analysisData?.assessment || "..."`) — condense the article's core thesis to ~4-6 sentences. Lead with price level and regime (e.g. "Bitcoin at ~$62.9k is in a flow-dominated markdown..."). End with the actionable takeaway.
2. **Strategic Outlook initial** (`initialAssessment` fallback) — ONE sentence hook, shown before "Show More". Must read as a complete thought but invite expansion.
3. **Strategic Outlook full** (`fullAssessment` fallback) — the expanded outlook, ~5-8 sentences. **Must start with a leading space** (it's concatenated directly after `initial`).
4. **Key Levels** (`analysisData?.keyLevels || ...`) — one line per level in the pattern `$Xk: meaning.`, from lowest support to highest resistance, as a single template string.
5. **Bullish triggers** — semicolon-separated concrete conditions, one template string.
6. **Bearish triggers** — same format.

## Style rules

- Concise. Cut hedging, keep numbers, dates, and named levels.
- Keep the article's specific figures (flows in $B, BTC amounts, dates, macro levels) — that's what makes it credible.
- No markdown inside the strings; plain text only.
- Escape any double quotes or use template literals consistent with what's already there.

## Verify and ship

1. `pnpm lint && pnpm exec tsc --noEmit && pnpm build`
2. Show the user the new Assessment and Strategic Outlook initial for a quick read.
3. On approval, commit **only this file** with message `content: update BTC analysis` (mitchellh style, NO Co-Authored-By trailer) and push.
