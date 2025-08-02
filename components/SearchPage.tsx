import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { RamenShop } from '../types.ts';
import { MOCK_RAMEN_SHOPS } from '../constants.ts';
import RamenShopListItem from './RamenShopListItem.tsx';
import { Search, ArrowDownUp, MapPin, LocateFixed, Clock } from 'lucide-react';
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
  const [isFiltering, setIsFiltering] = useState(false);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [highlightedPlaceId, setHighlightedPlaceId] = useState<string | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const userLocation = useRef<google.maps.LatLngLiteral | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);

  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Google Maps APIがロードされた後にGeocoderを初期化
  useEffect(() => {
    if (window.google && !geocoder) {
      setGeocoder(new window.google.maps.Geocoder());
    }
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
          const marker = new window.google.maps.Marker({
            position: { lat: shop.lat, lng: shop.lng },
            map: mapInstance.current,
            title: shop.name,
            label: `${index + 1}`,
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
  }, [shops]);

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

      const request: google.maps.places.PlaceSearchRequest = {
        location: userLocation.current,
        radius: 300, // 300m圏内を検索
        keyword: 'ラーメン',
        type: 'restaurant',
      };

      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      const searchResponse = await new Promise<{ results: google.maps.places.PlaceResult[] | null; status: google.maps.places.PlacesServiceStatus }>((resolve) => {
        placesService.nearbySearch(request, (results, status) => {
          resolve({ results, status });
        });
      });

      if (searchResponse.status === google.maps.places.PlacesServiceStatus.OK && searchResponse.results) {
        const detailPromises = searchResponse.results.map(place => {
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
                const photoUrl = detailedPlace.photos && detailedPlace.photos.length > 0
                  ? detailedPlace.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
                  : 'https://picsum.photos/seed/ramen-default/400/300';

                const shop: RamenShop = {
                  placeId: detailedPlace.place_id || `temp-${Math.random().toString(36).substring(2, 15)}`,
                  name: detailedPlace.name || '',
                  photos: [{ small: photoUrl, medium: photoUrl, large: photoUrl, alt: detailedPlace.name || '' }],
                  rating: detailedPlace.rating || 0,
                  address: detailedPlace.formatted_address || '',
                  lat: lat || 0,
                  lng: lng || 0,
                  hours: detailedPlace.opening_hours?.weekday_text?.join('\n') || '営業時間情報なし',
                  website: detailedPlace.website || '',
                  reviews: detailedPlace.reviews?.map(r => ({ author: r.author_name, text: r.text, rating: r.rating })) || [],
                  distance: distance,
                  keywords: detailedPlace.types || [],
                  isOpenNow: calculateIsOpen(detailedPlace.opening_hours),
                  congestion: '不明',
                  accessInfo: '',
                  menu: [],
                  parkingInfo: '',
                };
                resolve(shop);
              } else {
                resolve(null);
              }
            });
          });
        });

        const fetchedShops = (await Promise.all(detailPromises)).filter((s): s is RamenShop => s !== null);
        setShops(fetchedShops.sort((a, b) => a.distance - b.distance));
      } else {
        console.error('Google Places API Error:', searchResponse.status);
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
  };

  const handleSearchByArea = async () => {
    if (!geocoder || !window.google || !window.google.maps.places) {
      alert('Google Maps APIがロードされていません。');
      return;
    }
    setIsFiltering(true);

    try {
      const geocodeResult = await new Promise<{ results: google.maps.GeocoderResult[]; status: google.maps.GeocoderStatus }>((resolve) => {
        geocoder.geocode({ address: searchTerm }, (results, status) => {
          resolve({ results, status });
        });
      });

      if (geocodeResult.status !== google.maps.GeocoderStatus.OK || !geocodeResult.results || geocodeResult.results.length === 0) {
        throw new Error('Geocoding failed or returned no results.');
      }

      const location = geocodeResult.results[0].geometry.location;
      userLocation.current = { lat: location.lat(), lng: location.lng() };
      

      const request: google.maps.places.PlaceSearchRequest = {
        location: userLocation.current,
        radius: 300, // 300m圏内を検索
        keyword: 'ラーメン',
        type: 'restaurant',
      };

      const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      const searchResponse = await new Promise<{ results: google.maps.places.PlaceResult[] | null; status: google.maps.places.PlacesServiceStatus }>((resolve) => {
        placesService.nearbySearch(request, (results, status) => {
          resolve({ results, status });
        });
      });

      if (searchResponse.status === google.maps.places.PlacesServiceStatus.OK && searchResponse.results) {
        const detailPromises = searchResponse.results.map(place => {
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
                const photoUrl = detailedPlace.photos && detailedPlace.photos.length > 0
                  ? detailedPlace.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
                  : 'https://picsum.photos/seed/ramen-default/400/300';

                const shop: RamenShop = {
                  placeId: detailedPlace.place_id || `temp-${Math.random().toString(36).substring(2, 15)}`,
                  name: detailedPlace.name || '',
                  photos: [{ small: photoUrl, medium: photoUrl, large: photoUrl, alt: detailedPlace.name || '' }],
                  rating: detailedPlace.rating || 0,
                  address: detailedPlace.formatted_address || '',
                  lat: lat || 0,
                  lng: lng || 0,
                  hours: detailedPlace.opening_hours?.weekday_text?.join('\n') || '営業時間情報なし',
                  website: detailedPlace.website || '',
                  reviews: detailedPlace.reviews?.map(r => ({ author: r.author_name, text: r.text, rating: r.rating })) || [],
                  distance: distance,
                  keywords: detailedPlace.types || [],
                  isOpenNow: calculateIsOpen(detailedPlace.opening_hours),
                  congestion: '不明',
                  accessInfo: '',
                  menu: [],
                  parkingInfo: '',
                };
                resolve(shop);
              } else {
                resolve(null);
              }
            });
          });
        });

        const fetchedShops = (await Promise.all(detailPromises)).filter((s): s is RamenShop => s !== null);
        setShops(fetchedShops.sort((a, b) => a.distance - b.distance));
      } else {
        console.error('Google Places API Error:', searchResponse.status);
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

  const filteredAndSortedShops = useMemo(() => {
    return shops.filter(shop => {
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
      <div className="mt-4 h-64 md:h-80 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden lg:col-span-5 lg:row-span-2 lg:col-start-8 lg:row-start-1 lg:mt-0 lg:sticky lg:top-[100px] lg:h-[calc(100vh-160px)] lg:max-h-[800px]">
        <div ref={mapRef} className="w-full h-full"></div>
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