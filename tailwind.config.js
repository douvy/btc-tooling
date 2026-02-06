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
        'divider': '#22262B',
        
        // Text color palette
        'white': '#FFFFFF',
        'secondary': '#b4b8c1',
        'muted': '#8a919e',
        'muted-hover': '#7a8090', // Slightly darker than muted for hover states
        'subtle': '#c2c5cc',
        'dim': '#666666',
        'light-gray': '#d0d2d8',
        'dark-grayish-blue': '#81919e',
        
        // Primary brand colors
        'primary': '#D9952B',
        'primary-hover': '#E5A73F',
        'primary-active': '#C4861F',
        
        // Status colors
        'success': '#27ad75',
        'success-light': '#4eca92',
        'success-ghost': 'rgba(34, 197, 94, 0.15)',
        'error': '#f0616d',
        'error-light': '#f58a93',
        'error-ghost': 'rgba(239, 68, 68, 0.15)',
        'warning': '#f5a623',
        'info': '#3b82f6',
        
        // Crypto-specific colors
        'btc': '#D9952B',
        'btc-alt': '#E5A73F',
        
        // UI element backgrounds
        'dark-blue': '#001e3c',
        'dark-navy': '#1c2232',
        'dark-card': '#141519',
        'card-border': '#21232A',
      },
      fontFamily: {
        'fuji-bold': ['Fuji-Bold', 'sans-serif'],
        'fuji-regular': ['Fuji-Regular', 'sans-serif'],
        'gotham-bold': ['GothamCondensed-Bold', 'sans-serif'],
        'gotham-medium': ['GothamCondensed-Medium', 'sans-serif'],
        'gotham-light': ['GothamCondensed-Light', 'sans-serif'],
        'proxima-nova': ['Proxima Nova', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'orderbook-flash-red': {
          '0%': { backgroundColor: 'rgba(240, 97, 109, 0.15)' },
          '50%': { backgroundColor: 'rgba(240, 97, 109, 0.1)' },
          '100%': { backgroundColor: 'transparent' }
        },
        'orderbook-flash-green': {
          '0%': { backgroundColor: 'rgba(39, 173, 117, 0.15)' },
          '50%': { backgroundColor: 'rgba(39, 173, 117, 0.1)' },
          '100%': { backgroundColor: 'transparent' }
        },
        'price-flicker-red': {
          '0%': { color: 'rgb(255, 255, 255)' },
          '20%': { color: 'rgb(255, 160, 170)' },
          '100%': { color: 'rgb(240, 97, 109)' }
        },
        'price-flicker-green': {
          '0%': { color: 'rgb(255, 255, 255)' },
          '20%': { color: 'rgb(160, 255, 170)' },
          '100%': { color: 'rgb(39, 173, 117)' }
        }
      },
      animation: {
        'fadeIn': 'fadeIn 0.2s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orderbook-flash-red': 'orderbook-flash-red 100ms ease-out forwards',
        'orderbook-flash-green': 'orderbook-flash-green 100ms ease-out forwards',
        'price-flicker-red': 'price-flicker-red 80ms ease-out forwards',
        'price-flicker-green': 'price-flicker-green 80ms ease-out forwards'
      },
      gridTemplateColumns: {
        '18': 'repeat(18, minmax(0, 1fr))',
      },
      transitionTimingFunction: {
        'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      transitionDuration: {
        '400': '400ms',
      },
      borderRadius: {
        'xl': '1rem',
      },
      spacing: {
        '18': '4.5rem',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};