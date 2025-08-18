import { Loader } from '@googlemaps/js-api-loader';

let loader: Loader | null = null;
let googleMapsPromise: Promise<typeof google> | null = null;

export async function loadGoogleMaps(apiKey?: string, libraries: string[] = ['places']): Promise<typeof google> {
  const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!key) {
    throw new Error('Missing VITE_GOOGLE_MAPS_API_KEY. Please set your Google Maps API key in .env.local');
  }

  // Return existing promise if already loading/loaded
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  if (!loader) {
    loader = new Loader({
      apiKey: key,
      version: 'weekly',
      libraries,
    });
  }

  googleMapsPromise = loader.load();
  return googleMapsPromise;
}

// Check if Google Maps is already loaded
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.google !== 'undefined' && 
         typeof window.google.maps !== 'undefined';
}

// Utility to wait for Google Maps to be available
export async function ensureGoogleMapsLoaded(apiKey?: string): Promise<typeof google> {
  if (isGoogleMapsLoaded()) {
    return window.google;
  }
  return loadGoogleMaps(apiKey);
}