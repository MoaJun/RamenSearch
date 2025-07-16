
import React, { useState, useEffect, useRef } from 'react';
import { RamenShop } from '../types.ts';
import { MOCK_RAMEN_SHOPS } from '../constants.ts';
import RamenShopListItem from './RamenShopListItem.tsx';
import { ArrowDownUp, MapPin, LocateFixed } from 'lucide-react';
import RamenShopListItemSkeleton from './RamenShopListItemSkeleton.tsx';

interface SearchPageProps {
  onShopSelect: (shop: RamenShop) => void;
}

type SortKey = 'distance' | 'rating';

// スープの種類をユーザー指定の順序で定義
const SOUP_TYPES = ['醤油', '豚骨', '家系', '味噌', '担々麺', '鶏白湯', '煮干', '昆布水', '貝出汁', '鴨出汁', '二郎'];

const SearchPage: React.FC<SearchPageProps> = ({ onShopSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [soupTypeFilter, setSoupTypeFilter] = useState<string>('');
  const [filterOpenNow, setFilterOpenNow] = useState<boolean>(false);
  const [shops, setShops] = useState<RamenShop[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isFiltering, setIsFiltering] = useState(true);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(null);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});


  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      const filtered = MOCK_RAMEN_SHOPS
        .filter(shop => {
            const lowercasedTerm = searchTerm.toLowerCase();
            const isCurrentLocationSearch = lowercasedTerm === '現在地周辺' && shop.distance <= 500;

            const keywordMatch = 
              (lowercasedTerm === '' && shop.distance <= 500) || // Default to nearby on empty search
              isCurrentLocationSearch ||
              shop.name.toLowerCase().includes(lowercasedTerm) ||
              shop.address.toLowerCase().includes(lowercasedTerm) ||
              shop.keywords.some(k => k.toLowerCase().includes(lowercasedTerm));
            
            const soupMatch = soupTypeFilter === '' || shop.keywords.includes(soupTypeFilter);
            
            const openNowMatch = !filterOpenNow || shop.isOpenNow;

            return keywordMatch && soupMatch && openNowMatch;
        });

      const sorted = filtered.sort((a, b) => {
          if (sortKey === 'rating') {
              return b.rating - a.rating;
          }
          return a.distance - b.distance;
      });
      
      setShops(sorted);
      setIsFiltering(false);
    }, 300); // Debounce filtering

    return () => clearTimeout(timer);
  }, [searchTerm, sortKey, soupTypeFilter, filterOpenNow]);

  const handleCurrentLocationSearch = () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報機能に対応していません。');
      return;
    }
    setIsLocating(true);
    setSearchTerm('現在地周辺');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location retrieved:', position.coords);
        // In a real app, you'd fetch from an API with coords.
        // Here, we simulate by just triggering the useEffect with the new search term.
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation Error:', error);
        alert('現在地の取得に失敗しました。ブラウザの位置情報サービスを許可してください。');
        setIsLocating(false);
      }
    );
  };
  
  const handlePinClick = (placeId: string) => {
    const itemEl = itemRefs.current[placeId];
    if (itemEl) {
        itemEl.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
        setHighlightedPlaceId(placeId);
        setTimeout(() => {
            setHighlightedPlaceId(null);
        }, 2500); // Highlight for 2.5 seconds
    }
  };


  const getPinPosition = (placeId: string) => {
    let hash = 0;
    for (let i = 0; i < placeId.length; i++) {
        const char = placeId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const top = (Math.abs(hash) % 70) + 15;
    const left = (Math.abs(hash * 31) % 80) + 10;
    return { top: `${top}%`, left: `${left}%` };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-8">
      
      {/* --- Controls Pane --- */}
      <div className="lg:col-span-7">
        <div className="bg-gray-900 p-4 rounded-lg shadow-md z-10">
          <button
            onClick={handleCurrentLocationSearch}
            disabled={isLocating}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            <LocateFixed className={`h-5 w-5 mr-2 ${isLocating ? 'animate-spin' : ''}`} />
            {isLocating ? '現在地を検索中...' : '現在地で周囲を検索'}
          </button>
           <div className="relative mb-3">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5 pointer-events-none" />
              <input
                  id="location-search"
                  type="text"
                  placeholder="駅名・住所・郵便番号"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-red-500 transition bg-gray-800 text-white"
              />
          </div>
          <button className="w-full bg-gray-700 text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-600 transition shadow-md border border-gray-600">
              このエリアで検索
          </button>
        </div>
      </div>


      {/* --- Map Pane --- */}
      <div className="mt-4 h-64 md:h-80 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden lg:col-span-5 lg:row-span-2 lg:col-start-8 lg:row-start-1 lg:mt-0 lg:sticky lg:top-[100px] lg:h-[calc(100vh-160px)] lg:max-h-[800px]">
        <img src="https://picsum.photos/seed/ramenmap/1200/1200" alt="Map of the area" className="w-full h-full object-cover opacity-75" loading="lazy"/>
        {shops.map((shop, index) => (
          <div
            key={shop.placeId}
            className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group"
            style={getPinPosition(shop.placeId)}
            onClick={() => handlePinClick(shop.placeId)}
            onMouseEnter={() => setHoveredPlaceId(shop.placeId)}
            onMouseLeave={() => setHoveredPlaceId(null)}
            title={shop.name}
          >
            <MapPin className={`w-10 h-10 text-red-500 drop-shadow-lg transition-transform duration-200 ease-in-out ${hoveredPlaceId === shop.placeId ? 'scale-125' : 'group-hover:scale-110'}`} fill="currentColor"/>
            <span className="absolute top-[13px] left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-xs">{index + 1}</span>
          </div>
        ))}
      </div>
      
      {/* --- Results Pane --- */}
      <div className="mt-4 lg:col-span-7 lg:row-start-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex flex-wrap gap-4 items-center">
                  <label htmlFor="soup-type" className="sr-only">スープの種類</label>
                  <select
                      id="soup-type"
                      value={soupTypeFilter}
                      onChange={e => setSoupTypeFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-700 rounded-md focus:ring-2 focus:ring-red-500 bg-gray-800 text-white transition shadow-sm"
                  >
                      <option value="">全てのスープ</option>
                      {SOUP_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-200">
                    <input 
                      type="checkbox"
                      checked={filterOpenNow}
                      onChange={() => setFilterOpenNow(!filterOpenNow)}
                      className="form-checkbox h-4 w-4 rounded text-red-600 focus:ring-red-500 border-gray-600 bg-gray-700"
                    />
                    <span>営業中のみ表示</span>
                  </label>
              </div>
              <button
                  onClick={() => setSortKey(prev => prev === 'distance' ? 'rating' : 'distance')}
                  className="flex items-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-200 hover:bg-gray-700 transition shadow-sm"
              >
                  <ArrowDownUp className="h-4 w-4 mr-1.5" />
                  {sortKey === 'distance' ? '距離が近い順' : '評価が高い順'}
              </button>
          </div>
          
          <p className="text-sm text-gray-400 mb-3">検索結果: {isFiltering ? '...' : `${shops.length}件`}</p>

          <div className="space-y-4">
            {isFiltering ? (
              Array.from({ length: 3 }).map((_, index) => (
                  <RamenShopListItemSkeleton key={index} />
              ))
            ) : shops.length > 0 ? (
              shops.map((shop, index) => (
                <div 
                  key={shop.placeId} 
                  ref={el => { itemRefs.current[shop.placeId] = el; }} 
                  className="animate-slide-in-bottom" 
                  style={{ animationDelay: `${index * 70}ms`}}>
                  <RamenShopListItem 
                    shop={shop} 
                    index={index + 1} 
                    onSelect={() => onShopSelect(shop)}
                    isHovered={hoveredPlaceId === shop.placeId}
                    isHighlighted={highlightedPlaceId === shop.placeId}
                    onMouseEnter={() => setHoveredPlaceId(shop.placeId)}
                    onMouseLeave={() => setHoveredPlaceId(null)}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-900 rounded-lg shadow-md">
                <p className="text-gray-400">条件に合うラーメン屋が見つかりませんでした。</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

export default SearchPage;
