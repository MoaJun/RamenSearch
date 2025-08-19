
import React, { useState, useEffect } from 'react';
import { Review } from '../types.ts';
import { generateFeatureTags } from '../services/lazyGeminiService.ts';
import { Tag } from 'lucide-react';

interface FeatureTagsProps {
  placeId: string;
  reviews: Review[];
}

const LoadingSkeleton: React.FC = () => (
    <div className="flex flex-wrap gap-2 animate-pulse">
        <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
    </div>
);


const FeatureTags: React.FC<FeatureTagsProps> = ({ placeId, reviews }) => {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const combinedReviews = reviews.map(r => r.text).join(' ');
        const generatedTags = await generateFeatureTags(placeId, combinedReviews);
        setTags(generatedTags);
      } catch (err) {
        console.error('Failed to generate feature tags:', err);
        setError('特徴タグの生成に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [placeId, reviews]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, index) => (
        <div key={index} className="flex items-center bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 text-sm font-medium px-3 py-1 rounded-full">
          <Tag className="w-3.5 h-3.5 mr-1.5 text-red-500" />
          {tag}
        </div>
      ))}
    </div>
  );
};

export default FeatureTags;
