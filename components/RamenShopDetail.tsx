
import React, { useState } from 'react';
import { RamenShop, UserPost, Photo } from '../types.ts';
import { ChevronLeft, ChevronRight, Star, MapPin, Clock, Globe, Heart, Bookmark, CheckCircle, MessageSquare, Train, Users, BookOpen, ParkingSquare, Image as ImageIcon, ChevronDown, Lightbulb } from 'lucide-react';
import FeatureTags from './FeatureTags.tsx';
import ReviewAccordion from './ReviewAccordion.tsx';
import UserPostForm from './UserPostForm.tsx';
import UserPostList from './UserPostList.tsx';
import ReviewSummary from './ReviewSummary.tsx';
import ResponsiveImage from './ResponsiveImage.tsx';

interface RamenShopDetailProps {
  shop: RamenShop;
  onBack: () => void;
  isBookmarked: boolean;
  isVisited: boolean;
  isFavorite: boolean;
  onBookmarkToggle: () => void;
  onStatusToggle: (status: 'visited' | 'favorite') => void;
  onAddPost: (post: UserPost) => void;
  userPosts: UserPost[];
}

const DetailSection: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  className?: string;
  isCollapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}> = ({ title, icon, children, className = "", isCollapsible, isExpanded, onToggle }) => {
  if (isCollapsible) {
    return (
      <div className={`border-t border-gray-200 dark:border-gray-800 mt-1 ${className}`}>
        <button onClick={onToggle} className="w-full flex justify-between items-center p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg">
          <h3 className="text-lg font-semibold flex items-center dark:text-white pointer-events-none">
            <span className="text-gray-500 dark:text-gray-400 mr-2">{icon}</span>
            {title}
          </h3>
          <ChevronDown className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 animate-fade-in-fast">
            {children}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`border-t border-gray-200 dark:border-gray-800 mt-1 p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-3 flex items-center dark:text-white">
            <span className="text-gray-500 dark:text-gray-400 mr-2">{icon}</span>
            {title}
        </h3>
        {children}
    </div>
  );
};




const RamenShopDetail: React.FC<RamenShopDetailProps> = ({
  shop,
  onBack,
  isBookmarked,
  isVisited,
  isFavorite,
  onBookmarkToggle,
  onStatusToggle,
  onAddPost,
  userPosts
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const streetViewPhoto: Photo = {
      small: `https://picsum.photos/seed/${shop.placeId}-street/400/200`,
      medium: `https://picsum.photos/seed/${shop.placeId}-street/800/400`,
      large: `https://picsum.photos/seed/${shop.placeId}-street/1200/600`,
      alt: 'Street View'
  };
  
  const INITIAL_MENU_ITEMS = 4;
  const isLongMenu = shop.menu.length > INITIAL_MENU_ITEMS;
  const displayedMenuItems = isMenuExpanded ? shop.menu : shop.menu.slice(0, INITIAL_MENU_ITEMS);

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % shop.photos.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + shop.photos.length) % shop.photos.length);
  };

  return (
    <div className="animate-slide-in-right bg-white dark:bg-gray-900 pb-20">
      <div className="relative group">
        <ResponsiveImage 
            photo={shop.photos[currentImageIndex]} 
            sizes="100vw"
            className="w-full h-64 md:h-80 object-cover transition-opacity duration-300"
        />
        
        <button
          onClick={onBack}
          className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        {shop.photos.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute top-1/2 left-2 -translate-y-1/2 z-10 bg-black bg-opacity-30 text-white rounded-full p-2 hover:bg-opacity-60 transition opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextImage}
              className="absolute top-1/2 right-2 -translate-y-1/2 z-10 bg-black bg-opacity-30 text-white rounded-full p-2 hover:bg-opacity-60 transition opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {shop.photos.map((_photo, index) => (
                <div
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                    currentImageIndex === index ? 'bg-white w-4' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{shop.name}</h2>
        <div className="flex items-center text-md text-gray-600 dark:text-gray-300 mt-2">
          <Star className="w-5 h-5 text-yellow-500 dark:text-yellow-400 mr-1.5" fill="currentColor" />
          <span className="font-bold text-yellow-600 dark:text-yellow-400">{shop.rating.toFixed(1)}</span>
          <span className={`ml-4 px-2 py-1 text-xs font-semibold rounded-full ${shop.isOpenNow ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
            {shop.isOpenNow ? '営業中' : '営業時間外'}
          </span>
          <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
          <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-1.5" />
          <span>{shop.address}</span>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={onBookmarkToggle}
            className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold transition border ${
              isBookmarked ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Bookmark className="w-4 h-4 mr-2" fill={isBookmarked ? 'currentColor' : 'none'} />
            気になる
          </button>
          <button
            onClick={() => onStatusToggle('visited')}
            className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold transition border ${
              isVisited ? 'bg-green-500 text-white border-green-500' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            訪問済み
          </button>
          <button
            onClick={() => onStatusToggle('favorite')}
            className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold transition border ${
              isFavorite ? 'bg-pink-500 text-white border-pink-500' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Heart className="w-4 h-4 mr-2" />
            お気に入り
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 mt-4 p-4">
        <h3 className="text-lg font-semibold mb-3 dark:text-white">レビューからわかる特徴</h3>
        <FeatureTags placeId={shop.placeId} reviews={shop.reviews} />
      </div>
      
      <DetailSection 
        title="AIによるクチコミ要約" 
        icon={<Lightbulb className="w-5 h-5" />}
        isCollapsible
        isExpanded={isSummaryExpanded}
        onToggle={() => setIsSummaryExpanded(!isSummaryExpanded)}
      >
        <ReviewSummary placeId={shop.placeId} reviews={shop.reviews} />
      </DetailSection>
      
      <DetailSection title="店舗情報" icon={<Clock className="w-5 h-5"/>}>
        <ul className="space-y-3 text-gray-700 dark:text-gray-300">
          <li className="flex items-start"><span className="w-5 h-5 mr-3 mt-1" /><span className="whitespace-pre-line">{shop.hours}</span></li>
          <li className="flex items-center">
            <Globe className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" />
            <a href={shop.website} target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-500 hover:underline">公式サイト</a>
          </li>
          {shop.twitterUrl && (
            <li className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              <a href={shop.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 dark:text-red-500 hover:underline">Xで臨時情報を確認</a>
            </li>
          )}
        </ul>
      </DetailSection>

      
      
      <DetailSection title="写真" icon={<ImageIcon className="w-5 h-5" />}>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {shop.photos.map((photo, index) => (
            <div key={index} className="flex-shrink-0" onClick={() => setCurrentImageIndex(index)}>
              <ResponsiveImage
                photo={photo}
                sizes="112px"
                className="w-28 h-28 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-red-500 transition-colors"
              />
            </div>
          ))}
        </div>
      </DetailSection>

      <DetailSection title="メニュー" icon={<BookOpen className="w-5 h-5" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-gray-700 dark:text-gray-300">
            {displayedMenuItems.map((item, index) => (
                <div key={index} className="flex justify-between border-b border-dashed border-gray-200 dark:border-gray-700 py-1">
                    <span>{item.name}</span>
                    <span className="font-semibold">{item.price}</span>
                </div>
            ))}
        </div>
        {isLongMenu && (
          <button 
            onClick={() => setIsMenuExpanded(!isMenuExpanded)}
            className="w-full mt-3 text-center text-red-600 dark:text-red-500 font-semibold text-sm hover:text-red-800 dark:hover:text-red-400 flex items-center justify-center"
          >
            {isMenuExpanded ? '少なく表示' : 'もっと見る'}
            <ChevronDown className={`w-5 h-5 ml-1 transition-transform ${isMenuExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </DetailSection>

      
      
      <DetailSection title="みんなの投稿" icon={<MessageSquare className="w-5 h-5" />}>
         <UserPostForm placeId={shop.placeId} onAddPost={onAddPost} />
         <UserPostList posts={userPosts} />
      </DetailSection>
    </div>
  );
};

export default RamenShopDetail;
