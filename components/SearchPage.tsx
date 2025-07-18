import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RamenShop } from '../types.ts';
import RamenShopListItem from './RamenShopListItem.tsx';
import { Search, ArrowDownUp, MapPin, LocateFixed } from 'lucide-react';
import RamenShopListItemSkeleton from './RamenShopListItemSkeleton.tsx';
import { FixedSizeList as List } from 'react-window';

interface SearchPageProps {
  shops: RamenShop[];
  onShopSelect: (shop: RamenShop) => void;
}

type SortKey = 'distance' | 'rating';

const SOUP_TYPES = ['醤油', '豚骨', '家系', '味噌', '担々麺', '鶏白湯', '煮干', '昆布水', '貝出汁', '鴨出汁', '二郎'];

const SearchPage: React.FC<SearchPageProps> = ({ shops: initialShops, onShopSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [soupTypeFilter, setSoupTypeFilter] = useState<string>('');
  const [filterOpenNow, setFilterOpenNow] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isFiltering, setIsFiltering] = useState(true);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(null);

  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the list container
  const [listHeight, setListHeight] = useState(0); // State for dynamic height

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      // We only expect one entry for our container
      for (let entry of entries) {
        setListHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const filteredShops = useMemo(() => {
    setIsFiltering(true);
    const filtered = initialShops.filter(shop => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const keywordMatch = 
        lowercasedTerm === '' ||
        shop.name.toLowerCase().includes(lowercasedTerm) ||
        shop.address.toLowerCase().includes(lowercasedTerm) ||
        shop.keywords.some(k => k.toLowerCase().includes(lowercasedTerm));
      
      const soupMatch = soupTypeFilter === '' || shop.keywords.includes(soupTypeFilter);
      const openNowMatch = !filterOpenNow || shop.isOpenNow;

      return keywordMatch && soupMatch && openNowMatch;
    });

    const sorted = filtered.sort((a, b) => {
      if (sortKey === 'rating') return b.rating - a.rating;
      return a.distance - b.distance;
    });
    setIsFiltering(false);
    return sorted;
  }, [searchTerm, sortKey, soupTypeFilter, filterOpenNow, initialShops]);

  const handleCurrentLocationSearch = () => {
    // ... (implementation remains the same)
  };
  
  const handlePinClick = (placeId: string) => {
    const index = filteredShops.findIndex(shop => shop.placeId === placeId);
    if (index !== -1 && listRef.current) {
      listRef.current.scrollToItem(index, 'center');
      setHighlightedPlaceId(placeId);
      setTimeout(() => setHighlightedPlaceId(null), 2500);
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

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const shop = filteredShops[index];
    return (
      <div style={style}>
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
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-8">
      
      <div className="lg:col-span-7">
        {/* ... Controls Pane ... */}
      </div>

      <div className="mt-4 h-64 md:h-80 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden lg:col-span-5 lg:row-span-2 lg:col-start-8 lg:row-start-1 lg:mt-0 lg:sticky lg:top-[100px] lg:h-[calc(100vh-160px)] lg:max-h-[800px]">
        {/* ... Map Pane ... */}
      </div>
      
      <div className="mt-4 lg:col-span-7 lg:row-start-2">
          {/* ... Filter controls ... */}
          
          <p className="text-sm text-gray-400 mb-3">検索結果: {isFiltering ? '...' : `${filteredShops.length}件`}</p>

          <div ref={containerRef} className="h-[calc(100vh-300px)]"> {/* Attach ref here */}
            {isFiltering ? (
              Array.from({ length: 3 }).map((_, index) => <RamenShopListItemSkeleton key={index} />)
            ) : filteredShops.length > 0 && listHeight > 0 ? ( // Ensure listHeight is greater than 0
              <List
                ref={listRef}
                height={listHeight} // Use dynamic height
                itemCount={filteredShops.length}
                itemSize={150} // Approximate height of RamenShopListItem
                width="100%"
              >
                {Row}
              </List>
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
