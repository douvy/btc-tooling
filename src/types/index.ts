export type TimeFrame = '1H' | '1D' | '1W' | '1M' | '1Y' | 'ALL';

export interface BitcoinPrice {
  price: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down';
  timeframe?: TimeFrame; // Optional for tracking which timeframe this data belongs to
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  sum: number;
}

export interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  spread: number;
  exchange?: string; // Optional identifier for the exchange providing this data
}

export interface HalvingInfo {
  daysRemaining: number;
  date: string;
  blocksRemaining: number;
  currentReward: number;
  nextReward: number;
  targetBlock: number;
  progress: number;
}

export interface MarketStats {
  satsPerDollar: number;
  marketCap: number;
  athPrice: number;
  athPercentChange: number;
}

export interface Tweet {
  id: string;
  username: string;
  handle: string;
  profileImage: string;
  text: string;
  time: string;
  image?: string; // Optional tweet image
  link?: string; // Link to the original tweet
  comments: number;
  retweets: number;
  likes: number;
  views: number;
}

/**
 * Structured data for Bitcoin market analysis
 */
export interface AnalysisData {
  /** Date of the analysis in "MMM DD, YYYY" format */
  date: string;
  /** Full assessment text */
  assessment: string;
  /** Strategic outlook analysis */
  strategicOutlook: {
    /** Initial part of the strategic outlook (shown before "Show More") */
    initial: string;
    /** Full strategic outlook text (shown after "Show More") */
    full: string;
  };
  /** Sentiment analysis text */
  sentiment: string;
  /** Fear & Greed Index value (0-100) */
  fearGreedIndex: number;
  /** ISO date string of when the analysis was last updated */
  lastUpdated: string;
  /** Optional source attribution */
  source?: string;
  /** Optional author name */
  author?: string;
}