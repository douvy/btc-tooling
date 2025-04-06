/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standard Next.js configuration for Vercel deployment
  images: {
    domains: ['localhost'],
  },
  // Ensure trailing slashes and better compatibility
  trailingSlash: true,
};

module.exports = nextConfig;