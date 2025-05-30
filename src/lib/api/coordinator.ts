/**
 * API Request Coordinator
 * 
 * This module manages API request timing to prevent exceeding rate limits
 * by coordinating requests across components.
 */

// Global request queue with timestamps
interface QueuedRequest {
  id: string;
  timestamp: number;
  endpoint: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

// Queue of requests
const requestQueue: QueuedRequest[] = [];

// Maximum requests per minute (set conservatively)
const MAX_REQUESTS_PER_MINUTE = 25;

// Minimum time between requests (in ms)
const MIN_REQUEST_INTERVAL = 3000; // 3 seconds

// Last successful request time
let lastRequestTime = 0;

/**
 * Check if a request can be made now
 */
export function canMakeRequest(): boolean {
  const now = Date.now();
  
  // Clean up old requests (older than 1 minute)
  const oneMinuteAgo = now - 60000;
  while (requestQueue.length > 0 && requestQueue[0].timestamp < oneMinuteAgo) {
    requestQueue.shift();
  }
  
  // Check if we've reached the rate limit
  if (requestQueue.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  // Check if minimum interval has passed
  if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
    return false;
  }
  
  return true;
}

/**
 * Register a new API request
 */
export function registerRequest(endpoint: string): string {
  const id = Math.random().toString(36).substring(2, 15);
  const now = Date.now();
  
  requestQueue.push({
    id,
    timestamp: now,
    endpoint,
    status: 'pending'
  });
  
  return id;
}

/**
 * Mark a request as completed
 */
export function completeRequest(id: string, success: boolean = true): void {
  const request = requestQueue.find(r => r.id === id);
  if (request) {
    request.status = success ? 'completed' : 'failed';
    
    if (success) {
      lastRequestTime = Date.now();
    }
  }
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(): {
  requestsInLastMinute: number;
  remainingRequests: number;
  canMakeRequest: boolean;
  nextRequestAllowedIn: number;
} {
  const now = Date.now();
  
  // Clean up old requests
  const oneMinuteAgo = now - 60000;
  while (requestQueue.length > 0 && requestQueue[0].timestamp < oneMinuteAgo) {
    requestQueue.shift();
  }
  
  // Calculate time until next request
  const timeUntilNextRequest = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
  
  return {
    requestsInLastMinute: requestQueue.length,
    remainingRequests: MAX_REQUESTS_PER_MINUTE - requestQueue.length,
    canMakeRequest: canMakeRequest(),
    nextRequestAllowedIn: timeUntilNextRequest
  };
}