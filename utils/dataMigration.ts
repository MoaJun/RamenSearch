/**
 * Data Migration Utility
 * Migrates existing localStorage data to Supabase
 */

import { FavoritesService } from '../services/favoritesService';
import { SupabaseFavoritesService } from '../services/supabaseFavoritesService';
import { FavoriteShop, VisitHistory } from '../types';

export interface MigrationResult {
  success: boolean;
  favoritesMigrated: number;
  visitsMigrated: number;
  errors: string[];
}

export class DataMigrationService {
  private localService: FavoritesService;
  private supabaseService: SupabaseFavoritesService;

  constructor() {
    this.localService = new FavoritesService();
    this.supabaseService = new SupabaseFavoritesService();
  }

  /**
   * Migrate all localStorage data to Supabase
   */
  async migrateToSupabase(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      favoritesMigrated: 0,
      visitsMigrated: 0,
      errors: []
    };

    try {
      console.log('Starting data migration from localStorage to Supabase...');

      // Get existing localStorage data
      const localData = await this.localService.exportUserData();
      
      if (!localData.favorites.length && !localData.visits.length) {
        console.log('No local data found to migrate');
        result.success = true;
        return result;
      }

      console.log(`Found ${localData.favorites.length} favorites and ${localData.visits.length} visits to migrate`);

      // Migrate favorites
      for (const favorite of localData.favorites) {
        try {
          await this.migrateFavorite(favorite);
          result.favoritesMigrated++;
        } catch (error) {
          const errorMsg = `Failed to migrate favorite ${favorite.name}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      // Migrate visit history
      for (const visit of localData.visits) {
        try {
          await this.migrateVisit(visit);
          result.visitsMigrated++;
        } catch (error) {
          const errorMsg = `Failed to migrate visit for ${visit.placeId}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      result.success = result.errors.length === 0;
      
      console.log('Migration completed:', {
        favoritesMigrated: result.favoritesMigrated,
        visitsMigrated: result.visitsMigrated,
        errors: result.errors.length
      });

      return result;
    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      // Check if we have local data
      const localData = await this.localService.exportUserData();
      if (!localData.favorites.length && !localData.visits.length) {
        return false;
      }

      // Check if Supabase already has data
      const supabaseData = await this.supabaseService.exportUserData();
      if (supabaseData.favorites.length > 0 || supabaseData.visits.length > 0) {
        // Already migrated or has data
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Create backup of current Supabase data
   */
  async createBackup(): Promise<{ favorites: FavoriteShop[]; visits: VisitHistory[] }> {
    try {
      return await this.supabaseService.exportUserData();
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restore data from backup
   */
  async restoreFromBackup(backup: { favorites: FavoriteShop[]; visits: VisitHistory[] }): Promise<void> {
    try {
      // Clear existing data
      await this.supabaseService.clearAllData();
      
      // Restore favorites
      for (const favorite of backup.favorites) {
        await this.migrateFavorite(favorite);
      }

      // Restore visits
      for (const visit of backup.visits) {
        await this.migrateVisit(visit);
      }

      console.log('Data restored from backup successfully');
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Compare local and Supabase data
   */
  async compareData(): Promise<{
    local: { favorites: number; visits: number };
    supabase: { favorites: number; visits: number };
    differences: string[];
  }> {
    try {
      const [localData, supabaseData] = await Promise.all([
        this.localService.exportUserData(),
        this.supabaseService.exportUserData()
      ]);

      const result = {
        local: {
          favorites: localData.favorites.length,
          visits: localData.visits.length
        },
        supabase: {
          favorites: supabaseData.favorites.length,
          visits: supabaseData.visits.length
        },
        differences: [] as string[]
      };

      if (result.local.favorites !== result.supabase.favorites) {
        result.differences.push(`Favorites count mismatch: local(${result.local.favorites}) vs supabase(${result.supabase.favorites})`);
      }

      if (result.local.visits !== result.supabase.visits) {
        result.differences.push(`Visits count mismatch: local(${result.local.visits}) vs supabase(${result.supabase.visits})`);
      }

      return result;
    } catch (error) {
      console.error('Failed to compare data:', error);
      throw error;
    }
  }

  /**
   * Migrate a single favorite
   */
  private async migrateFavorite(favorite: FavoriteShop): Promise<void> {
    // Check if already exists
    const exists = await this.supabaseService.isFavorite(favorite.placeId);
    if (exists) {
      console.log(`Favorite ${favorite.name} already exists in Supabase, skipping`);
      return;
    }

    // Create a RamenShop object for the addToFavorites method
    const ramenShop = {
      placeId: favorite.placeId,
      name: favorite.name,
      address: favorite.address,
      rating: favorite.rating,
      photos: [],
      lat: 0,
      lng: 0,
      hours: '',
      website: '',
      reviews: [],
      distance: 0,
      keywords: [],
      isOpenNow: false,
      congestion: '不明' as const,
      accessInfo: '',
      menu: [],
      parkingInfo: ''
    };

    await this.supabaseService.addToFavorites(ramenShop);

    // Update additional fields if they exist
    if (favorite.personal_notes) {
      await this.supabaseService.updateFavoriteNotes(favorite.placeId, favorite.personal_notes);
    }

    if (favorite.tags && favorite.tags.length > 0) {
      await this.supabaseService.updateFavoriteTags(favorite.placeId, favorite.tags);
    }
  }

  /**
   * Migrate a single visit
   */
  private async migrateVisit(visit: VisitHistory): Promise<void> {
    await this.supabaseService.addVisit({
      placeId: visit.placeId,
      shop_name: visit.shop_name || 'Unknown Shop',
      visitDate: visit.visitDate,
      rating: visit.rating,
      notes: visit.notes,
      photos: visit.photos
    });
  }
}

// Export singleton instance
export const dataMigrationService = new DataMigrationService();