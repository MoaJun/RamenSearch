import React, { useState, Suspense } from 'react';
import { RamenShop, UserPost } from '../types.ts';
import { ArrowLeft, Star, MapPin, Bookmark, Heart, CheckSquare, ExternalLink, Car, Navigation, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ReviewSummary from './ReviewSummary.tsx';
import PhotoModal from './PhotoModal.tsx';
import BusinessHours from './BusinessHours.tsx';

// Lazy load Google Maps component for better performance
const StoreMap = React.lazy(() => import('./StoreMap.tsx'));

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


const RamenShopDetail: React.FC<RamenShopDetailProps> = ({
  shop,
  onBack,
  isBookmarked,
  isVisited,
  isFavorite,
  onBookmarkToggle,
  onStatusToggle,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <header className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center text-gray-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          戻る
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          {/* Photo Gallery Carousel */}
          <div className="relative">
            <img 
              src={shop.photos[currentPhotoIndex]?.large || shop.photos[0]?.medium || ''} 
              alt={`${shop.name} - ${currentPhotoIndex + 1}`}
              className="w-full h-80 object-cover cursor-pointer"
              onClick={() => setIsPhotoModalOpen(true)}
            />
            {shop.photos.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => 
                    prev === 0 ? shop.photos.length - 1 : prev - 1
                  )}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => 
                    prev === shop.photos.length - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Shop Details */}
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">{shop.name}</h1>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 mr-1" />
                    <span className="text-yellow-400 font-semibold">{shop.rating}</span>
                  </div>
                  <span className="text-gray-400">
                    {Math.round(shop.distance * 100) / 100}km
                  </span>
                </div>
              </div>
            </div>

            <div className="text-gray-300 mb-4">
              <div className="flex items-start space-x-2 mb-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <span>{shop.address}</span>
              </div>
            </div>

            {/* Mobile-Responsive Bookmark Buttons - TASK-18-FIX */}
            <div className="flex flex-col gap-2 sm:flex-row sm:space-x-2 sm:gap-0 mb-6">
              <button
                onClick={onBookmarkToggle}
                className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                  isBookmarked ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                {isBookmarked ? 'ブックマーク済み' : 'ブックマーク'}
              </button>
              
              <button
                onClick={() => onStatusToggle('visited')}
                className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                  isVisited ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {isVisited ? '行った' : '行く'}
              </button>
              
              <button
                onClick={() => onStatusToggle('favorite')}
                className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                  isFavorite ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Heart className="h-4 w-4 mr-2" />
                {isFavorite ? 'お気に入り' : 'お気に入り'}
              </button>
            </div>

            {/* Store Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">営業時間</h3>
                <p className="text-gray-300">{shop.hours}</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">電話番号</h3>
                <p className="text-gray-300">{shop.phone}</p>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">混雑状況</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  shop.crowdedness === 'empty' ? 'bg-green-800 text-green-200' :
                  shop.crowdedness === 'normal' ? 'bg-yellow-800 text-yellow-200' :
                  shop.crowdedness === 'busy' ? 'bg-red-800 text-red-200' :
                  'bg-gray-800 text-gray-200'
                }`}>
                  {shop.crowdedness === 'empty' ? '空席あり' :
                   shop.crowdedness === 'normal' ? '普通' :
                   shop.crowdedness === 'busy' ? '混雑' : '不明'}
                </span>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">
                  価格帯
                </h3>
                <div className="flex">
                  {Array.from({ length: 4 }, (_, i) => (
                    <span
                      key={i}
                      className={`mr-1 ${
                        i < (shop.priceLevel || 1) ? 'text-green-400' : 'text-gray-600'
                      }`}
                    >
                      ¥
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Store Description */}
            {shop.description && (
              <div className="mb-6">
                <h3 className="font-semibold text-white mb-2">店舗情報</h3>
                <p className="text-gray-300">{shop.description}</p>
              </div>
            )}

            {/* Amenities/Features */}
            {shop.amenities && shop.amenities.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-white mb-2">設備・サービス</h3>
                <div className="flex flex-wrap gap-2">
                  {shop.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Menu/Popular Items */}
            {shop.menu && shop.menu.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-white mb-2">メニュー・人気商品</h3>
                <div className="space-y-2">
                  {shop.menu.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                      <span className="text-gray-300">{item.name}</span>
                      <span className="text-white font-semibold">¥{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Store Map */}
            <div className="mb-6">
              <h3 className="font-semibold text-white mb-4">地図</h3>
              <div className="rounded-lg overflow-hidden">
                <StoreMap
                  shop={shop}
                  className="w-full h-64"
                />
              </div>
            </div>

            {/* Reviews Section */}
            <div>
              <h3 className="font-semibold text-white mb-4">レビュー</h3>
              {shop.reviews && shop.reviews.length > 0 ? (
                <div className="space-y-4">
                  {(showAllReviews ? shop.reviews : shop.reviews.slice(0, 3)).map((review, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-300" />
                          </div>
                          <span className="text-gray-300 font-medium">{review.author}</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-yellow-400">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-gray-300">{review.text}</p>
                    </div>
                  ))}
                  
                  {shop.reviews.length > 3 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="w-full py-2 text-blue-400 hover:text-blue-300 text-center border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                    >
                      {showAllReviews ? 'レビューを閉じる' : `さらに${shop.reviews.length - 3}件のレビューを表示`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">レビューはまだありません。</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setIsPhotoModalOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={shop.photos[currentPhotoIndex]?.large || shop.photos[currentPhotoIndex]?.medium || ''}
              alt={`${shop.name} - ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            {shop.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                <button
                  onClick={() => setCurrentPhotoIndex(prev => 
                    prev === 0 ? shop.photos.length - 1 : prev - 1
                  )}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setCurrentPhotoIndex(prev => 
                    prev === shop.photos.length - 1 ? 0 : prev + 1
                  )}
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RamenShopDetail;