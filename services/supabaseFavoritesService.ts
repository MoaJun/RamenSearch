/**
 * Supabase Favorites Service
 * 正規化されたfavorites/visit_historyテーブル対応
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FavoriteShop, VisitHistory, RamenShop } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// データベース型定義
interface DbFavorite {
  id: string;
  user_id: string;
  place_id: string;
  name: string;
  address: string | null;
  rating: number | null;
  saved_at: string;
  visit_count: number;
  last_visit: string | null;
  personal_notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface DbVisit {
  id: string;
  user_id: string;
  place_id: string;
  shop_name: string;
  visit_date: string;
  rating: number | null;
  notes: string | null;
  photos: string[];
  created_at: string;
}

export class SupabaseFavoritesService {
  private supabase: SupabaseClient;
  private userId: string = 'ramensearch_user'; // シンプルなユーザーID

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
   * データベース型をアプリ型に変換
   */
  private dbFavoriteToApp(dbFav: DbFavorite): FavoriteShop {
    return {
      id: dbFav.id,
      user_id: dbFav.user_id,
      placeId: dbFav.place_id,
      name: dbFav.name,
      address: dbFav.address || '',
      rating: dbFav.rating || 0,
      savedAt: new Date(dbFav.saved_at),
      visitCount: dbFav.visit_count,
      lastVisit: dbFav.last_visit ? new Date(dbFav.last_visit) : undefined,
      personal_notes: dbFav.personal_notes || '',
      tags: dbFav.tags || [],
      created_at: new Date(dbFav.created_at)
    };
  }

  private dbVisitToApp(dbVisit: DbVisit): VisitHistory {
    return {
      id: dbVisit.id,
      user_id: dbVisit.user_id,
      placeId: dbVisit.place_id,
      shop_name: dbVisit.shop_name,
      visitDate: new Date(dbVisit.visit_date),
      rating: dbVisit.rating || undefined,
      notes: dbVisit.notes || '',
      photos: dbVisit.photos || [],
      created_at: new Date(dbVisit.created_at)
    };
  }

  /**
   * お気に入り一覧取得
   */
  async getFavorites(): Promise<FavoriteShop[]> {
    try {
      const { data, error } = await this.supabase
        .from('favorites')
        .select('*')
        .eq('user_id', this.userId)
        .order('saved_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorites:', error);
        throw error;
      }

      return (data || []).map(this.dbFavoriteToApp);
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  }

  /**
   * Add shop to favorites
   */
  async addToFavorites(shop: RamenShop): Promise<void> {
    try {
      // Check if already exists
      const existingFavorite = await supabase
        .from(TABLES.FAVORITES)
        .select('id')
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', shop.placeId)
        .single();

      if (existingFavorite.data) {
        console.log('Shop is already in favorites');
        return;
      }

      const favoriteData: Omit<DatabaseFavorite, 'id' | 'created_at'> = {
        user_id: DEMO_USER_ID,
        place_id: shop.placeId,
        name: shop.name,
        address: shop.address,
        rating: shop.rating,
        saved_at: new Date().toISOString(),
        visit_count: 0,
        last_visit: null,
        personal_notes: null,
        tags: null
      };

      const { error } = await supabase
        .from(TABLES.FAVORITES)
        .insert(favoriteData);

      if (error) {
        console.error('Error adding to favorites:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove shop from favorites
   */
  async removeFromFavorites(placeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.FAVORITES)
        .delete()
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', placeId);

      if (error) {
        console.error('Error removing from favorites:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  }

  /**
   * Check if shop is in favorites
   */
  async isFavorite(placeId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(TABLES.FAVORITES)
        .select('id')
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', placeId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking favorite status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Failed to check favorite status:', error);
      return false;
    }
  }

  /**
   * Update favorite shop notes
   */
  async updateFavoriteNotes(placeId: string, notes: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.FAVORITES)
        .update({ personal_notes: notes })
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', placeId);

      if (error) {
        console.error('Error updating favorite notes:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update favorite notes:', error);
      throw error;
    }
  }

  /**
   * Update favorite shop tags
   */
  async updateFavoriteTags(placeId: string, tags: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.FAVORITES)
        .update({ tags })
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', placeId);

      if (error) {
        console.error('Error updating favorite tags:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to update favorite tags:', error);
      throw error;
    }
  }

  /**
   * Get visit history for current user
   */
  async getVisitHistory(): Promise<VisitHistory[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.VISIT_HISTORY)
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('visit_date', { ascending: false });

      if (error) {
        console.error('Error fetching visit history:', error);
        throw error;
      }

      return this.transformDatabaseVisitsToApp(data || []);
    } catch (error) {
      console.error('Failed to get visit history:', error);
      return [];
    }
  }

  /**
   * Add visit record
   */
  async addVisit(visit: Omit<VisitHistory, 'visitDate' | 'id' | 'user_id' | 'created_at'> & { 
    visitDate?: Date;
    shop_name?: string; 
  }): Promise<void> {
    try {
      const visitData: Omit<DatabaseVisitHistory, 'id' | 'created_at'> = {
        user_id: DEMO_USER_ID,
        place_id: visit.placeId,
        shop_name: visit.shop_name || 'Unknown Shop',
        visit_date: (visit.visitDate || new Date()).toISOString(),
        rating: visit.rating || null,
        notes: visit.notes || null,
        photos: visit.photos || null
      };

      const { error } = await supabase
        .from(TABLES.VISIT_HISTORY)
        .insert(visitData);

      if (error) {
        console.error('Error adding visit:', error);
        throw error;
      }

      // Update visit count in favorites if shop is favorited
      await this.updateVisitCount(visit.placeId);
    } catch (error) {
      console.error('Failed to add visit:', error);
      throw error;
    }
  }

  /**
   * Get visits for specific shop
   */
  async getShopVisits(placeId: string): Promise<VisitHistory[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.VISIT_HISTORY)
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', placeId)
        .order('visit_date', { ascending: false });

      if (error) {
        console.error('Error fetching shop visits:', error);
        return [];
      }

      return this.transformDatabaseVisitsToApp(data || []);
    } catch (error) {
      console.error('Failed to get shop visits:', error);
      return [];
    }
  }

  /**
   * Get favorites sorted by various criteria
   */
  async getFavoritesSorted(sortBy: 'recent' | 'rating' | 'name' | 'visits' = 'recent'): Promise<FavoriteShop[]> {
    try {
      let orderColumn: string;
      let ascending = false;

      switch (sortBy) {
        case 'recent':
          orderColumn = 'saved_at';
          break;
        case 'rating':
          orderColumn = 'rating';
          break;
        case 'name':
          orderColumn = 'name';
          ascending = true;
          break;
        case 'visits':
          orderColumn = 'visit_count';
          break;
        default:
          orderColumn = 'saved_at';
      }

      const { data, error } = await supabase
        .from(TABLES.FAVORITES)
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order(orderColumn, { ascending });

      if (error) {
        console.error('Error fetching sorted favorites:', error);
        return [];
      }

      return this.transformDatabaseFavoritesToApp(data || []);
    } catch (error) {
      console.error('Failed to get sorted favorites:', error);
      return [];
    }
  }

  /**
   * Update visit count for favorite shop
   */
  private async updateVisitCount(placeId: string): Promise<void> {
    try {
      const { count, error: countError } = await supabase
        .from(TABLES.VISIT_HISTORY)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', placeId);

      if (countError) {
        console.error('Error counting visits:', countError);
        return;
      }

      const { error: updateError } = await supabase
        .from(TABLES.FAVORITES)
        .update({ 
          visit_count: count || 0,
          last_visit: new Date().toISOString()
        })
        .eq('user_id', DEMO_USER_ID)
        .eq('place_id', placeId);

      if (updateError) {
        console.error('Error updating visit count:', updateError);
      }
    } catch (error) {
      console.error('Failed to update visit count:', error);
    }
  }

  /**
   * Transform database favorites to app format
   */
  private transformDatabaseFavoritesToApp(favorites: DatabaseFavorite[]): FavoriteShop[] {
    return favorites.map(fav => ({
      id: fav.id,
      user_id: fav.user_id,
      placeId: fav.place_id,
      name: fav.name,
      address: fav.address,
      rating: fav.rating,
      savedAt: new Date(fav.saved_at),
      personal_notes: fav.personal_notes || undefined,
      visitCount: fav.visit_count,
      lastVisit: fav.last_visit ? new Date(fav.last_visit) : undefined,
      tags: fav.tags || undefined,
      created_at: new Date(fav.created_at)
    }));
  }

  /**
   * Transform database visits to app format
   */
  private transformDatabaseVisitsToApp(visits: DatabaseVisitHistory[]): VisitHistory[] {
    return visits.map(visit => ({
      id: visit.id,
      user_id: visit.user_id,
      placeId: visit.place_id,
      shop_name: visit.shop_name,
      visitDate: new Date(visit.visit_date),
      rating: visit.rating || undefined,
      notes: visit.notes || undefined,
      photos: visit.photos || undefined,
      created_at: new Date(visit.created_at)
    }));
  }

  /**
   * Export user data for backup/migration
   */
  async exportUserData(): Promise<{ favorites: FavoriteShop[]; visits: VisitHistory[] }> {
    const [favorites, visits] = await Promise.all([
      this.getFavorites(),
      this.getVisitHistory()
    ]);

    return { favorites, visits };
  }

  /**
   * Clear all user data
   */
  async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        supabase.from(TABLES.FAVORITES).delete().eq('user_id', DEMO_USER_ID),
        supabase.from(TABLES.VISIT_HISTORY).delete().eq('user_id', DEMO_USER_ID)
      ]);
    } catch (error) {
      console.error('Failed to clear user data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseFavoritesService = new SupabaseFavoritesService();