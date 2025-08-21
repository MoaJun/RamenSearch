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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleMap();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleMap}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        tabIndex={0}
        aria-label={isMapVisible ? 'マップを非表示にする' : 'マップを表示する'}
        aria-pressed={isMapVisible}
        className={`
          px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isMapVisible 
            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            読み込み中...
          </span>
        ) : (
          isMapVisible ? 'マップを非表示' : 'マップを表示'
        )}
      </button>
    </div>
  );
}
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