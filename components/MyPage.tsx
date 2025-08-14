
import React, { useState, useEffect } from 'react';
import { RamenShop, UserPost, FavoriteShop } from '../types.ts';
import RamenShopListItem from './RamenShopListItem.tsx';
import { Bookmark, CheckCircle, Heart, Image as ImageIcon, Star, Calendar, MessageSquare } from 'lucide-react';
import ResponsiveImage from './ResponsiveImage.tsx';
import { favoritesService } from '../services/favoritesService.ts';

interface MyPageProps {
  bookmarkedShops: RamenShop[];
  visitedShops: RamenShop[];
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
  userPosts,
  onShopSelect,
}) => {
  const [activeTab, setActiveTab] = useState<MyPageTab>('bookmarks');
  const [favoriteShops, setFavoriteShops] = useState<FavoriteShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const favorites = await favoritesService.getFavoritesSorted('recent');
      setFavoriteShops(favorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: MyPageTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'bookmarks', label: '気になる', icon: <Bookmark className="w-5 h-5" />, count: bookmarkedShops.length },
    { id: 'visited', label: '訪問済み', icon: <CheckCircle className="w-5 h-5" />, count: visitedShops.length },
    { id: 'favorites', label: 'お気に入り', icon: <Heart className="w-5 h-5" />, count: favoriteShops.length },
    { id: 'posts', label: '自分の投稿', icon: <ImageIcon className="w-5 h-5" />, count: userPosts.length },
  ];

  const renderFavoriteItem = (favorite: FavoriteShop) => (
    <div key={favorite.placeId} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-red-600" 
              onClick={() => onShopSelect({ 
                placeId: favorite.placeId, 
                name: favorite.name, 
                address: favorite.address,
                rating: favorite.rating 
              } as RamenShop)}>
            {favorite.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{favorite.address}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {favorite.rating.toFixed(1)}
            </span>
            {favorite.visitCount && favorite.visitCount > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {favorite.visitCount}回訪問
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {favorite.savedAt.toLocaleDateString('ja-JP')}
            </span>
          </div>

          {favorite.personalNotes && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              {favorite.personalNotes}
            </div>
          )}

          {favorite.tags && favorite.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {favorite.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div className="ml-4 text-red-500">
          <Heart className="w-6 h-6 fill-current" />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'bookmarks':
        return (
          <div className="space-y-4">
            {bookmarkedShops.length > 0 ? (
              bookmarkedShops.map((shop, index) => (
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
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">まだ気になるお店がありません。</p>
            )}
          </div>
        );
        
      case 'visited':
        return (
          <div className="space-y-4">
            {visitedShops.length > 0 ? (
              visitedShops.map((shop, index) => (
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
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">まだ訪問したお店がありません。</p>
            )}
          </div>
        );

      case 'favorites':
        if (loading) {
          return (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">お気に入りを読み込み中...</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {favoriteShops.length > 0 ? (
              favoriteShops.map(renderFavoriteItem)
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">まだお気に入りのお店がありません。</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">お店の詳細ページでハートをタップしてお気に入りに追加しましょう。</p>
              </div>
            )}
          </div>
        );

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