/**
 * Simple Supabase Migration Service
 * Migrates localStorage data to user_data table JSONB columns
 */

import { FavoritesService } from './favoritesService';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface MigrationResult {
  success: boolean;
  favoritesMigrated: number;
  visitsMigrated: number;
  errors: string[];
}

export class SupabaseSimpleMigration {
  private localService: FavoritesService;
  private userId: string = 'ramensearch_user'; // Simple user ID

  constructor() {
    this.localService = new FavoritesService();
  }

  /**
   * Check if Supabase is configured
   */
  private isSupabaseConfigured(): boolean {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  }


  /**
   * Upsert user data to Supabase
   */
  private async upsertUserData(favorites: any[], visits: any[]): Promise<void> {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: this.userId,
        favorites: favorites,
        visited: visits,
        bookmarks: [],
        user_posts: []
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upsert user data: ${response.status} ${error}`);
    }
  }

  /**
   * Get existing user data from Supabase
   */
  private async getUserData(): Promise<any> {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${this.userId}&select=*`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user data: ${response.status}`);
    }

    const data = await response.json();
    return data[0] || null;
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      if (!this.isSupabaseConfigured()) {
        console.log('Supabase not configured, migration not needed');
        return false;
      }

      // Check if we have local data
      const localData = await this.localService.exportUserData();
      if (!localData.favorites.length && !localData.visits.length) {
        console.log('No local data found, migration not needed');
        return false;
      }

      // Check if Supabase already has data
      const userData = await this.getUserData();
      if (userData && (userData.favorites.length > 0 || userData.visited.length > 0)) {
        console.log('Supabase already has data, migration not needed');
        return false;
      }

      console.log(`Migration needed: ${localData.favorites.length} favorites, ${localData.visits.length} visits`);
      return true;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Migrate localStorage data to Supabase
   */
  async migrateToSupabase(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      favoritesMigrated: 0,
      visitsMigrated: 0,
      errors: []
    };

    try {
      console.log('Starting simple migration to Supabase...');

      if (!this.isSupabaseConfigured()) {
        const error = 'Supabase not configured';
        result.errors.push(error);
        return result;
      }

      // Get localStorage data
      const localData = await this.localService.exportUserData();
      
      if (!localData.favorites.length && !localData.visits.length) {
        console.log('No data to migrate');
        result.success = true;
        return result;
      }

      console.log(`Migrating ${localData.favorites.length} favorites and ${localData.visits.length} visits`);

      // Convert data to simple format for JSONB storage
      const favoritesData = localData.favorites.map(fav => ({
        placeId: fav.placeId,
        name: fav.name,
        address: fav.address,
        rating: fav.rating,
        savedAt: fav.savedAt.toISOString(),
        visitCount: fav.visitCount || 0,
        lastVisit: fav.lastVisit?.toISOString() || null,
        personal_notes: fav.personal_notes || '',
        tags: fav.tags || []
      }));

      const visitsData = localData.visits.map(visit => ({
        placeId: visit.placeId,
        shop_name: visit.shop_name || 'Unknown Shop',
        visitDate: visit.visitDate.toISOString(),
        rating: visit.rating || null,
        notes: visit.notes || '',
        photos: visit.photos || []
      }));

      // Upsert to Supabase
      await this.upsertUserData(favoritesData, visitsData);

      result.favoritesMigrated = favoritesData.length;
      result.visitsMigrated = visitsData.length;
      result.success = true;

      console.log('Migration completed successfully:', {
        favoritesMigrated: result.favoritesMigrated,
        visitsMigrated: result.visitsMigrated
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
   * Test Supabase connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isSupabaseConfigured()) {
        return false;
      }

      await this.getUserData();
      console.log('Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const supabaseSimpleMigration = new SupabaseSimpleMigration();