/**
 * Design tokens for consistent styling across the application
 */

export const colors = {
  // Core background hierarchy
  mainDark: '#0a0b0d',
  cardBg: '#141519',
  inputBg: '#1E2026',
  divider: '#2A2D33',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#b4b8c1',
  textMuted: '#8a919e',
  textSubtle: '#c2c5cc',
  
  // Primary brand colors
  primary: '#FF6600',
  
  // Status colors
  success: '#27ad75',
  successGhost: 'rgba(34, 197, 94, 0.15)',
  error: '#f0616d',
  errorGhost: 'rgba(239, 68, 68, 0.15)',
  
  // Crypto-specific colors
  btc: '#FF6600',
};

export const spacing = {
  // Base spacing unit: 4px
  none: '0px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  
  // Component-specific spacing
  tweetCardPaddingX: '0px',
  tweetCardPaddingY: '16px',
  tweetCardMarginBottom: '16px',
  tweetCardDividerSpacing: '24px',
};

export const fontSizes = {
  xs: '0.75rem',  // 12px
  sm: '0.875rem', // 14px
  base: '1rem',   // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem',  // 20px
  xxl: '1.5rem',  // 24px
};

export const fontFamilies = {
  fujiBold: 'font-fuji-bold',
  fujiRegular: 'font-fuji-regular',
  gothamBold: 'font-gotham-bold',
  gothamMedium: 'font-gotham-medium',
  gothamLight: 'font-gotham-light',
  proximaNova: 'font-proxima-nova',
};

export const transitions = {
  fast: 'transition-all duration-200 ease-in-out',
  medium: 'transition-all duration-300 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
};

export const zIndices = {
  base: 0,
  overlay: 10,
  modal: 20,
  tooltip: 30,
  max: 50,
};

export const borderRadii = {
  none: '0',
  sm: '0.125rem',  // 2px
  md: '0.25rem',   // 4px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  full: '9999px',  // Full rounded (circles)
};

export const boxShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

/**
 * Tweet card variants for different positions in the feed
 * Each position has specific spacing requirements for visual hierarchy
 */
export const tweetCardVariants = {
  // First tweet - standard top padding, larger bottom padding
  first: {
    paddingTop: spacing.md,    // Reduced from base (16px) to md (12px)
    paddingBottom: spacing.lg, // Reduced from xl (32px) to lg (24px)
    marginBottom: spacing.base, // Reduced from lg (24px) to base (16px)
  },
  // Second tweet - slight top padding, standard bottom
  middle: {
    paddingTop: spacing.xs,    // Reduced from sm (8px) to xs (4px)
    paddingBottom: spacing.lg, // Reduced from xl (32px) to lg (24px)
    marginBottom: spacing.xs,  // Reduced from sm (8px) to xs (4px)
  },
  // Third tweet - moderate top padding (less than before)
  third: {
    paddingTop: spacing.base,  // Reduced from lg (24px) to base (16px)
    paddingBottom: spacing.lg, // Reduced from xl (32px) to lg (24px)
    marginBottom: spacing.xs,  // Reduced from sm (8px) to xs (4px)
  },
  // Last tweet - more top padding, minimal bottom padding
  last: {
    paddingTop: spacing.base,  // Reduced from lg (24px) to base (16px)
    paddingBottom: spacing.none, // No bottom padding at all
    marginBottom: spacing.none,
  },
};