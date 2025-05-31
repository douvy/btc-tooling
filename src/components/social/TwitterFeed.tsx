'use client';

import { Tweet } from '@/types';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import TweetCard from './TweetCard';
import TwitterIcon from './TwitterIcon';
import ErrorBoundary from '../layout/ErrorBoundary';
import { formatCompactNumber } from '@/lib/priceUtils';
import TweetAction from './TweetAction';

interface TwitterFeedProps {
  tweets: Tweet[];
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * Displays a feed of Bitcoin-related tweets with interactive features
 */
export default function TwitterFeed({ tweets, isLoading = false, error = null }: TwitterFeedProps) {
  const [modalData, setModalData] = useState<{
    isOpen: boolean;
    selectedTweet: Tweet | null;
  }>({
    isOpen: false,
    selectedTweet: null
  });

  const openImageModal = (tweet: Tweet) => {
    if (tweet.image) {
      setModalData({
        isOpen: true,
        selectedTweet: tweet
      });
    }
  };

  const closeImageModal = () => {
    setModalData({
      isOpen: false,
      selectedTweet: null
    });
  };

  // Close modal when ESC key is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalData(prev => ({ ...prev, isOpen: false }));
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

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 rounded-lg border border-red-800 text-white">
        <h2 className="text-lg font-medium mb-2">Failed to load tweets</h2>
        <p className="text-sm opacity-80 mb-3">
          {error.message || 'An unexpected error occurred while loading tweets'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <TwitterFeedFallback />;
  }

  if (!tweets || tweets.length === 0) {
    return (
      <div className="p-4 bg-gray-800/20 rounded-lg border border-gray-700 text-white">
        <h2 className="text-lg font-medium mb-2">No tweets available</h2>
        <p className="text-sm opacity-80">Check back later for new Bitcoin insights</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <h2 className="text-xl font-fuji-bold mb-6 sm:mt-6 flex items-center">
          BTC 
          <span className="mx-1 flex items-center">
            <TwitterIcon 
              platform="x"
              size="sm"
              ariaLabel="Bitcoin X feed" 
            />
          </span> 
          Insights
        </h2>
        <div className="space-y-0 -mt-4">
          {tweets.map((tweet, index) => {
            // Determine position variant based on index
            const variant = index === 0 ? 'first' : 
                          index === tweets.length - 1 ? 'last' : 'middle';
            
            return (
              <TweetCard 
                key={tweet.id} 
                tweet={tweet} 
                isLast={index === tweets.length - 1}
                variant={variant}
                onImageClick={() => openImageModal(tweet)}
              />
            );
          })}
        </div>

        {/* Image Modal */}
        {modalData.isOpen && modalData.selectedTweet && modalData.selectedTweet.image && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={closeImageModal}>
            <div className="relative bg-main-dark w-full max-w-3xl mx-4 rounded-lg overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
              {/* Close button */}
              <button 
                className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-main-dark/80 text-white hover:bg-main-dark transition-colors duration-200"
                onClick={closeImageModal}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Image */}
              <div className="w-full">
                <Image 
                  src={`/images/${modalData.selectedTweet.image}`}
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
                      src={`/images/${modalData.selectedTweet.profileImage}`} 
                      alt={`Profile picture of ${modalData.selectedTweet.username}`}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-fuji-bold text-base">
                      {modalData.selectedTweet.link ? (
                        <a 
                          href={modalData.selectedTweet.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline"
                        >
                          {modalData.selectedTweet.username}
                          <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{modalData.selectedTweet.handle}</span>
                        </a>
                      ) : (
                        <>
                          {modalData.selectedTweet.username}
                          <span className="text-[#c2c5cc] text-base font-fuji-regular"> @{modalData.selectedTweet.handle}</span>
                        </>
                      )}
                    </p>
                    <p className="text-[#c2c5cc] text-sm mt-1">{modalData.selectedTweet.time}</p>
                  </div>
                </div>
                
                <p className="text-base mb-4 text-[#b4b8c1] whitespace-pre-line">{modalData.selectedTweet.text}</p>
                
                <div className="flex items-center justify-between text-[#8a919e] text-sm font-proxima-nova">
                  <div className="flex space-x-6">
                    <TweetAction type="comment" count={formatCompactNumber(modalData.selectedTweet.comments)} />
                    <TweetAction type="retweet" count={formatCompactNumber(modalData.selectedTweet.retweets)} />
                    <TweetAction type="heart" count={formatCompactNumber(modalData.selectedTweet.likes)} />
                    <TweetAction type="chart" count={formatCompactNumber(modalData.selectedTweet.views)} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

/**
 * Loading skeleton for the TwitterFeed component
 */
function TwitterFeedFallback() {
  return (
    <div className="animate-pulse">
      <h2 className="text-xl font-fuji-bold mb-6 sm:mt-6 flex items-center">
        BTC 
        <span className="mx-1 flex items-center opacity-50">
          <div className="w-[22px] h-[22px] rounded-full bg-gray-800"></div>
        </span> 
        Insights
      </h2>
      
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-6">
            <div className="flex items-start mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-800 mr-3"></div>
              <div>
                <div className="h-5 bg-gray-800 rounded w-40 mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-24"></div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-gray-800 rounded w-full"></div>
              <div className="h-4 bg-gray-800 rounded w-5/6"></div>
              <div className="h-4 bg-gray-800 rounded w-4/6"></div>
            </div>
            
            {i === 3 && (
              <div className="h-40 bg-gray-800 rounded w-full mt-3"></div>
            )}
            
            <div className="flex space-x-4 mt-3">
              <div className="h-4 bg-gray-800 rounded w-12"></div>
              <div className="h-4 bg-gray-800 rounded w-12"></div>
              <div className="h-4 bg-gray-800 rounded w-12"></div>
              <div className="h-4 bg-gray-800 rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}