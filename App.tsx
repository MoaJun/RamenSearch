import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { RamenShop, UserPost, Photo } from './types.ts';
import { Home, User, LoaderCircle } from 'lucide-react';
import RamenShopDetail from './components/RamenShopDetail.tsx';
import MyPage from './components/MyPage.tsx';
import SearchPage from './components/SearchPage.tsx';
import FeedbackButton from './components/FeedbackButton.tsx';
import FeedbackModal from './components/FeedbackModal.tsx';
import Toast from './components/Toast.tsx';
import { generateInitialRamenShops } from './services/geminiService.ts';

type View = 'search' | 'mypage';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('search');
  const [selectedShop, setSelectedShop] = useState<RamenShop | null>(null);
  const [ramenShops, setRamenShops] = useState<RamenShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User-specific data states
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [isUserDataLoading, setIsUserDataLoading] = useState(true);

  // Feedback feature states
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string, show: boolean }>({ message: '', show: false });

  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 3000);
  }, []);

  // Fetch initial ramen shops
  useEffect(() => {
    const fetchRamenShops = async () => {
      try {
        setIsLoading(true);
        const shops = await generateInitialRamenShops('東京'); 
        setRamenShops(shops);
      } catch (error) {
        console.error("Failed to fetch ramen shops:", error);
        showToast("ラーメン店の情報の取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRamenShops();
  }, [showToast]);

  // Load user data from API on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsUserDataLoading(true);
        const response = await fetch('/api/user-data');
        if (!response.ok) throw new Error('Failed to load user data');
        const data = await response.json();
        setBookmarks(new Set(data.bookmarks || []));
        setVisited(new Set(data.visited || []));
        setFavorites(new Set(data.favorites || []));
        setUserPosts(data.userPosts.map((post: any) => ({
          ...post,
          image: { small: post.imageUrl, medium: post.imageUrl, large: post.imageUrl, alt: 'User Post Image' } as Photo,
        })) || []);
      } catch (error) {
        console.error("Error loading user data:", error);
        showToast("ユーザーデータの読み込みに失敗しました。");
      } finally {
        setIsUserDataLoading(false);
      }
    };
    loadUserData();
  }, [showToast]);

  // Save user data to API whenever states change
  useEffect(() => {
    const saveUserData = async () => {
      const postsToSave = userPosts.map(post => ({
        ...post,
        imageUrl: post.image.small, // Save only the URL
        image: undefined, // Exclude the Photo object from direct serialization
      }));
      try {
        await fetch('/api/user-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookmarks: Array.from(bookmarks),
            visited: Array.from(visited),
            favorites: Array.from(favorites),
            userPosts: postsToSave,
          }),
        });
      } catch (error) {
        console.error("Error saving user data:", error);
        // showToast("ユーザーデータの保存に失敗しました。"); // Too frequent, might annoy user
      }
    };
    // Debounce saving to avoid too many requests
    const handler = setTimeout(() => {
      saveUserData();
    }, 500);
    return () => clearTimeout(handler);
  }, [bookmarks, visited, favorites, userPosts]);

  const handleOptimisticUpdate = async (
    currentState: Set<string>,
    stateSetter: React.Dispatch<React.SetStateAction<Set<string>>>,
    placeId: string
  ) => {
    const originalState = new Set(currentState);
    stateSetter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) { newSet.delete(placeId); } 
      else { newSet.add(placeId); }
      return newSet;
    });
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      showToast("更新しました！");
    } catch (error) {
      console.error('Optimistic update failed, rolling back:', error);
      stateSetter(originalState);
      showToast('更新に失敗しました。再度お試しください。');
    }
  };

  const toggleBookmark = (placeId: string) => handleOptimisticUpdate(bookmarks, setBookmarks, placeId);
  const toggleStatus = (placeId: string, status: 'visited' | 'favorite') => {
    if (status === 'visited') handleOptimisticUpdate(visited, setVisited, placeId);
    else handleOptimisticUpdate(favorites, setFavorites, placeId);
  };
  
  const addPost = (post: UserPost) => setUserPosts(prev => [post, ...prev]);
  
  const handleFeedbackSubmit = (feedbackData: { type: string; details: string; screenshot?: string }) => {
    console.log("--- Feedback Submitted ---", feedbackData);
    showToast("ご意見ありがとうございます！");
  };

  const bookmarkedShops = useMemo(() => ramenShops.filter(shop => bookmarks.has(shop.placeId)), [bookmarks, ramenShops]);
  const visitedShops = useMemo(() => ramenShops.filter(shop => visited.has(shop.placeId)), [visited, ramenShops]);
  const favoriteShops = useMemo(() => ramenShops.filter(shop => favorites.has(shop.placeId)), [favorites, ramenShops]);

  const renderContent = () => {
    if (isLoading || isUserDataLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <LoaderCircle role="img" aria-label="Loading" className="animate-spin h-12 w-12 text-red-500" />
        </div>
      );
    }

    if (selectedShop) {
      return (
        <RamenShopDetail
          shop={selectedShop}
          onBack={() => setSelectedShop(null)}
          isBookmarked={bookmarks.has(selectedShop.placeId)}
          isVisited={visited.has(selectedShop.placeId)}
          isFavorite={favorites.has(selectedShop.placeId)}
          onBookmarkToggle={() => toggleBookmark(selectedShop.placeId)}
          onStatusToggle={(status) => toggleStatus(selectedShop.placeId, status)}
          onAddPost={addPost}
          userPosts={userPosts.filter(p => p.placeId === selectedShop.placeId)}
          showToast={showToast}
        />
      );
    }

    switch (currentView) {
      case 'search':
        return <SearchPage shops={ramenShops} onShopSelect={setSelectedShop} />;
      case 'mypage':
        return <MyPage 
                  bookmarkedShops={bookmarkedShops}
                  visitedShops={visitedShops}
                  favoriteShops={favoriteShops}
                  userPosts={userPosts}
                  onShopSelect={setSelectedShop}
               />;
      default:
        return <SearchPage shops={ramenShops} onShopSelect={setSelectedShop} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-200">
      <header className="bg-gray-900 border-b border-gray-800 text-white shadow-md sticky top-0 z-30">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
        showToast={showToast}
      />
      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}