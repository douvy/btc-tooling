import { Tweet } from '@/types';
import Image from 'next/image';
import { useState } from 'react';
import { formatCompactNumber } from '@/lib/priceUtils';

interface TweetCardProps {
  tweet: Tweet;
  isLast: boolean;
  onImageClick?: () => void;
}

export default function TweetCard({ tweet, isLast, onImageClick }: TweetCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Check if this is a long tweet that needs truncation
  const isLongTweet = tweet.text.length > 280;
  
  // For long tweets, truncate at a reasonable breakpoint
  const truncatePhrase = '"Smart money"';
  const truncateAt = tweet.text.indexOf(truncatePhrase);
  const shouldTruncate = isLongTweet && truncateAt > 0;
  
  // Only truncate specific tweets that have the "Smart money" phrase
  // Include the first few words of the truncated section for better UX
  const initialText = shouldTruncate 
    ? tweet.text.substring(0, truncateAt) + truncatePhrase + ' frontrunning' 
    : tweet.text;
    
  // Skip the words we already included in initialText
  const remainingText = shouldTruncate
    ? tweet.text.substring(truncateAt + truncatePhrase.length + ' frontrunning'.length)
    : '';
    
  // Specific custom spacing for each tweet using inline styles
  const customStyle: { [key: string]: string } = {};
  
  if (tweet.id === '1') {
    // First tweet - 4px more space at bottom
    customStyle.paddingTop = '16px';  
    customStyle.paddingBottom = '30px'; // 16px + 4px extra
    customStyle.marginBottom = '28px';
  } else if (tweet.id === '2') {
    // Second tweet - 8px more space at bottom
    customStyle.paddingTop = '0px';
    customStyle.paddingBottom = '30px'; // 16px + 8px extra
    customStyle.marginBottom = '12px';
  } else if (tweet.id === '3') {
    // Third tweet - 28px more space at top, reduced bottom padding by 4px
    customStyle.paddingTop = '12px';
    customStyle.paddingBottom = '0px'; // Minimum padding
    customStyle.marginBottom = '-4px'; // Use negative margin instead of negative padding
  }

  return (
    <article className="relative" style={customStyle}>
      {!isLast && <div className="mx-[-1.5rem] md:mx-[-2rem] border-b border-divider absolute bottom-0 left-0 right-0"></div>}
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
          <p className="font-fuji-bold text-base">
            {tweet.link ? (
              <a 
                href={tweet.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tweet.username}
                <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{tweet.handle}</span>
              </a>
            ) : (
              <>
                {tweet.username}
                <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{tweet.handle}</span>
              </>
            )}
          </p>
          <p className="text-[#c2c5cc] text-sm mt-1">{tweet.time}</p>
        </div>
      </div>
      
      <div className="text-base mb-2 text-[#b4b8c1]">
        <p className="whitespace-pre-line">
          {initialText}
          <span 
            className={`transition-opacity duration-300 ease-in-out whitespace-pre-line ${expanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden inline-block'}`}
          >
            {expanded && remainingText}
          </span>
          {shouldTruncate && !expanded && '...'}
          {shouldTruncate && !expanded && (
            <button 
              onClick={() => setExpanded(true)}
              className="ml-1 text-primary hover:text-primary/90 font-medium transition-colors duration-1000"
            >
              Show More
            </button>
          )}
        </p>
        
        {shouldTruncate && expanded && (
          <button 
            onClick={() => setExpanded(false)}
            className="text-primary hover:text-primary/90 font-medium transition-colors duration-1000 mt-2"
          >
            Show Less
          </button>
        )}
      </div>
      
      {tweet.image && (
        <div 
          className="mb-4 mt-2 rounded-lg overflow-hidden border border-divider cursor-pointer transform transition-transform hover:scale-[1.01] duration-300"
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
      
      <div className="flex items-center text-[#8a919e] text-sm font-proxima-nova">
        <div className="flex space-x-4">
          <span><i className="fa-regular fa-comment mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.comments)}</span>
          <span><i className="fa-regular fa-retweet mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.retweets)}</span>
          <span><i className="fa-regular fa-heart mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.likes)}</span>
          <span><i className="fa-regular fa-chart-simple mr-1" aria-hidden="true"></i> {formatCompactNumber(tweet.views)}</span>
        </div>
      </div>
    </article>
  );
}