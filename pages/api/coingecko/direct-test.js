/**
 * Direct test endpoint for CoinGecko API key
 * This makes a direct call to verify the API key status with debugging
 */

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache');
  
  const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  const keyPrefix = apiKey ? apiKey.substring(0, 5) : 'None';
  
  // Make a simple request to get Bitcoin data
  const timestamp = Date.now();
  const targetUrl = 'https://api.coingecko.com/api/v3/simple/price';
  
  // Try multiple parameter formats according to CoinGecko docs
  const queryParams = new URLSearchParams({
    ids: 'bitcoin',
    vs_currencies: 'usd',
    include_last_updated_at: 'true',
    // Try the format they show in their docs
    'x_cg_api_key': apiKey || '',
    // Also add in snake_case for good measure
    'x_cg_api_key': apiKey || '',
    _t: timestamp.toString()
  });
  
  const fullUrl = `${targetUrl}?${queryParams.toString()}`;
  console.log(`Direct test URL: ${fullUrl}`);
  
  try {
    // Make the request
    const startTime = Date.now();
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const fetchTime = Date.now() - startTime;
    console.log(`Response: ${response.status} in ${fetchTime}ms`);
    
    // Get all headers
    const headers = Object.fromEntries([...response.headers.entries()]);
    console.log('Response headers:', headers);
    
    // Check for rate limit headers
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitTotal = response.headers.get('x-ratelimit-limit');
    
    // Parse the response
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { error: 'Failed to parse response' };
    }
    
    // Return the result
    res.status(200).json({
      success: response.ok,
      status: response.status,
      apiKeyUsed: apiKey ? 'Yes' : 'No',
      apiKeyPrefix: keyPrefix,
      apiKeyLength: apiKey?.length || 0,
      apiKeyRecognized: !!rateLimitTotal,
      rateLimits: {
        limit: rateLimitTotal || 'Not found',
        remaining: rateLimitRemaining || 'Not found'
      },
      responseTime: fetchTime,
      headers,
      data: responseData,
      responseText: responseText.substring(0, 500)
    });
  } catch (error) {
    console.error('Error testing API key:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}