/**
 * API endpoint to monitor actual request rate to CoinGecko
 */

const requestLog = [];
const MAX_LOG_SIZE = 100;

export default async function handler(req, res) {
  // Get the current time
  const now = Date.now();
  
  // Add this request to the log
  requestLog.push(now);
  
  // Limit log size
  if (requestLog.length > MAX_LOG_SIZE) {
    requestLog.shift();
  }
  
  // Calculate requests in the last minute
  const oneMinuteAgo = now - 60000;
  const requestsInLastMinute = requestLog.filter(time => time > oneMinuteAgo).length;
  
  // Calculate requests in the last 10 seconds
  const tenSecondsAgo = now - 10000;
  const requestsInLastTenSeconds = requestLog.filter(time => time > tenSecondsAgo).length;
  
  // Calculate all time intervals
  const intervals = [1, 5, 10, 15, 30, 60].map(seconds => {
    const timeAgo = now - (seconds * 1000);
    return {
      seconds,
      requests: requestLog.filter(time => time > timeAgo).length,
      rate: requestLog.filter(time => time > timeAgo).length / seconds
    };
  });
  
  // Return the current rate
  res.status(200).json({
    currentRate: {
      requestsPerMinute: requestsInLastMinute,
      requestsPer10Seconds: requestsInLastTenSeconds,
    },
    intervals,
    log: requestLog.map(time => ({
      time,
      ago: Math.floor((now - time) / 1000) + 's ago'
    }))
  });
}