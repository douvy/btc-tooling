import Image from 'next/image';

/**
 * Props for the SocialIcon component
 */
interface SocialIconProps {
  /** The social media platform to display the icon for */
  platform: 'x' | 'twitter' | 'facebook' | 'linkedin' | 'instagram';
  /** The size of the icon in pixels (default: 22) */
  size?: number;
}

/**
 * Renders a social media platform icon
 * 
 * @param props - Component properties
 * @param props.platform - The social media platform
 * @param props.size - Size of the icon in pixels
 * @returns An Image component for the requested social platform
 */
export default function SocialIcon({ platform, size = 22 }: SocialIconProps) {
  const platformToImage = {
    x: '/images/x.jpg',
    twitter: '/images/x.jpg', // Fallback to X logo for Twitter
    facebook: '/images/facebook.png',
    linkedin: '/images/linkedin.png',
    instagram: '/images/instagram.png'
  };
  
  const imageSrc = platformToImage[platform] || platformToImage.x;
  
  return (
    <Image 
      src={imageSrc} 
      alt={`${platform} logo`}
      width={size}
      height={size}
      className="inline-block"
    />
  );
}