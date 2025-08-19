// Lazy Google Maps service - Load only when map features are needed
// This reduces initial bundle load and improves FCP/TTI metrics

import { loadGoogleMaps } from './googleMaps';

let mapsPromise: Promise<typeof google> | null = null;
let isLoading = false;

/**
 * Lazy load Google Maps API only when map functionality is actually needed
 * This prevents the heavy Google Maps JS from blocking initial page load
 */
export async function loadGoogleMapsLazy(): Promise<typeof google> {
  // Return existing promise if already loading/loaded
  if (mapsPromise) {
    return mapsPromise;
  }

  if (isLoading) {
    // Wait for existing load to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (mapsPromise) {
      return mapsPromise;
    }
  }

  isLoading = true;
  
  try {
    console.log('🗺️ Lazy loading Google Maps API...');
    mapsPromise = loadGoogleMaps();
    const google = await mapsPromise;
    console.log('✅ Google Maps API lazy loaded successfully');
    return google;
  } catch (error) {
    // Reset state on failure to allow retry
    mapsPromise = null;
    console.error('❌ Google Maps lazy loading failed:', error);
    throw error;
  } finally {
    isLoading = false;
  }
}

/**
 * Check if Google Maps is already loaded without triggering a load
 */
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google && window.google.maps && window.google.maps.Map);
}

/**
 * Reset the lazy loading state (useful for testing or error recovery)
 */
export function resetLazyGoogleMapsState(): void {
  mapsPromise = null;
  isLoading = false;
}

/**
 * Create a Geocoder instance lazily
 */
export async function createGeocoderLazy(): Promise<google.maps.Geocoder> {
  const google = await loadGoogleMapsLazy();
  return new google.maps.Geocoder();
}

/**
 * Create a PlacesService instance lazily
 */
export async function createPlacesServiceLazy(): Promise<google.maps.places.PlacesService> {
  const google = await loadGoogleMapsLazy();
  return new google.maps.places.PlacesService(document.createElement('div'));
}

/**
 * Create a Map instance lazily
 */
export async function createMapLazy(
  element: HTMLElement, 
  options: google.maps.MapOptions
): Promise<google.maps.Map> {
  const google = await loadGoogleMapsLazy();
  return new google.maps.Map(element, options);
}

/**
 * Get the current loading status for UI feedback
 */
export function getMapsLoadingStatus(): {
  isLoading: boolean;
  isLoaded: boolean;
  hasPromise: boolean;
} {
  return {
    isLoading,
    isLoaded: isGoogleMapsLoaded(),
    hasPromise: !!mapsPromise
  };
}