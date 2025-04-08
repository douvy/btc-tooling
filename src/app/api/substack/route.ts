import { NextResponse } from 'next/server';
import * as xml2js from 'xml2js';

// Function to extract just the 3 bullet points from executive summary
function extractExecutiveSummary(content: string): string {
  // Fallback content in case extraction fails
  const fallbackBullets = [
    '• BTC Price: ~$76,066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).',
    '• Macro Environment: Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.',
    '• Sentiment: CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.'
  ];
  
  try {
    // Remove HTML tags for cleaner text
    const text = content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ');
    
    // Extract just the three bullet points we want
    const btcPrice = text.match(/(?:•|\*|-|\d+\.)\s*(?:BTC|Bitcoin)\s+Price\s*:\s*([^•\n]*?)(?=(?:•|\*|-|\d+\.)\s*(?:Macro|Market|Sent)|$)/i);
    const macro = text.match(/(?:•|\*|-|\d+\.)\s*Macro\s+Environment\s*:\s*([^•\n]*?)(?=(?:•|\*|-|\d+\.)\s*(?:Sent|Mkt|Mark|$))/i);
    const sentiment = text.match(/(?:•|\*|-|\d+\.)\s*Sentiment\s*:\s*([^•\n]*?)(?=(?:•|\*|-|\d+\.)\s*(?:\d|\n\n|Mkt|Mark|$))/i);
    
    // If we found any of the points, use them
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
    
    // Just these three bullet points, nothing more
    return bullets.join('\n\n');
  } catch (err) {
    console.error("Error extracting bullet points:", err);
    return fallbackBullets.join('\n\n');
  }
}

// Format the date in the same format as the tweets: "APR 7, 2025"
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}

// Add cache headers for better performance on Vercel
export const runtime = 'edge'; // Use Edge runtime for better performance
export const revalidate = 3600; // Revalidate cache every hour

export async function GET() {
  try {
    // Fetch the RSS feed with timeout for Vercel
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
    
    // Parse the XML to JSON
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      explicitRoot: true 
    });
    
    const result = await parser.parseStringPromise(xml);
    
    if (!result || !result.rss || !result.rss.channel) {
      throw new Error('Invalid RSS feed structure');
    }
    
    // Handle both single item and array of items
    const items = Array.isArray(result.rss.channel.item) 
      ? result.rss.channel.item 
      : result.rss.channel.item ? [result.rss.channel.item] : [];
    
    if (items.length === 0) {
      throw new Error('No items found in RSS feed');
    }
    
    // Filter for posts with "Comprehensive Big-Picture Analysis" in the title
    const analysisPost = items.find(item => 
      item.title && item.title.includes('Comprehensive Big-Picture Analysis')
    );
    
    if (!analysisPost) {
      return NextResponse.json({ 
        title: "Comprehensive Big-Picture Analysis of the Bitcoin Market as of April 7, 2025",
        date: "APR 7, 2025",
        executiveSummary: extractExecutiveSummary(""),
        link: "#"
      });
    }
    
    // Extract the executive summary - handle different content field names
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
      date: "APR 7, 2025",
      executiveSummary: [
        '• BTC Price: ~$76,066 (Note: Data points within analyses may vary slightly, e.g., $75k-$78k range, reflecting updates during analysis periods).',
        '• Macro Environment: Extreme volatility in traditional markets (equities crashing, VIX high, credit spreads widening via HYGH). Aggressive US tariff policies under Trump are causing global disruption. Fed Funds Rate at 4.33%, but markets price significant cuts (4 cuts in 2025). Global liquidity conditions are complex, with past hidden stimulus unwinding but long-term pressures for central bank support due to debt. China easing aggressively.',
        '• Sentiment: CMC Fear & Greed Index at "Extreme Fear" (17). Options skew negative (puts > calls), especially short-term.'
      ].join('\n\n'),
      link: "#"
    });
  }
}