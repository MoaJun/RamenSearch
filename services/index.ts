/**
 * Service Factory
 * Manages which favorites service to use (localStorage or Supabase)
 */

import { FavoritesService } from './favoritesService';
import { SupabaseFavoritesService } from './supabaseFavoritesService';

// Configuration for service selection
const USE_SUPABASE = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

// Service instances
const localFavoritesService = new FavoritesService();
const supabaseFavoritesService = new SupabaseFavoritesService();

/**
 * Get the active favorites service based on configuration
 */
export function getFavoritesService() {
  // For now, we'll use localStorage by default and allow manual switching
  // In production, you might want to automatically use Supabase if available
  return USE_SUPABASE ? supabaseFavoritesService : localFavoritesService;
}

/**
 * Get the localStorage-based service (for comparison/migration)
 */
export function getLocalFavoritesService() {
  return localFavoritesService;
}

/**
 * Get the Supabase-based service (for testing/migration)
 */
export function getSupabaseFavoritesService() {
  return supabaseFavoritesService;
}

/**
 * Check if Supabase is available and configured
 */
export function isSupabaseAvailable(): boolean {
  return !!USE_SUPABASE;
}

/**
 * Service configuration status
 */
export function getServiceStatus() {
  return {
    supabaseAvailable: isSupabaseAvailable(),
    currentService: USE_SUPABASE ? 'supabase' : 'localStorage',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
    hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  };
}

// Export the active service as default
export default getFavoritesService();