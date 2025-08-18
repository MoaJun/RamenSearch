/**
 * Supabase Favorites Service - New Implementation
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

export class SupabaseFavoritesServiceNew {
  private supabase: SupabaseClient;
  private userId: string = 'ramensearch_user';

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

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

  async getFavorites(): Promise<FavoriteShop[]> {
    try {
      const { data, error } = await this.supabase
        .from('favorites')
        .select('*')
        .eq('user_id', this.userId)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.dbFavoriteToApp);
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  }

  async addToFavorites(shop: RamenShop): Promise<void> {
    try {
      const existing = await this.isFavorite(shop.placeId);
      if (existing) return;

      const { error } = await this.supabase
        .from('favorites')
        .insert({
          user_id: this.userId,
          place_id: shop.placeId,
          name: shop.name,
          address: shop.address,
          rating: shop.rating,
          visit_count: 0,
          personal_notes: '',
          tags: []
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      throw error;
    }
  }

  async removeFromFavorites(placeId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('favorites')
        .delete()
        .eq('user_id', this.userId)
        .eq('place_id', placeId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      throw error;
    }
  }

  async isFavorite(placeId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('favorites')
        .select('id')
        .eq('user_id', this.userId)
        .eq('place_id', placeId)
        .single();

      if (error && error.code !== 'PGRST116') return false;
      return !!data;
    } catch (error) {
      return false;
    }
  }

  async getVisitHistory(): Promise<VisitHistory[]> {
    try {
      const { data, error } = await this.supabase
        .from('visit_history')
        .select('*')
        .eq('user_id', this.userId)
        .order('visit_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []).map(this.dbVisitToApp);
    } catch (error) {
      console.error('Failed to get visit history:', error);
      return [];
    }
  }

  async addVisit(visit: Omit<VisitHistory, 'visitDate' | 'id' | 'user_id' | 'created_at'> & { visitDate?: Date }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('visit_history')
        .insert({
          user_id: this.userId,
          place_id: visit.placeId,
          shop_name: visit.shop_name,
          visit_date: (visit.visitDate || new Date()).toISOString(),
          rating: visit.rating || null,
          notes: visit.notes || '',
          photos: visit.photos || []
        });

      if (error) throw error;
      await this.updateVisitCount(visit.placeId);
    } catch (error) {
      console.error('Failed to add visit:', error);
      throw error;
    }
  }

  private async updateVisitCount(placeId: string): Promise<void> {
    try {
      const { count } = await this.supabase
        .from('visit_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId)
        .eq('place_id', placeId);

      const { data: latestVisit } = await this.supabase
        .from('visit_history')
        .select('visit_date')
        .eq('user_id', this.userId)
        .eq('place_id', placeId)
        .order('visit_date', { ascending: false })
        .limit(1)
        .single();

      await this.supabase
        .from('favorites')
        .update({
          visit_count: count || 0,
          last_visit: latestVisit?.visit_date || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.userId)
        .eq('place_id', placeId);
    } catch (error) {
      console.error('Failed to update visit count:', error);
    }
  }

  async exportUserData(): Promise<{ favorites: FavoriteShop[]; visits: VisitHistory[] }> {
    try {
      const [favorites, visits] = await Promise.all([
        this.getFavorites(),
        this.getVisitHistory()
      ]);
      return { favorites, visits };
    } catch (error) {
      console.error('Failed to export user data:', error);
      return { favorites: [], visits: [] };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('favorites')
        .select('count', { count: 'exact', head: true })
        .eq('user_id', this.userId);

      return !error;
    } catch (error) {
      return false;
    }
  }
}

export const supabaseFavoritesServiceNew = new SupabaseFavoritesServiceNew();