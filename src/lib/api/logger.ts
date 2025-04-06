import { logPrefix, logLevels } from './constants';

/**
 * Enhanced logging with levels and timestamps
 */
export function logWithTime(level: keyof typeof logLevels, ...args: any[]) {
  if (logLevels[level]) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`${logPrefix} [${timestamp}] [${level.toUpperCase()}]`, ...args);
  }
}