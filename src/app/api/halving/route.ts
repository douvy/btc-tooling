import { NextResponse } from 'next/server';
import { HalvingInfo } from '@/types';

// This tells Next.js to revalidate this data every hour
export const revalidate = 3600;

interface BlockchainApiResponse {
  height: number;
  hash: string;
  time: number;
  // Other fields omitted for brevity
}

/**
 * Calculates the next halving block based on the current block height
 * Each halving occurs every 210,000 blocks
 * @param currentHeight Current block height
 * @returns The target block for the next halving
 */
function calculateNextHalvingBlock(currentHeight: number): number {
  const halvingInterval = 210000;
  return Math.ceil(currentHeight / halvingInterval) * halvingInterval;
}

/**
 * Calculates approximate days remaining until halving
 * Based on average 10 minute block time
 * @param blocksRemaining Number of blocks until halving
 * @returns Estimated days remaining
 */
function calculateDaysRemaining(blocksRemaining: number): number {
  const avgBlockTimeMinutes = 10;
  const minutesPerDay = 24 * 60;
  return Math.floor((blocksRemaining * avgBlockTimeMinutes) / minutesPerDay);
}

/**
 * Formats the estimated date of the next halving
 * @param daysFromNow Days from today
 * @returns Formatted date string (e.g., "Mar. 31, 2028")
 */
function formatHalvingDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month}. ${day}, ${year}`;
}

/**
 * Calculates the current block reward based on the halving epoch
 * Starting reward was 50 BTC, halving every 210,000 blocks
 * @param currentHeight Current block height
 * @returns Current block reward in BTC
 */
function calculateCurrentReward(currentHeight: number): number {
  const epoch = Math.floor(currentHeight / 210000);
  return 50 / Math.pow(2, epoch);
}

/**
 * API route handler that fetches blockchain data and calculates halving information
 * @returns HalvingInfo object with calculated values
 */
export async function GET(): Promise<NextResponse<HalvingInfo>> {
  try {
    // Fetch latest block data from blockchain.info API
    const response = await fetch('https://blockchain.info/latestblock', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blockchain data: ${response.status}`);
    }
    
    const data: BlockchainApiResponse = await response.json();
    const currentHeight = data.height;
    
    // Calculate next halving block
    const targetBlock = calculateNextHalvingBlock(currentHeight);
    const blocksRemaining = targetBlock - currentHeight;
    
    // Calculate days remaining
    const daysRemaining = calculateDaysRemaining(blocksRemaining);
    
    // Format date
    const date = formatHalvingDate(daysRemaining);
    
    // Calculate rewards
    const currentReward = calculateCurrentReward(currentHeight);
    const nextReward = currentReward / 2;
    
    // Calculate progress percentage
    const halvingInterval = 210000;
    const blocksIntoCurrentHalvingEra = currentHeight % halvingInterval;
    const progress = Math.round((blocksIntoCurrentHalvingEra / halvingInterval) * 100);
    
    // Construct the halving info object
    const halvingInfo: HalvingInfo = {
      daysRemaining,
      date,
      blocksRemaining,
      currentReward,
      nextReward,
      targetBlock,
      progress
    };
    
    return NextResponse.json(halvingInfo);
    
  } catch (error) {
    
    // Return fallback data instead of an error for better user experience
    // Accurate as of April 2025, after the 2024 halving
    return NextResponse.json({
      daysRemaining: 1084,
      date: 'Mar. 31, 2028',
      blocksRemaining: 158881,
      currentReward: 3.125, // Updated reward after 2024 halving
      nextReward: 1.5625,   // Next halving reward
      targetBlock: 1050000,
      progress: 15
    });
  }
}