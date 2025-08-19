import { Loader } from '@googlemaps/js-api-loader';

let loader: Loader | null = null;
let googleMapsPromise: Promise<typeof google> | null = null;

export async function loadGoogleMaps(apiKey?: string, libraries: string[] = ['places']): Promise<typeof google> {
  const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!key) {
    const error = new Error('Missing VITE_GOOGLE_MAPS_API_KEY. Please set your Google Maps API key in .env.local');
    error.name = 'GoogleMapsAPIKeyError';
    throw error;
  }

  // Return existing promise if already loading/loaded
  if (googleMapsPromise) {
    try {
      return await googleMapsPromise;
    } catch (error) {
      // If previous load failed, reset and try again
      console.warn('Previous Google Maps load failed, retrying...', error);
      googleMapsPromise = null;
      loader = null;
    }
  }

  if (!loader) {
    loader = new Loader({
      apiKey: key,
      version: 'weekly',
      libraries,
      // Enhanced configuration for better error handling
      mapIds: ['281e9bf8d5a1aa29156aabcf'], // Add your mapId if available
      authReferrerPolicy: 'origin',
    });
  }

  try {
    console.log('🗺️ Loading Google Maps API...');
    googleMapsPromise = loader.load();
    const google = await googleMapsPromise;
    
    // Verify essential APIs are available
    if (!google.maps || !google.maps.Map) {
      throw new Error('Google Maps core API not available');
    }
    
    if (libraries.includes('places') && !google.maps.places) {
      throw new Error('Google Maps Places API not available');
    }
    
    console.log('✅ Google Maps API loaded successfully');
    return google;
    
  } catch (error: any) {
    // Reset state on failure
    googleMapsPromise = null;
    loader = null;
    
    // Enhanced error classification
    if (error.code === 'NETWORK_ERROR') {
      error.message = 'ネットワークエラー: インターネット接続を確認してください。';
      error.name = 'GoogleMapsNetworkError';
    } else if (error.code === 'LOAD_ERROR') {
      error.message = 'Google Maps APIの読み込みに失敗しました。APIキーを確認してください。';
      error.name = 'GoogleMapsLoadError';
    } else if (error.message?.includes('RefererNotAllowedMapError')) {
      error.message = 'このドメインはGoogle Maps APIの使用が許可されていません。';
      error.name = 'GoogleMapsRefererError';
    } else if (error.message?.includes('InvalidKeyMapError')) {
      error.message = 'Google Maps APIキーが無効です。';
      error.name = 'GoogleMapsInvalidKeyError';
    } else if (error.message?.includes('QuotaExceededError')) {
      error.message = 'Google Maps APIの利用上限に達しました。';
      error.name = 'GoogleMapsQuotaError';
    } else {
      // Generic error
      error.message = `Google Maps API error: ${error.message || 'Unknown error'}`;
      error.name = 'GoogleMapsGenericError';
    }
    
    console.error('❌ Google Maps API load failed:', error);
    throw error;
  }
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