/**
 * Debug API call tracking
 */

const recentCalls = [];
const MAX_CALLS = 200;

export default function handler(req, res) {
  // Add a debug record for the current API call
  const now = Date.now();
  const url = req.query.url || 'unknown';
  const source = req.query.source || 'unknown';
  
  // Only add if this is a real request to CoinGecko
  if (url.includes('coingecko') || url.includes('api/')) {
    recentCalls.push({
      timestamp: now,
      url,
      source,
      headers: req.headers
    });
    
    // Trim the array if needed
    if (recentCalls.length > MAX_CALLS) {
      recentCalls.shift();
    }
  }
  
  // Return the entire tracking log
  res.status(200).json({
    totalCalls: recentCalls.length,
    callsBySource: recentCalls.reduce((acc, call) => {
      acc[call.source] = (acc[call.source] || 0) + 1;
      return acc;
    }, {}),
    callsByUrl: recentCalls.reduce((acc, call) => {
      acc[call.url] = (acc[call.url] || 0) + 1;
      return acc;
    }, {}),
    recentCalls: recentCalls.map(call => ({
      ...call,
      timeAgo: `${Math.floor((now - call.timestamp) / 1000)}s ago`
    }))
  });
}