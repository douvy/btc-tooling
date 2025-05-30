import { logPrefix, logLevels, isDev } from './constants';

/**
 * Enhanced logging with levels and timestamps - no-op in production
 */
export function logWithTime(level: keyof typeof logLevels, ...args: any[]) {
  // Removed console logging
}

/**
 * Development-only logging utility - no-op in all environments
 */
export function devLog(...args: any[]) {
  // Removed console logging
}

/**
 * Development-only warning utility - no-op in all environments
 */
export function devWarn(...args: any[]) {
  // Removed console logging
}

/**
 * Error logging utility - no-op in all environments
 */
export function logError(...args: any[]) {
  // Removed console logging
}