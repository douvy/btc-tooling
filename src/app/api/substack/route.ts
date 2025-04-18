import { NextResponse } from 'next/server';

/**
 * Types for the RSS feed content
 */
interface RssFeedItem {
  title: string;
  link: string;
  pubDate: string;
  'content:encoded': string;
  description: string;
}

interface AnalysisResponse {
  title: string;
  date: string;
  executiveSummary: string;
  link: string;
}

// Default fallback content for when RSS feed is unavailable
const fallbackBullets = [
  '• BTC Price: ~$76,06 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).',
  '• Macro Environment: Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.',
  '• Sentiment: CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.'
];

/**
 * Extracts just the BTC Price, Macro Environment, and Sentiment bullet points from content
 * @param content HTML content from RSS feed
 * @returns Formatted string with just the three bullet points
 */
function extractExecutiveSummary(content: string): string {
  try {
    // Clean the HTML content for easier text extraction
    const text = content
      .replace(/<[^>]*>?/gm, ' ')  // Remove HTML tags
      .replace(/&nbsp;/g, ' ')     // Replace HTML entities
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();
    
    // Extract just the three specific bullet points we want
    const btcPrice = text.match(/(?:•|\*|-|\d+\.)\s*(?:BTC|Bitcoin)\s+Price\s*:\s*([^•\n]*?)(?=(?:•|\*|-|\d+\.)\s*(?:Macro|Market|Sent)|$)/i);
    const macro = text.match(/(?:•|\*|-|\d+\.)\s*Macro\s+Environment\s*:\s*([^•\n]*?)(?=(?:•|\*|-|\d+\.)\s*(?:Sent|Mkt|Mark|$))/i);
    const sentiment = text.match(/(?:•|\*|-|\d+\.)\s*Sentiment\s*:\s*([^•\n]*?)(?=(?:•|\*|-|\d+\.)\s*(?:\d|\n\n|Mkt|Mark|$))/i);
    
    // Build an array of bullet points with fallbacks for any missing ones
    const bullets = [];
    
    if (btcPrice && btcPrice[1] && btcPrice[1].length > 10) {
      bullets.push(`• BTC Price: ${btcPrice[1].trim()}`);
    } else {
      bullets.push(fallbackBullets[0]);
    }
    
    if (macro && macro[1] && macro[1].length > 10) {
      bullets.push(`• Macro Environment: ${macro[1].trim()}`);
    } else {
      bullets.push(fallbackBullets[1]);
    }
    
    if (sentiment && sentiment[1] && sentiment[1].length > 10) {
      bullets.push(`• Sentiment: ${sentiment[1].trim()}`);
    } else {
      bullets.push(fallbackBullets[2]);
    }
    
    // Return just these three bullet points, separated by double newlines
    return bullets.join('\n\n');
  } catch (err) {
    console.error("Error extracting bullet points:", err);
    return fallbackBullets.join('\n\n');
  }
}

/**
 * Formats a date string to match the format used in tweets: "APR 18, 2025"
 * @param dateString Any valid date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}

/**
 * Simplified RSS feed parser using regex instead of XML libraries
 * This makes the code more compatible with edge runtimes
 * @param xml Raw XML string from RSS feed
 * @returns Array of parsed RSS feed items
 */
async function parseRssFeed(xml: string): Promise<RssFeedItem[]> {
  try {
    // Simple regex-based parsing for item elements
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    const contentRegex = /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>|<content:encoded>([\s\S]*?)<\/content:encoded>/;
    const descriptionRegex = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/;
    
    const items: RssFeedItem[] = [];
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      
      // Extract fields with better support for CDATA sections
      const titleMatch = itemXml.match(titleRegex);
      const linkMatch = itemXml.match(linkRegex);
      const pubDateMatch = itemXml.match(pubDateRegex);
      const contentMatch = itemXml.match(contentRegex);
      const descriptionMatch = itemXml.match(descriptionRegex);
      
      // Get the content, handling CDATA sections
      const title = titleMatch ? titleMatch[1] || titleMatch[2] || '' : '';
      const link = linkMatch ? linkMatch[1] || '' : '';
      const pubDate = pubDateMatch ? pubDateMatch[1] || '' : '';
      const content = contentMatch ? contentMatch[1] || contentMatch[2] || '' : '';
      const description = descriptionMatch ? descriptionMatch[1] || descriptionMatch[2] || '' : '';
      
      items.push({
        title,
        link,
        pubDate,
        'content:encoded': content,
        description
      });
    }
    
    return items;
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    return [];
  }
}

// Add cache configuration for better performance
export const revalidate = 3600; // Revalidate cache every hour

/**
 * API route handler that fetches and processes the HestiaAI Substack RSS feed
 * Extracts only the BTC Price, Macro Environment, and Sentiment bullet points
 * @returns JSON with title, date, executiveSummary, and link
 */
export async function GET(): Promise<NextResponse<AnalysisResponse>> {
  try {
    // Fetch the RSS feed with timeout for reliability
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('https://hestiaai.substack.com/feed', {
      signal: controller.signal,
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`);
    }
    
    const xml = await response.text();
    
    // Parse the RSS feed
    const items = await parseRssFeed(xml);
    
    if (items.length === 0) {
      throw new Error('No items found in RSS feed');
    }
    
    // Filter for posts with "Comprehensive Big-Picture Analysis" in the title
    const analysisPost = items.find(item => 
      item.title && item.title.includes('Comprehensive Big-Picture Analysis')
    );
    
    if (!analysisPost) {
      // Return fallback data if no matching post found
      return NextResponse.json({ 
        title: "Comprehensive Big-Picture Analysis of the Bitcoin Market as of April 7, 2025",
        date: "APR 7, 2025",
        executiveSummary: fallbackBullets.join('\n\n'),
        link: "#"
      });
    }
    
    // Extract the executive summary from the post content
    const content = analysisPost['content:encoded'] || analysisPost.description || '';
    const executiveSummary = extractExecutiveSummary(content);
    
    // Return the formatted post data
    return NextResponse.json({
      title: analysisPost.title || "Bitcoin Market Analysis",
      date: formatDate(analysisPost.pubDate || new Date().toString()),
      executiveSummary,
      link: analysisPost.link || "#"
    });
    
  } catch (error) {
    console.error('Error fetching or parsing RSS feed:', error);
    
    // Return fallback data instead of an error
    return NextResponse.json({
      title: "Comprehensive Big-Picture Analysis of the Bitcoin Market as of April 7, 2025",
      date: "APR 18, 2025",
      executiveSummary: fallbackBullets.join('\n\n'),
      link: "#"
    });
  }
}