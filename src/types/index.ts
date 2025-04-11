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

export interface Tweet {
  id: string;
  username: string;
  handle: string;
  profileImage: string;
  text: string;
  time: string;
  comments: number;
  retweets: number;
  likes: number;
  views: number;
}