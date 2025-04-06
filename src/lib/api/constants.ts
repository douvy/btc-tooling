// Environment configuration
export const isDev = process.env.NODE_ENV === 'development';
export const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

// Logging settings
export const logPrefix = '[BTC API]';
export const logLevels = {
  update: true,  // Data updates
  fetch: true,   // API fetches
  cache: true,   // Cache operations
  error: true,   // Errors
  debug: debugMode // Debug info
};

// Status tracking
export const lastUpdateTimestamp = {
  apiCall: 0,
  dataUpdate: 0,
  error: 0
};

export const updateStatus = {
  isLoading: false,
  isFetching: false,
  hasError: false,
  errorMessage: '',
  lastStatus: 200
};

// Cache settings
export const CACHE_LIFETIME = 3000; // 3 seconds

// Request configuration
export const MAX_RETRIES = 2;
export const RETRY_DELAY = 1000; // 1 second
export const REQUEST_TIMEOUT = 8000; // 8 seconds