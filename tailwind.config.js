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
    },
  },
  plugins: [],
};