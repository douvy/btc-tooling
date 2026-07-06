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

  poweredByHeader: false,
  reactStrictMode: true,
  productionBrowserSourceMaps: true, // Enable source maps in production for monitoring
};

module.exports = nextConfig;