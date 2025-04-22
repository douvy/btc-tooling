/**
 * Shared utilities for API proxies
 */

export const SERVERLESS_TIMEOUT = 9500;
export const CACHE_CONTROL = {
  DEFAULT: 'no-cache, must-revalidate',
  ERROR: 'no-cache, no-store, must-revalidate'
};
export const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-cg-api-key'
};

export function handleOptions(res) {
  res.status(200).send('OK');
  return true;
}

export function setCorsHeaders(res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
}

export function buildQueryParams(req) {
  const queryParams = new URLSearchParams();
  Object.entries(req.query).forEach(([key, value]) => {
    if (key !== 'path') queryParams.append(key, value);
  });
  
  if (process.env.NODE_ENV === 'development') queryParams.append('_t', Date.now());
  return queryParams.toString();
}

export function forwardHeaders(sourceRes, destRes, source, customHeaders = []) {
  const headersToForward = [
    'content-type', 'etag', 'last-modified', 'vary', ...customHeaders
  ];
  
  headersToForward.forEach(header => {
    const value = sourceRes.headers.get(header);
    if (value) destRes.setHeader(header, value);
  });
  
  destRes.setHeader('X-Proxy-Time', new Date().toISOString());
  destRes.setHeader('X-Proxy-Source', source);
  destRes.setHeader('X-Content-Type-Options', 'nosniff');
}

const rateLimiters = {};

export function createRateLimiter(name, maxRequests = 15, windowMs = 60000) {
  if (!rateLimiters[name]) {
    rateLimiters[name] = {
      MAX_REQUESTS: maxRequests,
      WINDOW_MS: windowMs,
      requestCounts: {},
      resetTime: Date.now() + windowMs
    };
  }
  return rateLimiters[name];
}

export function checkRateLimit(limiter, req, res) {
  const now = Date.now();
  if (now > limiter.resetTime) {
    limiter.requestCounts = {};
    limiter.resetTime = now + limiter.WINDOW_MS;
  }
  
  const clientId = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  limiter.requestCounts[clientId] = (limiter.requestCounts[clientId] || 0) + 1;
  
  res.setHeader('X-RateLimit-Limit', limiter.MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limiter.MAX_REQUESTS - limiter.requestCounts[clientId]));
  res.setHeader('X-RateLimit-Reset', Math.ceil(limiter.resetTime / 1000));
  
  return limiter.requestCounts[clientId] <= limiter.MAX_REQUESTS;
}