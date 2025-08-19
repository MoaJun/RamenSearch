
import React, { useState } from 'react';
import { RamenShop, Review } from '../types.ts';
import { Star, MapPin, ChevronDown, ChevronLeft, ChevronRight, Train, Users, Lightbulb } from 'lucide-react';
import ReviewSummary from './ReviewSummary.tsx';
import ResponsiveImage from './ResponsiveImage.tsx';
import FavoriteButton from './FavoriteButton.tsx';

interface RamenShopListItemProps {
  shop: RamenShop;
  onSelect: () => void;
  index: number;
  isHovered: boolean;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick?: () => void;
}

const CongestionIndicator: React.FC<{ status: RamenShop['congestion'] }> = ({ status }) => {
    const statusMap = {
      '混雑': { text: '混雑', color: 'text-red-600 dark:text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/50' },
      '普通': { text: '普通', color: 'text-yellow-600 dark:text-yellow-500', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' },
      '空席あり': { text: '空席あり', color: 'text-green-600 dark:text-green-500', bgColor: 'bg-green-100 dark:bg-green-900/50' },
      '不明': { text: '不明', color: 'text-gray-500 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-700' },
    };
    const { text, color, bgColor } = statusMap[status];
    return (
        <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${bgColor} ${color}`}>
            <Users className="w-3 h-3 mr-1" />
            {text}
        </span>
    );
};

const ReviewItem: React.FC<{ review: Review }> = ({ review }) => (
    <div className="py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
        <div className="flex items-center mb-1">
            <div className="flex">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`} fill="currentColor" />
                ))}
            </div>
            <p className="ml-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">{review.author}</p>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed line-clamp-3">{review.text}</p>
    </div>
);

const RamenShopListItem: React.FC<RamenShopListItemProps> = ({ shop, onSelect, index, isHovered, isHighlighted, onMouseEnter, onMouseLeave, onClick }) => {
  console.log('RamenShopListItem received shop:', shop); // DEBUG: Added missing log
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [reviewPage, setReviewPage] = useState(0);
  
  const REVIEWS_PER_PAGE = 4;
  const otherReviews = shop.reviews.slice(1);
  const pageCount = Math.ceil(otherReviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = otherReviews.slice(reviewPage * REVIEWS_PER_PAGE, (reviewPage + 1) * REVIEWS_PER_PAGE);
  
  const toggleAccordion = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isReviewsOpen) {
      setReviewPage(0); // Reset page when closing
    }
    setIsReviewsOpen(!isReviewsOpen);
  };

  const toggleSummaryAccordion = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsSummaryOpen(!isSummaryOpen);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 group ${
        isHighlighted ? 'ring-2 ring-blue-500 shadow-lg transform scale-105' : 
        isHovered ? 'ring-2 ring-red-500' : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors" onClick={onSelect}>
        <ResponsiveImage photo={shop.photos[0]} sizes="(max-width: 768px) 100vw, 50vw" className="w-full h-40 object-cover" />
        <div className="p-4">
            <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
                <span className="flex items-center justify-center w-7 h-7 bg-red-600 text-white rounded-full font-bold text-sm shadow-md">{index}</span>
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate flex-1 mr-2">{shop.name}</h3>
                  <FavoriteButton shop={shop} size="medium" />
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                <Star className="w-4 h-4 text-yellow-500 dark:text-yellow-400 mr-1 flex-shrink-0" fill="currentColor" />
                <span className="font-bold text-yellow-600 dark:text-yellow-400 mr-2">{shop.rating.toFixed(1)}</span>
                <span className="mr-2">·</span>
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-1 flex-shrink-0" />
                <span className="truncate">{shop.address}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <span className="flex items-center"><Train className="w-4 h-4 mr-1.5 text-gray-400 dark:text-gray-500" />{shop.accessInfo}</span>
                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-gray-400 dark:text-gray-500" />約 {Math.round(shop.distance)}m</span>
                    <CongestionIndicator status={shop.congestion} />
                </div>
            </div>
            </div>
        </div>
      </div>
      
      {shop.reviews && shop.reviews.length > 0 && (
        <div className="px-4 pt-3 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">最新のレビュー</p>
          <ReviewItem review={shop.reviews[0]} />
          
          {isReviewsOpen && (
            <>
              <div className="mt-2 space-y-2">
                  {paginatedReviews.map((review, idx) => (
                      <ReviewItem key={idx} review={review} />
                  ))}
              </div>
              {pageCount > 1 && (
                <div className="flex justify-between items-center mt-3 text-sm">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setReviewPage(p => p - 1); }} 
                    disabled={reviewPage === 0}
                    className="flex items-center p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">前へ</span>
                  </button>
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">
                    {reviewPage + 1} / {pageCount}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setReviewPage(p => p + 1); }} 
                    disabled={reviewPage >= pageCount - 1}
                    className="flex items-center p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                     <span className="hidden sm:inline">次へ</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}

          {shop.reviews.length > 1 && (
             <button
                onClick={toggleAccordion}
                className="w-full mt-2 text-center text-red-600 dark:text-red-500 font-semibold text-sm hover:text-red-800 dark:hover:text-red-400 flex items-center justify-center"
            >
                {isReviewsOpen ? 'レビューを閉じる' : `他のレビュー${shop.reviews.length - 1}件を表示`}
                <ChevronDown className={`w-5 h-5 ml-1 transition-transform ${isReviewsOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <button
            onClick={toggleSummaryAccordion}
            className="w-full text-red-600 dark:text-red-500 font-semibold text-sm hover:text-red-800 dark:hover:text-red-400 flex items-center justify-center"
        >
            <Lightbulb className="w-4 h-4 mr-2" />
            {isSummaryOpen ? 'AI要約を閉じる' : 'AIによるクチコミ要約を見る'}
            <ChevronDown className={`w-5 h-5 ml-1 transition-transform ${isSummaryOpen ? 'rotate-180' : ''}`} />
        </button>
        {isSummaryOpen && (
            <div className="mt-3">
                <ReviewSummary placeId={shop.placeId} reviews={shop.reviews} />
            </div>
        )}
      </div>

      {shop.keywords && shop.keywords.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
                {shop.keywords.slice(0, 4).map(keyword => (
                <span key={keyword} className="text-xs bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 px-2 py-1 rounded-full">
                    {keyword}
                </span>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(RamenShopListItem);
