/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core background hierarchy
        'main-dark': '#0a0b0d',
        'card-bg': '#141519',
        'input-bg': '#1E2026',
        'divider': '#2A2D33',
        
        // Primary brand colors
        'primary': '#FF6600',
        
        // Status colors
        'success': '#27ad75',
        'success-ghost': 'rgba(34, 197, 94, 0.15)',
        'error': '#f0616d',
        'error-ghost': 'rgba(239, 68, 68, 0.15)',
        
        // Crypto-specific colors
        'btc': '#FF6600',
      },
      fontFamily: {
        'fuji-bold': ['Fuji-Bold', 'sans-serif'],
        'fuji-regular': ['Fuji-Regular', 'sans-serif'],
        'gotham-bold': ['GothamCondensed-Bold', 'sans-serif'],
        'gotham-medium': ['GothamCondensed-Medium', 'sans-serif'],
        'gotham-light': ['GothamCondensed-Light', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'orderbook-flash-red': {
          '0%': { backgroundColor: 'rgba(240, 97, 109, 0.3)' },
          '100%': { backgroundColor: 'transparent' }
        },
        'orderbook-flash-green': {
          '0%': { backgroundColor: 'rgba(39, 173, 117, 0.3)' },
          '100%': { backgroundColor: 'transparent' }
        }
      },
      animation: {
        'fadeIn': 'fadeIn 0.2s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orderbook-flash-red': 'orderbook-flash-red 300ms ease-out forwards',
        'orderbook-flash-green': 'orderbook-flash-green 300ms ease-out forwards'
      },
      gridTemplateColumns: {
        '18': 'repeat(18, minmax(0, 1fr))',
      }
    },
  },
  plugins: [],
};