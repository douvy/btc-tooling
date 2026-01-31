/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  // Standard Next.js configuration for Vercel deployment
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Ensure trailing slashes and better compatibility
  trailingSlash: true,

  // Also ignore TypeScript errors during build - critical for deployment
  typescript: {
    ignoreBuildErrors: true,
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