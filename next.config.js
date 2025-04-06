/** @type {import('next').NextConfig} */

// Load deprecation fix at the very start before anything else
require('./util-deprecation-fix');

const nextConfig = {
  // Standard Next.js configuration for Vercel deployment
  images: {
    domains: ['localhost'],
  },
  // Ensure trailing slashes and better compatibility
  trailingSlash: true,
  
  // Suppress specific Node.js deprecation warnings in production
  // This won't show in dev mode, but will apply in Vercel deployment
  webpack: (config, { isServer, dev }) => {
    if (!dev && isServer) {
      // Suppress deprecation warnings in production
      process.noDeprecation = true;
    }
    return config;
  },

  // Optimization for serverless environments (important for Vercel)
  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: true, // Enable source maps in production for monitoring
  
  // API proxy configuration to handle CORS issues in local development
  async rewrites() {
    return [
      // Proxy requests to CoinGecko API to avoid CORS issues
      {
        source: '/api/coingecko/:path*',
        destination: 'https://api.coingecko.com/api/v3/:path*',
      },
      // Alternative API proxy (Coinbase as fallback)
      {
        source: '/api/coinbase/:path*',
        destination: 'https://api.coinbase.com/v2/:path*',
      },
    ];
  },
};

module.exports = nextConfig;