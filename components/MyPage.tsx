
import React, { useState } from 'react';
import { RamenShop, UserPost } from '../types.ts';
import RamenShopListItem from './RamenShopListItem.tsx';
import { Bookmark, CheckCircle, Heart, Image as ImageIcon } from 'lucide-react';
import ResponsiveImage from './ResponsiveImage.tsx';

interface MyPageProps {
  bookmarkedShops: RamenShop[];
  visitedShops: RamenShop[];
  favoriteShops: RamenShop[];
  userPosts: UserPost[];
  onShopSelect: (shop: RamenShop) => void;
}

type MyPageTab = 'bookmarks' | 'visited' | 'favorites' | 'posts';

const getTabClasses = (tabId: MyPageTab, activeTab: MyPageTab) => {
  const baseClasses = 'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors';
  if (tabId === activeTab) {
    return `${baseClasses} border-red-500 text-red-600 dark:text-red-500`;
  }
  return `${baseClasses} border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600`;
};

const getCountClasses = (tabId: MyPageTab, activeTab: MyPageTab) => {
    const baseClasses = 'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold';
    if (tabId === activeTab) {
        return `${baseClasses} bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400`;
    }
    return `${baseClasses} bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300`;
};

const MyPage: React.FC<MyPageProps> = ({
  bookmarkedShops,
  visitedShops,
  favoriteShops,
  userPosts,
  onShopSelect,
}) => {
  const [activeTab, setActiveTab] = useState<MyPageTab>('bookmarks');

  const tabs: { id: MyPageTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'bookmarks', label: '気になる', icon: <Bookmark className="w-5 h-5" />, count: bookmarkedShops.length },
    { id: 'visited', label: '訪問済み', icon: <CheckCircle className="w-5 h-5" />, count: visitedShops.length },
    { id: 'favorites', label: 'お気に入り', icon: <Heart className="w-5 h-5" />, count: favoriteShops.length },
    { id: 'posts', label: '自分の投稿', icon: <ImageIcon className="w-5 h-5" />, count: userPosts.length },
  ];

  const renderContent = () => {
    let shops: RamenShop[] = [];
    switch (activeTab) {
      case 'bookmarks':
        shops = bookmarkedShops;
        break;
      case 'visited':
        shops = visitedShops;
        break;
      case 'favorites':
        shops = favoriteShops;
        break;
      case 'posts':
        return (
          <div className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map(post => (
                <div key={post.postId} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <ResponsiveImage photo={post.image} sizes="(max-width: 768px) 100vw, 50vw" className="w-full h-40 object-cover rounded-md mb-3"/>
                  <p className="text-gray-700 dark:text-gray-200">{post.comment}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{post.createdAt}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">まだ投稿がありません。</p>
            )}
          </div>
        );
    }
    return (
      <div className="space-y-4">
        {shops.length > 0 ? (
          shops.map((shop, index) => (
            <RamenShopListItem 
              key={shop.placeId} 
              shop={shop} 
              index={index + 1} 
              onSelect={() => onShopSelect(shop)} 
              isHovered={false}
              isHighlighted={false}
              onMouseEnter={() => {}}
              onMouseLeave={() => {}}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">まだ登録されたお店がありません。</p>
        )}
      </div>
    );
  };
  
  return (
    <div className="animate-fade-in p-4">
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={getTabClasses(tab.id, activeTab)}
            >
              {tab.icon}
              <span className="ml-2 whitespace-nowrap">{tab.label}</span>
              <span className={getCountClasses(tab.id, activeTab)}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>
      {renderContent()}
    </div>
  );
};

export default MyPage;