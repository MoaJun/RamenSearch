import React, { useEffect, useRef } from 'react';
import { RamenShop } from '../types.ts';
import { loadGoogleMaps } from '../lib/googleMaps';

interface StoreMapProps {
  shop: RamenShop;
  apiKey: string;
}

const StoreMap: React.FC<StoreMapProps> = ({ shop, apiKey }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!apiKey) {
      console.warn('Google Maps API key is not provided');
      return;
    }

    const loadGoogleMapsAPI = async () => {
      try {
        await loadGoogleMaps(apiKey);
        if (window.google && window.google.maps) {
          initializeMap();
        }
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
      }
    };

    const initializeMap = () => {
      if (!mapRef.current) return;

      try {
        // Initialize map
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: shop.lat, lng: shop.lng },
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }]
            }
          ]
        });

        // Create marker
        const marker = new google.maps.Marker({
          position: { lat: shop.lat, lng: shop.lng },
          map: map,
          title: shop.name,
          animation: google.maps.Animation.DROP,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EF4444"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32)
          }
        });


        // Store references
        mapInstanceRef.current = map;
        markerRef.current = marker;

      } catch (error) {
        console.error('Error initializing Google Maps:', error);
      }
    };

    loadGoogleMapsAPI();

    // Cleanup function
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [shop, apiKey]);

  if (!apiKey) {
    return (
      <div className="w-full h-64 bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>地図を表示するにはGoogle Maps API キーが必要です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-gray-800 rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default StoreMap;