
import React from 'react';
import { Loader2 } from 'lucide-react';

const AppLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-20">
      <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">読み込み中...</p>
    </div>
  );
};

export default AppLoader;
