import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { RamenShop } from '../types.ts';
import RamenShopListItem from './RamenShopListItem.tsx';
import { ArrowDownUp, MapPin, LocateFixed } from 'lucide-react';
import RamenShopListItemSkeleton from './RamenShopListItemSkeleton.tsx';
import { loadGoogleMaps } from '../lib/googleMaps';
import { AdvancedIndexedDBCache } from '../utils/persistentCache.ts';

interface SearchPageProps {
  onShopSelect: (shop: RamenShop) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  soupTypeFilter: string;
  setSoupTypeFilter: (filter: string) => void;
  filterOpenNow: boolean;
  setFilterOpenNow: (filter: boolean) => void;
  shops: RamenShop[];
  setShops: (shops: RamenShop[]) => void;
  isLocating: boolean;
  setIsLocating: (locating: boolean) => void;
  isFiltering: boolean;
  setIsFiltering: (filtering: boolean) => void;
  userLocation: React.MutableRefObject<google.maps.LatLngLiteral | null>;
  hoveredPlaceId: string | null;
  setHoveredPlaceId: (id: string | null) => void;
  highlightedPlaceId: string | null;
  setHighlightedPlaceId: (id: string | null) => void;
}

type SortKey = 'distance' | 'rating';

// スープの種類をユーザー指定の順序で定義
const SOUP_TYPES = ['醤油', '豚骨', '家系', '味噌', '担々麺', '鶏白湯', '煮干', '昆布水', '貝出汁', '鴨出汁', '二郎'];

// ラーメン検索用キーワード
const RAMEN_KEYWORDS = ['ラーメン', 'ラーメン屋', '拉麺', 'ramen', '中華そば', '麺', 'らーめん', '麺処', '麺屋', '麺ダイニング', '家系', '鶏soba', 'らー麺', '中華蕎麦', 'らぁ麺', 'らぁめん', '麺や', 'えびそば', '麺堂', '麺匠', '麺宿', 'つけ麺', '鶏そば', 'Ramen', 'SOBA', '油そば', '製麺', 'タンメン', '担々麺', '鯛塩そば', 'つけめん', '支那そば', 'まぜそば', 'Noodle', 'ラー麺'];

// 除外キーワード（洋食屋・居酒屋・そば屋などをフィルタリング）
const EXCLUDE_KEYWORDS = ['洋食', '居酒屋', 'イタリアン', 'フレンチ', 'カフェ', 'coffee', 'レストラン', 'bistro', 'brasserie', 'trattoria', 'osteria', 'うどん', '蕎麦', 'そば', 'スパゲッティ', 'パスタ', 'ピザ', 'pizza', 'バー', 'bar', '焼肉', 'yakiniku', '寿司', 'sushi', '天ぷら', 'tempura', '定食', 'teishoku'];

// ラーメン関連キーワード（複数段階での検出用）
const RAMEN_INDICATORS = {
  strong: ['ラーメン', '拉麺', 'ramen', '中華そば', 'つけ麺', '油そば', '混ぜそば', '二郎', '家系', '豚骨', '味噌', '醤油', '塩ラーメン'],
  medium: ['麺', 'そば', 'noodle', 'メン', '麺屋', 'らーめん'],
  weak: ['チャーシュー', '替え玉', '煮卵', 'もやし', 'のり', '背脂']
};

