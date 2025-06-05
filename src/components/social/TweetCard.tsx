import { Tweet } from '@/types';
import Image from 'next/image';
import { useTruncateText } from '@/hooks/useTruncateText';
import { formatCompactNumber } from '@/lib/priceUtils';
import TweetAction from './TweetAction';
import { fontFamilies, tweetCardVariants, transitions } from '@/styles/tokens';

type PositionVariant = 'first' | 'middle' | 'third' | 'last';

interface TweetCardProps {
  /**
   * The tweet data to display
   */
  tweet: Tweet;
  
  /**
   * Whether this is the last tweet in the list
   */
  isLast: boolean;
  
  /**
   * Optional position variant for custom spacing
   */
  variant?: PositionVariant;
  
  /**
   * Handler for when the tweet image is clicked
   */
  onImageClick?: () => void;
}

/**
 * Displays a tweet with user profile, content, and engagement metrics
 */
export default function TweetCard({ 
  tweet, 
  isLast, 
  variant,
  onImageClick 
}: TweetCardProps) {
  // Always use the variant provided by the parent component
  const cardVariant = variant || 'middle';
  
  // Apply variant-specific spacing
  const variantStyle = tweetCardVariants[cardVariant];
  
  // Set up text truncation using the custom hook
  const {
    initialText,
    remainingText,
    expanded,
    toggleExpanded,
    isTruncated
  } = useTruncateText(tweet.text, {
    maxLength: 280,
    truncatePhrase: '"Smart money"',
    wordsAfter: 'frontrunning'
  });

  return (
    <article className="relative" style={variantStyle}>
      {!isLast && (
        <div className="mx-[-1.5rem] md:mx-[-2rem] border-b border-divider absolute bottom-0 left-0 right-0"></div>
      )}
      
      <div className="flex items-start mb-2">
        <div className="w-10 h-10 rounded-full bg-btc flex-shrink-0 mr-3 overflow-hidden">
          <Image 
            src={`/images/${tweet.profileImage}`} 
            alt={`Profile picture of ${tweet.username}`}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className={`${fontFamilies.fujiBold} text-base`}>
            {tweet.link ? (
              <a 
                href={tweet.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tweet.username}
                <span className={`text-subtle text-base ${fontFamilies.fujiRegular}`}> @{tweet.handle}</span>
              </a>
            ) : (
              <>
                {tweet.username}
                <span className={`text-subtle text-base ${fontFamilies.fujiRegular}`}> @{tweet.handle}</span>
              </>
            )}
          </p>
          <p className="text-subtle text-sm mt-1">{tweet.time}</p>
        </div>
      </div>
      
      <div className="text-base mb-2 text-secondary">
        <p className="whitespace-pre-line">
          {initialText}
          <span 
            className={`${transitions.medium} whitespace-pre-line ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden inline-block'}`}
          >
            {expanded && remainingText}
          </span>
          {isTruncated && !expanded && '...'}
          
          {isTruncated && !expanded && (
            <button 
              onClick={() => toggleExpanded()}
              className={`ml-1 text-primary hover:text-primary/90 font-medium ${transitions.slow}`}
            >
              Show More
            </button>
          )}
        </p>
        
        {isTruncated && expanded && (
          <button 
            onClick={() => toggleExpanded()}
            className={`text-primary hover:text-primary/90 font-medium ${transitions.slow} mt-2`}
          >
            Show Less
          </button>
        )}
      </div>
      
      {tweet.image && (
        <div 
          className={`mb-4 mt-2 rounded-lg overflow-hidden border border-divider cursor-pointer ${transitions.medium} hover:scale-[1.01]`}
          onClick={onImageClick}
        >
          <Image 
            src={`/images/${tweet.image}`}
            alt="Tweet image"
            width={600}
            height={400}
            className="w-full h-auto object-cover"
          />
        </div>
      )}
      
      <div className="flex items-center text-muted text-sm font-proxima-nova">
        <div className="flex space-x-4">
          <TweetAction type="comment" count={formatCompactNumber(tweet.comments)} />
          <TweetAction type="retweet" count={formatCompactNumber(tweet.retweets)} />
          <TweetAction type="heart" count={formatCompactNumber(tweet.likes)} />
          <TweetAction type="chart" count={formatCompactNumber(tweet.views)} />
        </div>
      </div>
    </article>
  );
}