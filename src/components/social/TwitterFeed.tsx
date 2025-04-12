import { Tweet } from '@/types';
import Image from 'next/image';
import { useState } from 'react';

interface TwitterFeedProps {
  tweets: Tweet[];
}

export default function TwitterFeed({ tweets }: TwitterFeedProps) {
  return (
    <aside className="md:w-[330px] block border-l border-divider" role="complementary" aria-labelledby="insights-title">
      <div className="h-full overflow-y-auto p-8 pt-6 pl-6 pr-6 md:p-8 md:pt-6">
        <h2 id="insights-title" className="text-xl font-fuji-bold mb-6">BTC X Insights</h2>
        <div className="space-y-4">
          {tweets.map((tweet, index) => (
            <TweetCard 
              key={tweet.id} 
              tweet={tweet} 
              isLast={index === tweets.length - 1} 
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

interface TweetCardProps {
  tweet: Tweet;
  isLast: boolean;
}

function TweetCard({ tweet, isLast }: TweetCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  // Check if this is a long tweet that needs truncation
  const isLongTweet = tweet.text.length > 280;
  
  // For long tweets, truncate at an earlier point (2 lines higher)
  // Instead of truncating at "Smart money", truncate at "It's the beginning"
  const truncatePhrase = "It's the beginning";
  const truncateAt = tweet.text.indexOf(truncatePhrase);
  const shouldTruncate = isLongTweet && truncateAt > 0;
  
  // Only truncate specific tweets that have the phrase "It's the beginning"
  const initialText = shouldTruncate 
    ? tweet.text.substring(0, truncateAt)
    : tweet.text;
    
  // Show the rest of the text when expanded
  const remainingText = shouldTruncate
    ? tweet.text.substring(truncateAt)
    : '';

  return (
    <article className={`${isLast ? 'pb-0' : 'border-b border-divider pb-4'}`}>
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
            {tweet.username}
            <span className="text-[#8a919e] text-base font-fuji-regular"> @{tweet.handle}</span>
          </p>
          <p className="text-[#8a919e] text-sm font-gotham-medium">{tweet.time}</p>
        </div>
      </div>
      
      <div className="text-sm mb-2">
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
      
      <div className="flex items-center text-[#8a919e] text-sm font-gotham-medium">
        <div className="flex space-x-4">
          <span><i className="fa-regular fa-comment mr-1" aria-hidden="true"></i> {tweet.comments}</span>
          <span><i className="fa-regular fa-retweet mr-1" aria-hidden="true"></i> {tweet.retweets}</span>
          <span><i className="fa-regular fa-heart mr-1" aria-hidden="true"></i> {tweet.likes}</span>
          <span><i className="fa-regular fa-chart-simple mr-1" aria-hidden="true"></i> {tweet.views}</span>
        </div>
      </div>
    </article>
  );
}