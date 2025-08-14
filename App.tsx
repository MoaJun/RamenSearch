
import React, { useState, useMemo, useRef, Suspense, useCallback } from 'react';
import { RamenShop, UserPost } from './types.ts';
import { MOCK_RAMEN_SHOPS } from './constants.ts';
import { Home, User } from 'lucide-react';
import FeedbackButton from './components/FeedbackButton.tsx';
import FeedbackModal from './components/FeedbackModal.tsx';
import Toast from './components/Toast.tsx';

// Lazy load heavy components for better initial load performance
const RamenShopDetail = React.lazy(() => import('./components/RamenShopDetail.tsx'));
const MyPage = React.lazy(() => import('./components/MyPage.tsx'));
const SearchPage = React.lazy(() => import('./components/SearchPage.tsx'));


type View = 'search' | 'mypage';
type SortKey = 'distance' | 'rating';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('search');
  const [selectedShop, setSelectedShop] = useState<RamenShop | null>(null);
  
  // Search state - moved from SearchPage to persist across navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [soupTypeFilter, setSoupTypeFilter] = useState<string>('');
  const [filterOpenNow, setFilterOpenNow] = useState<boolean>(false);
  const [shops, setShops] = useState<RamenShop[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(null);
  const userLocation = useRef<google.maps.LatLngLiteral | null>(null);

  // User-specific data states
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);

  // Feedback feature states
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, show: boolean }>({ message: '', show: false });


  // Optimistic UI Handler
  const handleOptimisticUpdate = async (
    currentState: Set<string>,
    stateSetter: React.Dispatch<React.SetStateAction<Set<string>>>,
    placeId: string
  ) => {
    // 1. Get the original state for potential rollback
    const originalState = new Set(currentState);

    // 2. Immediately update the UI (Optimistic update)
    stateSetter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });

    // 3. Simulate async operation (e.g., API call)
    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          // Simulate a 20% chance of failure
          if (Math.random() > 0.8) {
            reject(new Error("Simulated network error"));
          } else {
            resolve();
          }
        }, 500); // 0.5 second delay
      });
      // If successful, do nothing. The UI is already correct.
      console.log('Update successful for', placeId);
    } catch (error) {
      // 4. If it fails, roll back the UI and alert the user
      console.error('Optimistic update failed, rolling back:', error);
      stateSetter(originalState);
      alert('更新に失敗しました。少し時間をおいて再度お試しください。');
    }
  };


  const toggleBookmark = useCallback((placeId: string) => {
    handleOptimisticUpdate(bookmarks, setBookmarks, placeId);
  }, [bookmarks]);

  const toggleStatus = useCallback((placeId: string, status: 'visited' | 'favorite') => {
    if (status === 'visited') {
      handleOptimisticUpdate(visited, setVisited, placeId);
    } else {
      handleOptimisticUpdate(favorites, setFavorites, placeId);
    }
  }, [visited, favorites]);
  
  const addPost = useCallback((post: UserPost) => {
    setUserPosts(prev => [post, ...prev]);
  }, []);
  
  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast({ message: '', show: false });
    }, 3000);
  };

  const handleFeedbackSubmit = (feedbackData: { type: string; details: string; screenshot?: string }) => {
    console.log("--- Feedback Submitted ---");
    console.log("Type:", feedbackData.type);
    console.log("Details:", feedbackData.details);
    console.log("Screenshot (Base64):", feedbackData.screenshot ? `${feedbackData.screenshot.substring(0, 50)}...` : "Not provided");
    console.log("--------------------------");
    showToast("ご意見ありがとうございます！");
  };

  
  // Optimize filtering by using a Map for faster lookups and memoizing efficiently
  const shopsByPlaceId = useMemo(() => {
    const map = new Map();
    MOCK_RAMEN_SHOPS.forEach(shop => map.set(shop.placeId, shop));
    return map;
  }, []);

  const bookmarkedShops = useMemo(() => {
    return Array.from(bookmarks).map(placeId => shopsByPlaceId.get(placeId)).filter(Boolean);
  }, [bookmarks, shopsByPlaceId]);
  
  const visitedShops = useMemo(() => {
    return Array.from(visited).map(placeId => shopsByPlaceId.get(placeId)).filter(Boolean);
  }, [visited, shopsByPlaceId]);
  
  // Favorite shops are now managed by favoritesService in MyPage
  // const favoriteShops = useMemo(() => {
  //   return Array.from(favorites).map(placeId => shopsByPlaceId.get(placeId)).filter(Boolean);
  // }, [favorites, shopsByPlaceId]);

  // Move useMemo outside of renderContent to fix hooks rule violation
  const filteredUserPosts = useMemo(() => {
    return selectedShop ? userPosts.filter(p => p.placeId === selectedShop.placeId) : [];
  }, [userPosts, selectedShop?.placeId]);


  const renderContent = () => {
    if (selectedShop) {
      return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>}>
          <RamenShopDetail
            shop={selectedShop}
            onBack={() => setSelectedShop(null)}
            isBookmarked={bookmarks.has(selectedShop.placeId)}
            isVisited={visited.has(selectedShop.placeId)}
            isFavorite={favorites.has(selectedShop.placeId)}
            onBookmarkToggle={() => toggleBookmark(selectedShop.placeId)}
            onStatusToggle={(status) => toggleStatus(selectedShop.placeId, status)}
            onAddPost={addPost}
            userPosts={filteredUserPosts}
          />
        </Suspense>
      );
    }

    switch (currentView) {
      case 'search':
        return (
          <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>}>
            <SearchPage 
              onShopSelect={setSelectedShop}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              sortKey={sortKey}
              setSortKey={setSortKey}
              soupTypeFilter={soupTypeFilter}
              setSoupTypeFilter={setSoupTypeFilter}
              filterOpenNow={filterOpenNow}
              setFilterOpenNow={setFilterOpenNow}
              shops={shops}
              setShops={setShops}
              isLocating={isLocating}
              setIsLocating={setIsLocating}
              isFiltering={isFiltering}
              setIsFiltering={setIsFiltering}
              userLocation={userLocation}
              hoveredPlaceId={hoveredPlaceId}
              setHoveredPlaceId={setHoveredPlaceId}
              highlightedPlaceId={highlightedPlaceId}
              setHighlightedPlaceId={setHighlightedPlaceId}
            />
          </Suspense>
        );
      case 'mypage':
        return (
          <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>}>
            <MyPage 
              bookmarkedShops={bookmarkedShops}
              visitedShops={visitedShops}
              userPosts={userPosts}
              onShopSelect={setSelectedShop}
            />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>}>
            <SearchPage 
              onShopSelect={setSelectedShop}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              sortKey={sortKey}
              setSortKey={setSortKey}
              soupTypeFilter={soupTypeFilter}
              setSoupTypeFilter={setSoupTypeFilter}
              filterOpenNow={filterOpenNow}
              setFilterOpenNow={setFilterOpenNow}
              shops={shops}
              setShops={setShops}
              isLocating={isLocating}
              setIsLocating={setIsLocating}
              isFiltering={isFiltering}
              setIsFiltering={setIsFiltering}
              userLocation={userLocation}
              hoveredPlaceId={hoveredPlaceId}
              setHoveredPlaceId={setHoveredPlaceId}
              highlightedPlaceId={highlightedPlaceId}
              setHighlightedPlaceId={setHighlightedPlaceId}
            />
          </Suspense>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-200">
      <header className="bg-gray-900 border-b border-gray-800 text-white shadow-md sticky top-0 z-30">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setCurrentView('search'); setSelectedShop(null); }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-500">
                    <path d="M4 21V19C4 17.8954 4.89543 17 6 17H10C11.1046 17 12 17.8954 12 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 21V19C12 17.8954 12.8954 17 14 17H18C19.1046 17 20 17.8954 20 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 17V11C7 8.23858 9.23858 6 12 6C14.7614 6 17 8.23858 17 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 6V3M12 3L10 4M12 3L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h1 className="text-2xl font-bold tracking-wider">Ramen Compass</h1>
            </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto">
        {renderContent()}
      </main>

      {!selectedShop && (
         <footer className="sticky bottom-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-800 shadow-t-lg z-20">
          <div className="container mx-auto max-w-7xl flex justify-around">
            <button
              onClick={() => { setCurrentView('search'); setSelectedShop(null); }}
              className={`flex flex-col items-center justify-center w-full py-2 text-sm font-medium transition-colors ${currentView === 'search' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            >
              <Home className="h-6 w-6 mb-0.5" />
              検索
            </button>
            <button
              onClick={() => { setCurrentView('mypage'); setSelectedShop(null); }}
              className={`flex flex-col items-center justify-center w-full py-2 text-sm font-medium transition-colors ${currentView === 'mypage' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
            >
              <User className="h-6 w-6 mb-0.5" />
              マイページ
            </button>
          </div>
         </footer>
      )}

      <FeedbackButton onOpen={() => setIsFeedbackModalOpen(true)} />
      <FeedbackModal 
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />
      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}
