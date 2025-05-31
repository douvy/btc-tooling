import { ReactNode } from 'react';

type ActionType = 'comment' | 'retweet' | 'heart' | 'chart' | 'share' | 'bookmark';
type ActionSize = 'sm' | 'md' | 'lg';

interface TweetActionProps {
  /**
   * The type of tweet action to display
   */
  type: ActionType;
  
  /**
   * Optional count to display next to the icon
   */
  count?: number | string;
  
  /**
   * Size of the icon (defaults to md)
   */
  size?: ActionSize;
  
  /**
   * Custom icon content (overrides the default icon)
   */
  icon?: ReactNode;
  
  /**
   * Optional className for styling
   */
  className?: string;
  
  /**
   * Click handler for the icon
   */
  onClick?: () => void;
  
  /**
   * ARIA label for accessibility
   */
  ariaLabel?: string;
}

/**
 * Tweet action icon component that supports common Twitter interactions
 */
export default function TweetAction({
  type,
  count,
  size = 'md',
  icon,
  className = '',
  onClick,
  ariaLabel
}: TweetActionProps) {
  // Icon mapping to Font Awesome classes
  const iconMap: Record<ActionType, string> = {
    comment: 'fa-regular fa-comment',
    retweet: 'fa-regular fa-retweet',
    heart: 'fa-regular fa-heart',
    chart: 'fa-regular fa-chart-simple',
    share: 'fa-regular fa-share',
    bookmark: 'fa-regular fa-bookmark'
  };
  
  // Size mapping
  const sizeClasses: Record<ActionSize, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  // Base classes for the component
  const baseClasses = `inline-flex items-center text-muted transition-colors duration-200 ${sizeClasses[size]} ${className}`;
  
  // Determine if it's clickable
  const clickableClasses = onClick ? 'cursor-pointer hover:text-primary' : '';
  
  return (
    <span 
      className={`${baseClasses} ${clickableClasses}`}
      onClick={onClick}
      aria-label={ariaLabel || `${type} ${count ? count : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon ? (
        <span className="mr-1">{icon}</span>
      ) : (
        <i className={`${iconMap[type]} mr-1`} aria-hidden="true"></i>
      )}
      {count !== undefined && <span>{count}</span>}
    </span>
  );
}