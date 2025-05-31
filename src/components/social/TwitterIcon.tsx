import Image from 'next/image';

/**
 * Valid Twitter platform identifiers
 */
type TwitterPlatform = 'x' | 'twitter';

/**
 * Recommended sizes for Twitter icons
 */
const ICON_SIZES = {
  xs: 16,
  sm: 22,
  md: 32,
  lg: 48
} as const;

type IconSizePreset = keyof typeof ICON_SIZES;

/**
 * Props for the TwitterIcon component
 */
interface TwitterIconProps {
  /** 
   * The platform identifier to use (x or twitter)
   * Both point to the X logo, with twitter kept for backward compatibility
   */
  platform?: TwitterPlatform;
  
  /** 
   * Size of the icon:
   * - Pass a number for custom size in pixels
   * - Pass a preset ('xs', 'sm', 'md', 'lg') for standard sizes
   * - Defaults to 'sm' (22px)
   */
  size?: number | IconSizePreset;
  
  /**
   * Custom accessibility label (if not provided, uses platform name)
   */
  ariaLabel?: string;
  
  /**
   * Additional CSS classes to apply
   */
  className?: string;
}

/**
 * Renders a Twitter/X platform icon
 */
export default function TwitterIcon({ 
  platform = 'x', 
  size = 'sm', 
  ariaLabel,
  className = ''
}: TwitterIconProps) {
  // Image paths for the platforms
  const platformToImage = {
    x: '/images/x.jpg',
    twitter: '/images/x.jpg' // Fallback to X logo for Twitter
  };
  
  // Descriptive labels for accessibility
  const platformToLabel = {
    x: 'X (formerly Twitter)',
    twitter: 'X (formerly Twitter)'
  };
  
  // Determine the actual pixel size
  const pixelSize = typeof size === 'string' ? ICON_SIZES[size] : size;
  
  // Validate size to be within reasonable limits
  const validatedSize = Math.max(16, Math.min(pixelSize || 22, 128));
  
  // Get the image source
  const imageSrc = platformToImage[platform];
  
  // Set the alt text using either the custom ariaLabel or the platform description
  const altText = ariaLabel || `${platformToLabel[platform]} logo`;
  
  return (
    <Image 
      src={imageSrc} 
      alt={altText}
      width={validatedSize}
      height={validatedSize}
      className={`inline-block ${className}`}
    />
  );
}