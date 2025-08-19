
import React, { useState, useEffect } from 'react';
import { Review, ReviewSummaryData } from '../types.ts';
import { generateReviewSummary } from '../services/lazyGeminiService.ts';
import { ThumbsUp, ThumbsDown, Lightbulb } from 'lucide-react';

interface ReviewSummaryProps {
  placeId: string;
  reviews: Review[];
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i}>
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded-md mb-3"></div>
                <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                    <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                </div>
            </div>
        ))}
    </div>
);

const SummarySection: React.FC<{ title: string; points: string[]; icon: React.ReactNode; borderColorClass: string; textColorClass: string; }> = ({ title, points, icon, borderColorClass, textColorClass }) => {
    if (!points || points.length === 0) return null;
    return (
        <div className={`bg-gray-50 dark:bg-gray-800/50 border-l-4 p-4 rounded-r-lg ${borderColorClass}`}>
            <h4 className={`font-bold flex items-center mb-2 ${textColorClass}`}>
                {icon}
                <span className="ml-2">{title}</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {points.map((point, index) => <li key={index}>{point}</li>)}
            </ul>
        </div>
    );
};


const ReviewSummary: React.FC<ReviewSummaryProps> = ({ placeId, reviews }) => {
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!reviews || reviews.length === 0) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const combinedReviews = reviews.map(r => r.text).join('\n\n');
        const generatedSummary = await generateReviewSummary(placeId, combinedReviews);
        setSummary(generatedSummary);
      } catch (err) {
        console.error('Failed to generate review summary:', err);
        setError('AIによる要約の生成に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [placeId, reviews]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }
  
  if (!summary || (summary.goodPoints.length === 0 && summary.badPoints.length === 0 && summary.tips.length === 0)) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">要約を生成するのに十分なレビューがありません。</p>;
  }

  return (
    <div className="space-y-4">
        <SummarySection 
            title="良い点" 
            points={summary.goodPoints} 
            icon={<ThumbsUp className="w-5 h-5"/>}
            borderColorClass="border-green-400 dark:border-green-500"
            textColorClass="text-green-700 dark:text-green-400"
        />
        <SummarySection 
            title="惜しい点" 
            points={summary.badPoints} 
            icon={<ThumbsDown className="w-5 h-5"/>}
            borderColorClass="border-red-400 dark:border-red-500"
            textColorClass="text-red-700 dark:text-red-400"
        />
        <SummarySection 
            title="ヒント" 
            points={summary.tips} 
            icon={<Lightbulb className="w-5 h-5"/>}
            borderColorClass="border-blue-400 dark:border-blue-500"
            textColorClass="text-blue-700 dark:text-blue-400"
        />
    </div>
  );
};

export default React.memo(ReviewSummary);
