import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { RamenShop } from '../types.ts';
import RamenShopListItem from './RamenShopListItem.tsx';
import { ArrowDownUp, MapPin, LocateFixed } from 'lucide-react';
import RamenShopListItemSkeleton from './RamenShopListItemSkeleton.tsx';
import { loadGoogleMapsLazy } from '../lib/lazyGoogleMaps';
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
  showMap: boolean;
  setShowMap: (show: boolean) => void;
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
const evaluateRamenShopProbability = (place: google.maps.places.PlaceResult): number => {
  const name = place.name || '';
  const vicinity = place.vicinity || '';
  const types = place.types || [];
  const searchText = `${name} ${vicinity} ${types.join(' ')}`.toLowerCase();
  
  // 除外キーワードチェック（優先度高）
  const hasExcludeKeyword = EXCLUDE_KEYWORDS.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
  
  if (hasExcludeKeyword) {
    return 0.0;
  }
  
  // ラーメン関連キーワードでスコア計算
  let score = 0;
  
  // Strong indicators (高得点)
  RAMEN_INDICATORS.strong.forEach(indicator => {
    if (searchText.includes(indicator.toLowerCase())) {
      score += 10;
    }
  });
  
  // Medium indicators (中得点)
  RAMEN_INDICATORS.medium.forEach(indicator => {
    if (searchText.includes(indicator.toLowerCase())) {
      score += 5;
    }
  });
  
  // Weak indicators (低得点)
  RAMEN_INDICATORS.weak.forEach(indicator => {
    if (searchText.includes(indicator.toLowerCase())) {
      score += 2;
    }
  });
  
  // レストランタイプ評価
  if (types.includes('restaurant') || types.includes('meal_takeaway')) {
    score += 3;
  }
  
  const confidence = Math.min(score / 10, 1.0);
  
  console.log(`${name}: score=${score}, confidence=${confidence}`);
  
  return confidence;
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

// Cache instance for search results
const searchCache = new Map<string, { results: google.maps.places.PlaceResult[]; timestamp: number }>();

// Helper function to generate cache key from location and search term
const generateCacheKey = (lat: number, lng: number, searchTerm: string): string => {
  // Round coordinates to 3 decimal places (~100m precision) for efficient caching
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `search_${roundedLat}_${roundedLng}_${searchTerm}`;
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
  setHighlightedPlaceId,
  showMap,
  setShowMap,
}) => {
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Google Maps Lazy Loading Effect
  useEffect(() => {
    if (!showMap) return;
    
    const initializeGoogleMaps = async () => {
      setIsMapLoading(true);
      setMapLoadError(null);
      
      try {
        await loadGoogleMapsLazy();
        if (window.google && window.google.maps && !geocoder) {
          setGeocoder(new window.google.maps.Geocoder());
        }
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
        setMapLoadError('Google Maps APIの読み込みに失敗しました。APIキーを確認してください。');
      } finally {
        setIsMapLoading(false);
      }
    };

    initializeGoogleMaps();
  }, [showMap, geocoder]);

  // Map initialization effect (only when both showMap and geocoder are ready)
  useEffect(() => {
    if (!showMap || !mapRef.current || !window.google?.maps || mapInstance.current) return;

    try {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: userLocation.current || { lat: 35.6812, lng: 139.7671 }, // Tokyo Station default
        zoom: 15,
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapLoadError('マップの初期化に失敗しました。');
    }
  }, [showMap]);

  // Map markers update effect
  useEffect(() => {
    if (!showMap || !mapInstance.current || !window.google?.maps) return;

    // Clear existing markers
    markers.current.forEach((marker) => {
      if (marker.setMap) marker.setMap(null);
    });
    markers.current = [];

    // Add new markers for each shop
    shops.forEach((shop, index) => {
      if (shop.lat && shop.lng) {
        try {
          const marker = new window.google.maps.Marker({
            position: { lat: shop.lat, lng: shop.lng },
            map: mapInstance.current!,
            title: shop.name,
            animation: window.google.maps.Animation.DROP,
          });

          // InfoWindow with shop details
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div class="p-3 max-w-sm">
                <h3 class="font-bold text-lg mb-1">${shop.name}</h3>
                <p class="text-sm text-gray-600 mb-2">${shop.address}</p>
                <div class="flex items-center mb-2">
                  <span class="text-yellow-500">★</span>
                  <span class="ml-1 text-sm">${shop.rating}/5</span>
                </div>
                <p class="text-xs text-gray-500">距離: ${shop.distance.toFixed(1)}km</p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance.current!, marker);
            onShopSelect(shop);
          });

          // Highlight marker on hover
          marker.addListener('mouseover', () => {
            setHoveredPlaceId(shop.placeId);
          });

          marker.addListener('mouseout', () => {
            setHoveredPlaceId(null);
          });

          markers.current.push(marker);
        } catch (error) {
          console.error(`Failed to create marker for shop ${shop.name}:`, error);
        }
      }
    });

    // Adjust map bounds to fit all markers
    if (markers.current.length > 0 && mapInstance.current) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.current.forEach((marker) => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      mapInstance.current.fitBounds(bounds);
    }
  }, [shops, showMap, onShopSelect, setHoveredPlaceId]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    // Haversine formula to calculate distance between two coordinates
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
  };

  // Advanced comprehensive search function with better filtering and scoring
  const performComprehensiveSearch = async (location: google.maps.LatLngLiteral, placesService: google.maps.places.PlacesService): Promise<google.maps.places.PlaceResult[]> => {
    // Define search parameters for various types of ramen places
    const searchConfigs = [
      { query: 'ラーメン', radius: 2000 },
      { query: '拉麺', radius: 2000 },
      { query: 'らーめん', radius: 2000 },
      { query: 'ramen', radius: 2000 },
      { query: '中華そば', radius: 2000 },
      { query: 'つけ麺', radius: 2000 },
    ];

    const allResults = new Map<string, google.maps.places.PlaceResult>();
    const cacheKey = generateCacheKey(location.lat, location.lng, searchTerm);

    // Check cache first
    const cachedData = searchCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < 300000) { // 5 minutes cache
      console.log('Using cached search results');
      return cachedData.results;
    }

    try {
      for (const config of searchConfigs) {
        // Text search
        const textSearchResults = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
          const request: google.maps.places.TextSearchRequest = {
            query: `${config.query} ${searchTerm}`,
            location: new window.google.maps.LatLng(location.lat, location.lng),
            radius: config.radius
          };

          placesService.textSearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results.filter(place => evaluateRamenShopProbability(place) > 0.3));
            } else {
              resolve([]);
            }
          });
        });

        // Nearby search
        const nearbySearchResults = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
          const request: google.maps.places.PlaceSearchRequest = {
            location: new window.google.maps.LatLng(location.lat, location.lng),
            radius: config.radius,
            type: 'restaurant',
            keyword: config.query
          };

          placesService.nearbySearch(request, (results, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results.filter(place => evaluateRamenShopProbability(place) > 0.3));
            } else {
              resolve([]);
            }
          });
        });

        // Combine and deduplicate results
        [...textSearchResults, ...nearbySearchResults].forEach(place => {
          if (place.place_id) {
            allResults.set(place.place_id, place);
          }
        });
      }

      const finalResults = Array.from(allResults.values());
      
      // Cache the results
      searchCache.set(cacheKey, {
        results: finalResults,
        timestamp: Date.now()
      });

      return finalResults;
    } catch (error) {
      console.error('Comprehensive search failed:', error);
      return [];
    }
  };

  const calculateIsOpen = (openingHours?: google.maps.places.PlaceOpeningHours): boolean => {
    if (!openingHours || !openingHours.isOpen) {
      return false; // Default to closed if no data available
    }
    
    try {
      return openingHours.isOpen();
    } catch (error) {
      console.error('Error checking opening hours:', error);
      return false; // Default to closed on error
    }
  };

  const handleCurrentLocationSearch = async () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザでは位置情報がサポートされていません。');
      return;
    }

    setIsLocating(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000 // Cache position for 1 minute
        });
      });

      userLocation.current = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Initialize Google Maps if not already loaded
      if (!window.google?.maps) {
        try {
          await loadGoogleMapsLazy();
        } catch (error) {
          console.error('Failed to load Google Maps API:', error);
          alert('Google Maps APIの読み込みに失敗しました。');
          return;
        }
      }

      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      // 新しい複合検索戦略を使用
      const searchResults = await performComprehensiveSearch(userLocation.current, placesService);
      console.log('Comprehensive search results (current location):', searchResults);

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
        console.log('Fetched shops before setShops (current location):', fetchedShops);
        setShops(fetchedShops.sort((a, b) => a.distance - b.distance));
      } else {
        console.warn('No search results found');
        setShops([]);
      }
    } catch (error) {
      console.error('Geolocation or search error:', error);
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert('位置情報へのアクセスが拒否されました。ブラウザの設定を確認してください。');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('位置情報が利用できません。');
            break;
          case error.TIMEOUT:
            alert('位置情報の取得がタイムアウトしました。');
            break;
          default:
            alert('位置情報の取得に失敗しました。');
        }
      } else {
        alert('検索中にエラーが発生しました。');
      }
      setShops([]);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearchByArea = async () => {
    if (!window.google?.maps) {
      // Google Mapsが未初期化の場合は遅延ロード
      try {
        await loadGoogleMapsLazy();
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
        alert('Google Maps APIの読み込みに失敗しました。');
        return;
      }
    }

    if (!geocoder) {
      // Geocoderが未初期化の場合は作成
      try {
        setGeocoder(new window.google.maps.Geocoder());
      } catch (error) {
        console.error('Failed to create Geocoder:', error);
        alert('Geocoderの初期化に失敗しました。');
        return;
      }
    }

    setIsFiltering(true);

    try {
      const geocodeResult = await new Promise<{ results: google.maps.GeocoderResult[]; status: google.maps.GeocoderStatus }>((resolve) => {
        geocoder!.geocode({ address: searchTerm }, (results, status) => {
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
        console.log('Fetched shops before setShops (by area):', fetchedShops);
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

  // Debounced search handlers (500ms delay to prevent excessive API calls)
  const debouncedAreaSearch = useDebounce(handleSearchByArea, 500);
  const debouncedLocationSearch = useDebounce(handleCurrentLocationSearch, 500);

  // Filtered and sorted shops based on current filters
  const filteredAndSortedShops = useMemo(() => {
    let filtered = shops.filter((shop) => {
      const matchesSearchTerm = !searchTerm || 
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSoupType = !soupTypeFilter || shop.keywords.some(keyword => keyword.toLowerCase().includes(soupTypeFilter.toLowerCase()));
      const matchesOpenNow = !filterOpenNow || shop.isOpenNow;

      return matchesSearchTerm && matchesSoupType && matchesOpenNow;
    });

    filtered = filtered.sort((a, b) => sortKey === 'distance' ? a.distance - b.distance : b.rating - a.rating);
    return filtered;
  }, [shops, searchTerm, soupTypeFilter, filterOpenNow, sortKey]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:max-h-screen lg:overflow-hidden">
      {/* Left side: Search controls and results */}
      <div className="lg:col-span-7 lg:overflow-y-auto lg:max-h-[calc(100vh-100px)] lg:pr-4">
        {/* Search Controls */}
        <div className="bg-gray-900 p-4 rounded-lg shadow-lg mb-4">
          <h2 className="text-xl font-bold mb-4">ラーメン店検索</h2>
          
          {/* Search Input */}
          <div className="relative mb-4">
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
            className="w-full bg-gray-700 text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-600 transition shadow-md border border-gray-600 mb-3">
              このエリアで検索
          </button>
          
          {/* マップ表示トグル */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-sm text-gray-200">マップを表示</span>
            <button
              onClick={() => setShowMap(!showMap)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                showMap ? 'bg-red-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showMap ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* --- Map Pane --- */}
        {showMap && (
          <div className="mt-4 h-64 md:h-80 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden lg:col-span-5 lg:row-span-2 lg:col-start-8 lg:row-start-1 lg:mt-0 lg:sticky lg:top-[100px] lg:h-[calc(100vh-160px)] lg:max-h-[800px] transition-all duration-300">
            {isMapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                  <p className="text-gray-300 text-sm">マップを読み込み中...</p>
                </div>
              </div>
            )}
            {mapLoadError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-10">
                <div className="text-center p-4">
                  <div className="text-red-500 mb-2">⚠️</div>
                  <p className="text-red-400 text-sm mb-2">{mapLoadError}</p>
                  <button 
                    onClick={() => setMapLoadError(null)}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition"
                  >
                    再試行
                  </button>
                </div>
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>
        )}

        {/* Filters and Sorting */}
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

        {/* Results List */}
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
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">🍜</div>
              <p className="text-gray-400">検索結果が見つかりませんでした</p>
              <p className="text-gray-500 text-sm">検索条件を変更してお試しください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;