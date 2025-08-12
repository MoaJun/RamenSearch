import React, { useState, Suspense } from 'react';
import { RamenShop, UserPost } from '../types.ts';
import { ArrowLeft, Star, MapPin, Clock, Bookmark, Heart, CheckSquare, ExternalLink, Car, Navigation, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
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
  onAddPost,
  userPosts,
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
              className="w-full h-64 object-cover cursor-pointer"
              onClick={() => setIsPhotoModalOpen(true)}
            />
            
            {shop.photos.length > 1 && (
              <>
                {/* Navigation Arrows */}
                <button
                  onClick={() => setCurrentPhotoIndex(prev => 
                    prev === 0 ? shop.photos.length - 1 : prev - 1
                  )}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="前の写真"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPhotoIndex(prev => 
                    prev === shop.photos.length - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  aria-label="次の写真"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                {/* Photo Counter */}
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {currentPhotoIndex + 1} / {shop.photos.length}
                </div>
                
                {/* Indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
                  {shop.photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`写真 ${index + 1} に移動`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-2">{shop.name}</h1>
            
            <div className="flex items-center mb-4 flex-wrap gap-4">
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-1" fill="currentColor" />
                <span className="text-yellow-500 font-bold">{shop.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center text-gray-400">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{Math.round(shop.distance)}m</span>
              </div>
              {shop.isOpenNow ? (
                <span className="inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full bg-green-600 text-green-100">
                  営業中
                </span>
              ) : (
                <span className="inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full bg-gray-600 text-gray-100">
                  営業時間外
                </span>
              )}
            </div>

            <p className="text-gray-300 mb-4">{shop.address}</p>
            
            <div className="flex space-x-2 mb-6">
              <button
                onClick={onBookmarkToggle}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isBookmarked ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                {isBookmarked ? 'ブックマーク済み' : 'ブックマーク'}
              </button>
              
              <button
                onClick={() => onStatusToggle('visited')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isVisited ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {isVisited ? '行った' : '行く'}
              </button>
              
              <button
                onClick={() => onStatusToggle('favorite')}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  isFavorite ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Heart className="h-4 w-4 mr-2" />
                {isFavorite ? 'お気に入り' : 'お気に入り'}
              </button>
            </div>

            <div className="space-y-6">
              {/* Map Section */}
              <div>
                <h3 className="text-xl font-semibold mb-3">地図・アクセス</h3>
                <Suspense fallback={<div className="w-full h-64 bg-gray-800 rounded-lg flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>}>
                  <StoreMap shop={shop} apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''} />
                </Suspense>
                <div className="mt-3 text-sm text-gray-400 space-y-1">
                  <p className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {shop.address}
                  </p>
                  {shop.accessInfo && (
                    <p className="flex items-center">
                      <Navigation className="h-4 w-4 mr-2" />
                      {shop.accessInfo}
                    </p>
                  )}
                </div>
              </div>

              {/* Store Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">店舗情報</h3>
                  <div className="space-y-2 text-gray-300">
                    <BusinessHours hours={shop.hours} isOpenNow={shop.isOpenNow} />
                    {(shop.twitterUrl || shop.instagramUrl) && (
                      <div className="flex items-center">
                        <ExternalLink className="h-4 w-4 mr-2 text-gray-400" />
                        {shop.twitterUrl ? (
                          <a href={shop.twitterUrl} className="text-blue-400 hover:text-blue-300">
                            X (Twitter)
                          </a>
                        ) : (
                          <a href={shop.instagramUrl} className="text-blue-400 hover:text-blue-300">
                            Instagram
                          </a>
                        )}
                      </div>
                    )}
                    {shop.parkingInfo && (
                      <div className="flex items-center">
                        <Car className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{shop.parkingInfo}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-3">移動時間目安</h3>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-400 mb-2">現在地または検索地点から</p>
                    <div className="space-y-2 text-gray-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="mr-2">🚶</span>
                          <span>徒歩</span>
                        </div>
                        <span className="font-semibold">約{Math.ceil(shop.distance / 80)}分 ({Math.round(shop.distance)}m)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="mr-2">🚗</span>
                          <span>車</span>
                        </div>
                        <span className="font-semibold">約{Math.max(1, Math.ceil(shop.distance / 400))}分</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Ramen Photos Section */}
              {shop.photos && shop.photos.length > 1 && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">ラーメンの写真</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {shop.photos.slice(1, 7).map((photo, index) => (
                      <div key={index + 1} className="aspect-square overflow-hidden rounded-lg bg-gray-800">
                        <img 
                          src={photo.medium || photo.large || ''} 
                          alt={`${shop.name}のラーメン ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                          onClick={() => {
                            setCurrentPhotoIndex(index + 1);
                            setIsPhotoModalOpen(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {shop.photos.length > 7 && (
                    <p className="text-sm text-gray-400 mt-2 text-center">
                      他にも{shop.photos.length - 7}枚の写真があります
                    </p>
                  )}
                </div>
              )}
              
              
              {/* Reviews Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold">レビュー</h3>
                  <span className="text-sm text-gray-400">Googleレビュー {shop.reviews.length}件</span>
                </div>
                
                {/* AI Summary Section */}
                {shop.reviews && shop.reviews.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-3 text-blue-400">AI要約</h4>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <ReviewSummary placeId={shop.placeId} reviews={shop.reviews} />
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {(showAllReviews ? shop.reviews : shop.reviews.slice(0, 2)).map((review, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-500'}`} 
                                fill="currentColor" 
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-sm font-medium">{review.author}</span>
                        </div>
                        {review.relative_time_description && (
                          <span className="text-xs text-gray-400">{review.relative_time_description}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-line">{review.text}</p>
                    </div>
                  ))}
                  {shop.reviews.length > 2 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="w-full text-center text-blue-400 hover:text-blue-300 font-semibold text-sm flex items-center justify-center"
                    >
                      {showAllReviews ? 'レビューを閉じる' : `他のレビュー${shop.reviews.length - 2}件を表示`}
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAllReviews ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal
        isOpen={isPhotoModalOpen}
        photos={shop.photos}
        currentIndex={currentPhotoIndex}
        onClose={() => setIsPhotoModalOpen(false)}
        onPrevious={() => setCurrentPhotoIndex(prev => 
          prev === 0 ? shop.photos.length - 1 : prev - 1
        )}
        onNext={() => setCurrentPhotoIndex(prev => 
          prev === shop.photos.length - 1 ? 0 : prev + 1
        )}
        shopName={shop.name}
      />
    </div>
  );
};

export default RamenShopDetail;