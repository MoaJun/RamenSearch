import { useState } from 'react';
import { lazyLoadGoogleMaps } from '../lib/lazyGoogleMaps';

interface MapToggleProps {
  onMapLoad?: () => void;
  onMapHide?: () => void;
}

export function MapToggle({ onMapLoad, onMapHide }: MapToggleProps) {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleMap = async () => {
    if (isMapVisible) {
      setIsMapVisible(false);
      onMapHide?.();
      return;
    }

    try {
      setIsLoading(true);
      await lazyLoadGoogleMaps({
        onLoad: () => {
          console.log('Maps loaded via toggle');
        },
        onError: (error) => {
          console.error('Map loading failed:', error);
        }
      });
      
      setIsMapVisible(true);
      onMapLoad?.();
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleMap}
        disabled={isLoading}
        className={`
          px-4 py-2 rounded-lg font-medium transition-colors
          ${isMapVisible 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isLoading ? (
          <>
            <span className="inline-block animate-spin mr-2">⟳</span>
            Loading Maps...
          </>
        ) : isMapVisible ? (
          <>📍 Hide Map</>
        ) : (
          <>🗺️ Show Map</>
        )}
      </button>
    </div>
  );
}