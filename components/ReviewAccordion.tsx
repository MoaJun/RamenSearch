
import React, { useState } from 'react';
import { Review } from '../types.ts';
import { Star, ChevronDown } from 'lucide-react';

interface ReviewAccordionProps {
  reviews: Review[];
}

const ReviewItem: React.FC<{ review: Review }> = ({ review }) => (
  <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
    <div className="flex items-center mb-1">
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            fill="currentColor"
          />
        ))}
      </div>
      <p className="ml-3 font-semibold text-gray-800 dark:text-gray-200">{review.author}</p>
    </div>
    <p className="text-gray-600 dark:text-gray-300 text-sm">{review.text}</p>
  </div>
);

const ReviewAccordion: React.FC<ReviewAccordionProps> = ({ reviews }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!reviews || reviews.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">まだレビューがありません。</p>;
  }

  return (
    <div>
      <ReviewItem review={reviews[0]} />
      {isOpen && (
        <div className="pl-4 border-l-2 border-red-100 dark:border-red-900/50 mt-2">
            {reviews.slice(1).map((review, index) => (
                <ReviewItem key={index} review={review} />
            ))}
        </div>
      )}
      {reviews.length > 1 && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full mt-2 text-center text-red-600 dark:text-red-500 font-semibold text-sm hover:text-red-800 dark:hover:text-red-400 flex items-center justify-center"
        >
          {isOpen ? '閉じる' : `他のレビュー${reviews.length - 1}件を表示`}
          <ChevronDown className={`w-5 h-5 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default ReviewAccordion;