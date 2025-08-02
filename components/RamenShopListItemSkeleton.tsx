import React from 'react';

const RamenShopListItemSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="w-full h-40 bg-gray-300 dark:bg-gray-700"></div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="w-7 h-7 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
          </div>
          <div className="flex-grow min-w-0 space-y-2">
            <div className="h-5 w-3/4 bg-gray-300 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="flex gap-4 pt-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-600 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 pb-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-600 rounded mb-3"></div>
        <div className="space-y-2">
            <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-600 rounded"></div>
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="h-5 w-1/2 mx-auto bg-gray-200 dark:bg-gray-600 rounded-full"></div>
      </div>
    </div>
  );
};

export default RamenShopListItemSkeleton;
