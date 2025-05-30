/**
 * Direct test to verify CoinGecko API key
 */
export default async function handler(req, res) {
  const apiKey = process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
  
  // Get current Bitcoin price directly from CoinGecko
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&x_cg_api_key=${apiKey}`;
  
  try {
    console.log(`Testing CoinGecko API key: ${apiKey.substring(0, 5)}...`);
    console.log(`Using URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.text();
    
    res.status(200).json({
      url,
      status: response.status,
      response: data,
      headers: Object.fromEntries([...response.headers.entries()]),
      apiKey: apiKey.substring(0, 5) + '...'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}