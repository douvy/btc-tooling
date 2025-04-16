import { Tweet } from '@/types';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface TwitterFeedProps {
  tweets: Tweet[];
}

export default function TwitterFeed({ tweets }: TwitterFeedProps) {
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    image: string;
    tweet: Tweet | null;
  }>({
    isOpen: false,
    image: '',
    tweet: null
  });

  // Close modal when ESC key is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalData({ ...modalData, isOpen: false });
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    // Prevent scrolling when modal is open
    if (modalData.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [modalData.isOpen]);

  const openModal = (tweet: Tweet) => {
    if (tweet.image) {
      setModalData({
        isOpen: true,
        image: tweet.image,
        tweet: tweet
      });
    }
  };

  const closeModal = () => {
    setModalData({
      ...modalData,
      isOpen: false
    });
  };

  return (
    <aside className="md:w-[330px] block border-l border-divider" role="complementary" aria-labelledby="insights-title">
      <div className="h-full overflow-y-auto p-8 pt-6 pl-6 pr-6 md:p-8 md:pt-6">
        <h2 id="insights-title" className="text-xl font-fuji-bold mb-6 flex items-center">
          BTC 
          <span className="mx-1 flex items-center">
            <Image 
              src="/images/x.jpg" 
              alt="X logo" 
              width={22} 
              height={22} 
              className="inline-block"
            />
          </span> 
          Insights
        </h2>
        <div className="space-y-0 -mt-4">
          {tweets.map((tweet, index) => (
            <TweetCard 
              key={tweet.id} 
              tweet={tweet} 
              isLast={index === tweets.length - 1} 
              onImageClick={() => openModal(tweet)}
            />
          ))}
        </div>
      </div>

      {/* Image Modal */}
      {modalData.isOpen && modalData.tweet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeModal}>
          <div className="relative bg-main-dark w-full max-w-3xl mx-4 rounded-lg overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button 
              className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-main-dark/80 text-white hover:bg-main-dark transition-colors duration-200"
              onClick={closeModal}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Image */}
            <div className="w-full">
              <Image 
                src={`/images/${modalData.image}`}
                alt="Tweet image"
                width={1200}
                height={800}
                className="w-full h-auto object-contain"
              />
            </div>
            
            {/* Tweet info */}
            <div className="p-6 border-t border-divider">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-btc flex-shrink-0 mr-3 overflow-hidden">
                  <Image 
                    src={`/images/${modalData.tweet.profileImage}`} 
                    alt={`Profile picture of ${modalData.tweet.username}`}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-fuji-bold text-base">
                    {modalData.tweet.link ? (
                      <a 
                        href={modalData.tweet.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline"
                      >
                        {modalData.tweet.username}
                        <span className="text-[#8a919e] text-base font-fuji-regular"> @{modalData.tweet.handle}</span>
                      </a>
                    ) : (
                      <>
                        {modalData.tweet.username}
                        <span className="text-[#8a919e] text-base font-fuji-regular"> @{modalData.tweet.handle}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[#8a919e] text-sm font-gotham-medium">{modalData.tweet.time}</p>
                </div>
              </div>
              
              <p className="text-sm mb-4 whitespace-pre-line">{modalData.tweet.text}</p>
              
              <div className="flex items-center justify-between text-[#8a919e] text-sm font-gotham-medium">
                <div className="flex space-x-6">
                  <span><i className="fa-regular fa-comment mr-1" aria-hidden="true"></i> {modalData.tweet.comments}</span>
                  <span><i className="fa-regular fa-retweet mr-1" aria-hidden="true"></i> {modalData.tweet.retweets}</span>
                  <span><i className="fa-regular fa-heart mr-1" aria-hidden="true"></i> {modalData.tweet.likes}</span>
                  <span><i className="fa-regular fa-chart-simple mr-1" aria-hidden="true"></i> {modalData.tweet.views}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

interface TweetCardProps {
  tweet: Tweet;
  isLast: boolean;
  onImageClick: () => void;
}

function TweetCard({ tweet, isLast, onImageClick }: TweetCardProps) {
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
                <span className="text-[#8a919e] text-base font-fuji-regular"> @{tweet.handle}</span>
              </a>
            ) : (
              <>
                {tweet.username}
                <span className="text-[#8a919e] text-base font-fuji-regular"> @{tweet.handle}</span>
              </>
            )}
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