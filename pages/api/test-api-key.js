/**
 * Direct test endpoint to verify CoinGecko API key works
 * Based on CoinGecko's documentation
 */

export default async function handler(req, res) {
  try {
    const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key configured' });
    }
    
    // Method 1: Using header (recommended by CoinGecko)
    const headerResponse = await fetch('https://api.coingecko.com/api/v3/ping', {
      headers: {
        'x-cg-demo-api-key': apiKey
      }
    });
    
    const headerData = await headerResponse.text();
    const headerHeaders = Object.fromEntries([...headerResponse.headers.entries()]);
    
    // Method 2: Using query parameter 
    const paramResponse = await fetch(`https://api.coingecko.com/api/v3/ping?x_cg_demo_api_key=${apiKey}`);
    
    const paramData = await paramResponse.text();
    const paramHeaders = Object.fromEntries([...paramResponse.headers.entries()]);
    
    // Return all results
    res.status(200).json({
      apiKeyUsed: apiKey.substring(0, 5) + '...',
      headerMethod: {
        status: headerResponse.status,
        response: headerData,
        hasRateLimitHeaders: !!(headerHeaders['x-ratelimit-limit'] || headerHeaders['x-ratelimit-remaining']),
        headers: headerHeaders
      },
      paramMethod: {
        status: paramResponse.status,
        response: paramData,
        hasRateLimitHeaders: !!(paramHeaders['x-ratelimit-limit'] || paramHeaders['x-ratelimit-remaining']),
        headers: paramHeaders
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}