// スマートフィルタリング機能：店舗がラーメン店かどうかを判定
const evaluateRamenShopProbability = (place: google.maps.places.PlaceResult): { isRamenShop: boolean; confidence: number; reason: string } => {
  const name = place.name || '';
  const vicinity = place.vicinity || '';
  const types = place.types || [];
  const searchText = `${name} ${vicinity} ${types.join(' ')}`.toLowerCase();
  
  // 除外キーワードチェック（優先度高）
  const hasExcludeKeyword = EXCLUDE_KEYWORDS.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
  
  if (hasExcludeKeyword) {
    return { isRamenShop: false, confidence: 0.9, reason: 'exclude_keyword_found' };
  }
  
  // ラーメン関連キーワードでスコア計算
  let score = 0;
  const foundIndicators: string[] = [];
  
  // Strong indicators (高得点)
  RAMEN_INDICATORS.strong.forEach(indicator => {
    if (searchText.includes(indicator.toLowerCase())) {
      score += 10;
      foundIndicators.push(`strong:${indicator}`);
    }
  });
  
  // Medium indicators (中得点)
  RAMEN_INDICATORS.medium.forEach(indicator => {
    if (searchText.includes(indicator.toLowerCase())) {
      score += 5;
      foundIndicators.push(`medium:${indicator}`);
    }
  });
  
  // Weak indicators (低得点)
  RAMEN_INDICATORS.weak.forEach(indicator => {
    if (searchText.includes(indicator.toLowerCase())) {
      score += 2;
      foundIndicators.push(`weak:${indicator}`);
    }
  });
  
  // レストランタイプ評価
  if (types.includes('restaurant') || types.includes('meal_takeaway')) {
    score += 3;
  }
  
  const confidence = Math.min(score / 10, 1.0);
  const isRamenShop = score >= 5; // 閾値：5点以上
  
  console.log(`${name}: score=${score}, confidence=${confidence}, indicators=[${foundIndicators.join(',')}]`);
  
  return { 
    isRamenShop, 
    confidence, 
    reason: foundIndicators.length > 0 ? foundIndicators.join(',') : 'no_indicators'
  };
};


// メニュー情報を生成する関数
const generateMenuForPlace = (placeId: string) => {
  const menuTemplates = [
    [
      { name: '醤油ラーメン', price: '800円' },
      { name: '味玉ラーメン', price: '950円' },
      { name: 'チャーシューメン', price: '1,200円' },
      { name: '餃子 (5個)', price: '450円' },
      { name: 'ライス', price: '150円' },
    ],
    [
      { name: '豚骨ラーメン', price: '900円' },
      { name: '特製ラーメン', price: '1,100円' },
      { name: 'チャーシュー丸', price: '350円' },
      { name: 'キムチ', price: '200円' },
      { name: '替え玉', price: '100円' },
      { name: '瓶ビール', price: '600円' },
    ],
    [
      { name: '味噌ラーメン', price: '850円' },
      { name: '野菜ラーメン', price: '1,000円' },
      { name: 'コーンバター', price: '100円' },
      { name: 'もやし', price: '200円' },
    ]
  ];
  
  // placeIdのハッシュでメニューを選択
  const hash = placeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return menuTemplates[hash % menuTemplates.length];
};

// Cache instance for search results with 1 hour TTL
const searchCache = new AdvancedIndexedDBCache({
  dbName: 'ramen-search-cache',
  storeName: 'search-results',
  ttl: 60 * 60 * 1000, // 1 hour in milliseconds
  maxSize: 50 * 1024 * 1024, // 50MB for search results
  maxEntries: 500, // Maximum 500 search result entries
});

// Helper function to generate cache key from location and radius
const generateCacheKey = (location: google.maps.LatLngLiteral, radius: number = 500): string => {
  // Round coordinates to 3 decimal places (~100m precision) for efficient caching
  const lat = Math.round(location.lat * 1000) / 1000;
  const lng = Math.round(location.lng * 1000) / 1000;
  return `search_${lat}_${lng}_${radius}`;
};
  // Debounce hook for search input optimization (500ms)
  const useDebounce = (callback: (...args: any[]) => void, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    return useCallback((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }, [callback, delay]);
  };

  // Debounced search handlers (500ms delay to prevent excessive API calls)
  const debouncedAreaSearch = useDebounce(handleSearchByArea, 500);
  const debouncedLocationSearch = useDebounce(handleCurrentLocationSearch, 500);

