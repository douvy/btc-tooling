import { Tweet } from '@/types';
import Image from 'next/image';

interface TwitterFeedProps {
  tweets: Tweet[];
}

export default function TwitterFeed({ tweets }: TwitterFeedProps) {
  return (
    <aside className="md:w-[330px] block border-l border-divider" role="complementary" aria-labelledby="insights-title">
      <div className="h-full overflow-y-auto p-8 pt-6">
        <h2 id="insights-title" className="text-xl font-fuji-bold mb-4">BTC X Insights</h2>
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
            <span className="text-[#8a919e] text-base font-normal"> @{tweet.handle}</span>
          </p>
          <p className="text-[#8a919e] text-sm">{tweet.time}</p>
        </div>
      </div>
      <p className="text-base mb-2">{tweet.text}</p>
      <div className="flex items-center text-gray-400 text-sm">
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