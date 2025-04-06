/**
 * API Proxy for Coinbase (Fallback)
 */

import { 
  SERVERLESS_TIMEOUT, CACHE_CONTROL, handleOptions, setCorsHeaders, 
  buildQueryParams, forwardHeaders 
} from '../utils/proxyUtils';

const DEFAULT_PATH = 'prices/BTC-USD/spot';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  setCorsHeaders(res);

  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path || DEFAULT_PATH;
  const debug = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  const logPrefix = '[Coinbase Proxy]';
  
  if (debug || process.env.NODE_ENV === 'development') {
    console.log(`${logPrefix} Request: ${req.method} /api/coinbase/${apiPath}`);
  }
  
  const targetUrl = `https://api.coinbase.com/v2/${apiPath}`;
  const queryString = buildQueryParams(req);
  const fullUrl = `${targetUrl}${queryString ? `?${queryString}` : ''}`;
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'CB-VERSION': '2023-12-21',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERVERLESS_TIMEOUT);
    
    const fetchStart = Date.now();
    const response = await fetch(fullUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    const responseText = await response.text();
    
    if (debug || process.env.NODE_ENV === 'development') {
      console.log(`${logPrefix} Response: ${response.status} (${Date.now() - fetchStart}ms)`);
    }
    
    res.status(response.status);
    res.setHeader('Cache-Control', response.ok ? CACHE_CONTROL.DEFAULT : CACHE_CONTROL.ERROR);
    forwardHeaders(response, res, 'coinbase', ['cb-after', 'cb-before']);
    
    let processedData = responseText;
    
    if (response.ok && apiPath === DEFAULT_PATH) {
      try {
        const data = JSON.parse(responseText);
        
        if (data?.data?.amount) {
          processedData = JSON.stringify({
            bitcoin: {
              usd: parseFloat(data.data.amount),
              usd_24h_change: 0,
              last_updated_at: Math.floor(Date.now() / 1000)
            }
          });
          res.setHeader('Content-Type', 'application/json');
        }
      } catch (err) {}
    }
    
    res.send(processedData);
    
  } catch (error) {
    const errorMessage = error.name === 'AbortError' ? 'Request timed out' : error.message;
    console.error(`${logPrefix} Error:`, errorMessage);
    
    res.setHeader('Cache-Control', CACHE_CONTROL.ERROR);
    res.status(error.name === 'AbortError' ? 504 : 500).json({
      error: true,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
}