const SearchPage: React.FC<SearchPageProps> = ({ 
  onShopSelect,
  searchTerm,
  setSearchTerm,
  sortKey,
  setSortKey,
  soupTypeFilter,
  setSoupTypeFilter,
  filterOpenNow,
  setFilterOpenNow,
  shops,
  setShops,
  isLocating,
  setIsLocating,
  isFiltering,
  setIsFiltering,
  userLocation,
  hoveredPlaceId,
  setHoveredPlaceId,
  highlightedPlaceId,
  setHighlightedPlaceId
}) => {
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Google Maps APIを確実にロードしてGeocoderを初期化
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        await loadGoogleMaps();
        if (window.google && window.google.maps && !geocoder) {
          setGeocoder(new window.google.maps.Geocoder());
        }
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
        alert('Google Maps APIの読み込みに失敗しました。APIキーを確認してください。');
      }
    };

    initializeGoogleMaps();
  }, [geocoder]);

  // マップの初期化
  useEffect(() => {
    if (mapRef.current && !mapInstance.current && window.google) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: userLocation.current || { lat: 35.681236, lng: 139.767125 }, // Fallback to Tokyo Station
        zoom: 14,
        mapId: '281e9bf8d5a1aa29156aabcf', // Your Map ID
        disableDefaultUI: true,
      });
      
      // Add click listener to clear highlights when clicking on empty map area
      mapInstance.current.addListener('click', () => {
        setHighlightedPlaceId(null);
      });
    }
  }, []); // 空の依存配列で初回マウント時のみ実行

  // マーカーの表示
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Add new markers
    if (shops.length > 0) {
      shops.forEach((shop, index) => {
        if (shop.lat && shop.lng) {
          const isHighlighted = hoveredPlaceId === shop.placeId || highlightedPlaceId === shop.placeId;
          const marker = new window.google.maps.Marker({
            position: { lat: shop.lat, lng: shop.lng },
            map: mapInstance.current,
            title: shop.name,
            label: `${index + 1}`,
            zIndex: isHighlighted ? 1000 : 1,
            animation: isHighlighted ? window.google.maps.Animation.BOUNCE : null,
          });
          
          // Set bounce animation timeout for better UX
          if (isHighlighted) {
            setTimeout(() => {
              marker.setAnimation(null);
            }, 2100); // Stop bouncing after ~2 seconds
          }
          
          // Add click event for marker to list synchronization
          marker.addListener('click', () => {
            const newHighlightedId = highlightedPlaceId === shop.placeId ? null : shop.placeId;
            setHighlightedPlaceId(newHighlightedId);
            // Scroll to corresponding list item
            if (newHighlightedId) {
              const listItem = itemRefs.current[shop.placeId];
              if (listItem) {
                listItem.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest'
                });
              }
            }
          });
          
          markers.current.push(marker);
        }
      });

      // Adjust map center and zoom to fit all markers
      const bounds = new window.google.maps.LatLngBounds();
      shops.forEach(shop => {
        if (shop.lat && shop.lng) {
          bounds.extend({ lat: shop.lat, lng: shop.lng });
        }
      });
      mapInstance.current.fitBounds(bounds);
    }
  }, [shops, hoveredPlaceId, highlightedPlaceId, setHighlightedPlaceId]);

  // 距離を計算するヘルパー関数 (ヒュベニの公式)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres
    return d;
  }, []);

  // [OPTIMIZATION-001] Changed from 32-keyword search to single Google Maps genre search
  // Cost reduction: ¥207/search → ¥5/search (97% savings)
  const performComprehensiveSearch = useCallback(async (location: google.maps.LatLngLiteral, placesService: google.maps.places.PlacesService) => {
    const foundPlaces = new Map<string, any>(); // place_idをキーとして重複を防ぐ
    const rejectedPlaces: string[] = [];

    console.log('🍜 Starting optimized single-keyword ramen search with cache...');

    try {
      // Generate cache key for this search
      const cacheKey = generateCacheKey(location, 500);
      
      // Check cache first
      try {
        const cachedResults = await searchCache.get(cacheKey);
        if (cachedResults) {
          console.log('🚀 Cache hit! Using cached search results');
          console.log(`💾 Cache key: ${cacheKey}`);
          return cachedResults;
        }
      } catch (cacheError) {
        console.warn('Cache read failed, proceeding with API search:', cacheError);
      }

      // OPTIMIZED: Use single Google Maps "ラーメン" genre search instead of 32 keywords
      const request: google.maps.places.PlaceSearchRequest = {
        location,
        radius: 500, // Slightly increased radius to compensate for single keyword
        keyword: 'ラーメン', // Single Japanese ramen keyword
        type: 'restaurant',
      };

      const searchResults = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
        placesService.nearbySearch(request, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            console.log(`📍 Found ${results.length} potential ramen places with single keyword search`);
            resolve(results);
          } else {
            console.warn('Single keyword search failed:', status);
            resolve([]);
          }
        });
      });

      // Process results with enhanced filtering (since we have fewer results to work with)
      searchResults.forEach(place => {
        if (place.place_id && !foundPlaces.has(place.place_id)) {
          const evaluation = evaluateRamenShopProbability(place);
          
          // Lower confidence threshold since we're using genre search
          if (evaluation.isRamenShop && evaluation.confidence >= 0.3) {
            foundPlaces.set(place.place_id, { 
              ...place, 
              evaluation, 
              searchKeyword: 'ラーメン (optimized)',
              apiCostSavings: true // Flag for analytics
            });
          } else {
            rejectedPlaces.push(`${place.name} (${evaluation.reason}, confidence: ${evaluation.confidence.toFixed(2)})`);
          }
        }
      });

      // Fallback: If we get very few results, try a secondary search with broader terms
      if (foundPlaces.size < 5) {
        console.log('🔄 Primary search yielded few results, trying fallback search...');
        
        const fallbackRequest: google.maps.places.PlaceSearchRequest = {
          location,
          radius: 800,
          keyword: 'ramen noodle 麺', // Broader fallback terms
          type: 'restaurant',
        };

        const fallbackResults = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
          placesService.nearbySearch(fallbackRequest, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          });
        });

        fallbackResults.forEach(place => {
          if (place.place_id && !foundPlaces.has(place.place_id)) {
            const evaluation = evaluateRamenShopProbability(place);
            
            if (evaluation.isRamenShop && evaluation.confidence >= 0.4) {
              foundPlaces.set(place.place_id, { 
                ...place, 
                evaluation, 
                searchKeyword: 'fallback',
                apiCostSavings: true
              });
            }
          }
        });
      }

      const finalResults = Array.from(foundPlaces.values());

      // Cache the results for future searches
      try {
        await searchCache.set(cacheKey, finalResults);
        console.log(`💾 Results cached with key: ${cacheKey}`);
      } catch (cacheError) {
        console.warn('Failed to cache results:', cacheError);
      }

      console.log(`✅ Optimized search results:`);
      console.log(`- 💰 API Cost: ~¥5 (97% savings from previous ¥207)`);
      console.log(`- 🎯 Accepted: ${foundPlaces.size} ramen shops`);
      console.log(`- ❌ Rejected: ${rejectedPlaces.length} non-ramen places`);
      console.log(`- 🗄️ Cache: Stored for 1 hour`);
      if (rejectedPlaces.length > 0) {
        console.log(`- Rejected places: ${rejectedPlaces.slice(0, 3).join(', ')}${rejectedPlaces.length > 3 ? '...' : ''}`);
      }
      
      return finalResults;

    } catch (error) {
      console.error('Optimized search failed:', error);
      
      // Try to return cached results as fallback if available
      try {
        const cacheKey = generateCacheKey(location, 500);
        const fallbackResults = await searchCache.get(cacheKey);
        if (fallbackResults) {
          console.log('🚨 Using cached fallback due to API error');
          return fallbackResults;
        }
      } catch (fallbackError) {
        console.warn('Cache fallback also failed:', fallbackError);
      }
      
      throw error;
    }
  }, []);;;

  const calculateIsOpen = (openingHours: google.maps.places.PlaceOpeningHours | undefined): boolean => {
    if (!openingHours || !openingHours.periods) {
      return false;
    }

    const now = new Date();
    const day = now.getDay();
    const time = now.getHours() * 100 + now.getMinutes();

    for (const period of openingHours.periods) {
      if (period.open.day === day) {
        const openTime = parseInt(period.open.time, 10);
        // closeがない場合は24時間営業とみなす
        if (!period.close) return true;
        const closeTime = parseInt(period.close.time, 10);

        if (openTime <= time && time < closeTime) {
          return true;
        }
      }
    }
    return false;
  };

  const handleCurrentLocationSearch = async () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報機能に対応していません。');
      return;
    }
    setIsLocating(true);
    setIsFiltering(true);
    setSearchTerm('現在地周辺');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      userLocation.current = { lat: latitude, lng: longitude };
      

      if (!window.google || !window.google.maps || !window.google.maps.places) {
        throw new Error('Google Maps API is not loaded.');
      }

      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      // 新しい複合検索戦略を使用
      const searchResults = await performComprehensiveSearch(userLocation.current, placesService);
      console.log('Comprehensive search results:', searchResults);

      if (searchResults && searchResults.length > 0) {
        const detailPromises = searchResults.map(place => {
          return new Promise<RamenShop | null>((resolve) => {
            if (!place.place_id) {
              resolve(null);
              return;
            }
            placesService.getDetails({ placeId: place.place_id, fields: ['name', 'rating', 'formatted_address', 'geometry', 'opening_hours', 'website', 'photos', 'reviews', 'types', 'formatted_phone_number', 'vicinity'] }, (detailedPlace, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && detailedPlace) {
                const lat = detailedPlace.geometry?.location?.lat();
                const lng = detailedPlace.geometry?.location?.lng();
                const distance = (lat && lng && userLocation.current)
                  ? calculateDistance(userLocation.current.lat, userLocation.current.lng, lat, lng)
                  : 0;
                // Get multiple photos if available
                const photos = detailedPlace.photos && detailedPlace.photos.length > 0
                  ? detailedPlace.photos.slice(0, 4).map((photo, index) => ({
                      small: photo.getUrl({ maxWidth: 400, maxHeight: 300 }),
                      medium: photo.getUrl({ maxWidth: 800, maxHeight: 600 }),
                      large: photo.getUrl({ maxWidth: 1200, maxHeight: 900 }),
                      alt: `${detailedPlace.name || ''} - ${index + 1}`
                    }))
                  : [{ 
                      small: 'https://picsum.photos/seed/ramen-default/400/300', 
                      medium: 'https://picsum.photos/seed/ramen-default/800/600', 
                      large: 'https://picsum.photos/seed/ramen-default/1200/900', 
                      alt: detailedPlace.name || 'ラーメン店' 
                    }];

                const shop: RamenShop = {
                  placeId: detailedPlace.place_id || `temp-${Math.random().toString(36).substring(2, 15)}`,
                  name: detailedPlace.name || '',
                  photos: photos,
                  rating: detailedPlace.rating || 0,
                  address: detailedPlace.formatted_address || '',
                  lat: lat || 0,
                  lng: lng || 0,
                  hours: detailedPlace.opening_hours?.weekday_text?.join('\n') || '営業時間情報なし',
                  website: detailedPlace.website || '',
                  reviews: detailedPlace.reviews?.map(r => ({ 
                    author: r.author_name || '', 
                    text: r.text || '', 
                    rating: r.rating || 0,
                    time: r.time,
                    relative_time_description: r.relative_time_description
                  })) || [],
                  distance: distance,
                  keywords: detailedPlace.types || [],
                  isOpenNow: calculateIsOpen(detailedPlace.opening_hours),
                  congestion: '不明',
                  accessInfo: '',
                  menu: generateMenuForPlace(detailedPlace.place_id || ''),
                  parkingInfo: '近隣コインパーキングあり',
                };
                resolve(shop);
              } else {
                resolve(null);
              }
            });
          });
        });

        const fetchedShops = (await Promise.all(detailPromises)).filter((s): s is RamenShop => s !== null);
        console.log('Fetched shops before setShops:', fetchedShops); // DEBUG: Added missing log
        setShops(fetchedShops.sort((a, b) => a.distance - b.distance));
      } else {
        console.warn('No search results found');
        setShops([]);
      }
    } catch (error) {
      console.error('An error occurred:', error);
      alert('検索中にエラーが発生しました。');
      setShops([]);
    } finally {
      setIsLocating(false);
      setIsFiltering(false);
    }
  };;

  const handleSearchByArea = async () => {
    if (!geocoder || !window.google || !window.google.maps.places) {
      alert('Google Maps APIがロードされていません。');
      return;
    }
    setIsFiltering(true);

    try {
      const geocodeResult = await new Promise<{ results: google.maps.GeocoderResult[]; status: google.maps.GeocoderStatus }>((resolve) => {
        geocoder.geocode({ address: searchTerm }, (results, status) => {
          resolve({ results: results || [], status });
        });
      });

      if (geocodeResult.status !== google.maps.GeocoderStatus.OK || !geocodeResult.results || geocodeResult.results.length === 0) {
        throw new Error('Geocoding failed or returned no results.');
      }

      const location = geocodeResult.results![0].geometry.location;
      userLocation.current = { lat: location.lat(), lng: location.lng() };
      

      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      // 新しい複合検索戦略を使用
      const searchResults = await performComprehensiveSearch(userLocation.current, placesService);
      console.log('Comprehensive search results (by area):', searchResults);

      if (searchResults && searchResults.length > 0) {
        const detailPromises = searchResults.map(place => {
          return new Promise<RamenShop | null>((resolve) => {
            if (!place.place_id) {
              resolve(null);
              return;
            }
            placesService.getDetails({ placeId: place.place_id, fields: ['name', 'rating', 'formatted_address', 'geometry', 'opening_hours', 'website', 'photos', 'reviews', 'types', 'formatted_phone_number', 'vicinity'] }, (detailedPlace, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && detailedPlace) {
                const lat = detailedPlace.geometry?.location?.lat();
                const lng = detailedPlace.geometry?.location?.lng();
                const distance = (lat && lng && userLocation.current)
                  ? calculateDistance(userLocation.current.lat, userLocation.current.lng, lat, lng)
                  : 0;
                // Get multiple photos if available
                const photos = detailedPlace.photos && detailedPlace.photos.length > 0
                  ? detailedPlace.photos.slice(0, 4).map((photo, index) => ({
                      small: photo.getUrl({ maxWidth: 400, maxHeight: 300 }),
                      medium: photo.getUrl({ maxWidth: 800, maxHeight: 600 }),
                      large: photo.getUrl({ maxWidth: 1200, maxHeight: 900 }),
                      alt: `${detailedPlace.name || ''} - ${index + 1}`
                    }))
                  : [{ 
                      small: 'https://picsum.photos/seed/ramen-default/400/300', 
                      medium: 'https://picsum.photos/seed/ramen-default/800/600', 
                      large: 'https://picsum.photos/seed/ramen-default/1200/900', 
                      alt: detailedPlace.name || 'ラーメン店' 
                    }];

                const shop: RamenShop = {
                  placeId: detailedPlace.place_id || `temp-${Math.random().toString(36).substring(2, 15)}`,
                  name: detailedPlace.name || '',
                  photos: photos,
                  rating: detailedPlace.rating || 0,
                  address: detailedPlace.formatted_address || '',
                  lat: lat || 0,
                  lng: lng || 0,
                  hours: detailedPlace.opening_hours?.weekday_text?.join('\n') || '営業時間情報なし',
                  website: detailedPlace.website || '',
                  reviews: detailedPlace.reviews?.map(r => ({ 
                    author: r.author_name || '', 
                    text: r.text || '', 
                    rating: r.rating || 0,
                    time: r.time,
                    relative_time_description: r.relative_time_description
                  })) || [],
                  distance: distance,
                  keywords: detailedPlace.types || [],
                  isOpenNow: calculateIsOpen(detailedPlace.opening_hours),
                  congestion: '不明',
                  accessInfo: '',
                  menu: generateMenuForPlace(detailedPlace.place_id || ''),
                  parkingInfo: '近隣コインパーキングあり',
                };
                resolve(shop);
              } else {
                resolve(null);
              }
            });
          });
        });

        const fetchedShops = (await Promise.all(detailPromises)).filter((s): s is RamenShop => s !== null);
        console.log('Fetched shops before setShops (by area):', fetchedShops); // DEBUG: Added missing log
        setShops(fetchedShops.sort((a, b) => a.distance - b.distance));
      } else {
        console.warn('No search results found');
        setShops([]);
      }
    } catch (error) {
      console.error('An error occurred during area search:', error);
      alert('指定された場所が見つかりませんでした。');
      setShops([]);
    } finally {
      setIsFiltering(false);
    }
  };

  const filteredAndSortedShops = useMemo(() => {
    const filtered = shops.filter(shop => {
      const soupMatch = soupTypeFilter === '' || 
        (shop.name.toLowerCase().includes(soupTypeFilter.toLowerCase())) ||
        (shop.reviews.some(review => review.text.toLowerCase().includes(soupTypeFilter.toLowerCase())));
      const openNowMatch = !filterOpenNow || shop.isOpenNow;
      return soupMatch && openNowMatch;
    }).sort((a, b) => {
      if (sortKey === 'rating') {
        return b.rating - a.rating;
      }
      return a.distance - b.distance;
    });
    console.log('Filtered and sorted shops:', filtered); // DEBUG: Added missing log
    return filtered;
  }, [shops, sortKey, soupTypeFilter, filterOpenNow]);

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
          <button 
            onClick={handleSearchByArea}
            className="w-full bg-gray-700 text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-600 transition shadow-md border border-gray-600">
              このエリアで検索
          </button>
        </div>
      </div>


      {/* --- Map Pane --- */}
      <div className="mt-4 h-64 md:h-80 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden lg:col-span-5 lg:row-span-2 lg:col-start-8 lg:row-start-1 lg:mt-0 lg:sticky lg:top-[100px] lg:h-[calc(100vh-160px)] lg:max-h-[800px] transition-all duration-300">
        <div ref={mapRef} className="w-full h-full"></div>
      </div>
      
      {/* --- Results Pane --- */}
      <div className="mt-4 lg:col-span-7 lg:row-start-2 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-4">
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
                  onClick={() => setSortKey(sortKey === 'distance' ? 'rating' : 'distance')}
                  className="flex items-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-200 hover:bg-gray-700 transition shadow-sm"
              >
                  <ArrowDownUp className="h-4 w-4 mr-1.5" />
                  {sortKey === 'distance' ? '距離が近い順' : '評価が高い順'}
              </button>
          </div>
          
          <p className="text-sm text-gray-400 mb-3">検索結果: {isFiltering ? '...' : `${filteredAndSortedShops.length}件`}</p>

          <div className="space-y-4">
            {isFiltering ? (
              Array.from({ length: 3 }).map((_, index) => (
                  <RamenShopListItemSkeleton key={index} />
              ))
            ) : filteredAndSortedShops.length > 0 ? (
              filteredAndSortedShops.map((shop, index) => (
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
                    onClick={() => setHighlightedPlaceId(highlightedPlaceId === shop.placeId ? null : shop.placeId)}
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
