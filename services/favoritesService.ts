/**
 * Favorites and Visit History Service
 * Manages user's favorite shops and visit history using localStorage
 */

import { FavoriteShop, VisitHistory, RamenShop } from '../types';
import { PersistentCache } from '../utils/persistentCache';

// Cache instances for favorites and visits
const favoritesCache = new PersistentCache('ramensearch_favorites');
const visitsCache = new PersistentCache('ramensearch_visits');

// Cache keys
const FAVORITES_KEY = 'user_favorites';
const VISITS_KEY = 'user_visits';

// Cache TTL (never expire for user data)
const USER_DATA_TTL = 365 * 24 * 60 * 60 * 1000; // 1 year

export class FavoritesService {
  /**
   * Get all favorite shops
   */
  async getFavorites(): Promise<FavoriteShop[]> {
    const favorites = await favoritesCache.get<FavoriteShop[]>(FAVORITES_KEY);
    if (!favorites) return [];

    // Convert date strings back to Date objects
    return favorites.map(fav => ({
      ...fav,
      savedAt: new Date(fav.savedAt),
      lastVisit: fav.lastVisit ? new Date(fav.lastVisit) : undefined
    }));
  }

  /**
   * Add shop to favorites
   */
  async addToFavorites(shop: RamenShop): Promise<void> {
    const favorites = await this.getFavorites();
    
    // Check if already exists
    const existingIndex = favorites.findIndex(fav => fav.placeId === shop.placeId);
    if (existingIndex !== -1) {
      console.log('Shop is already in favorites');
      return;
    }

    const favoriteShop: FavoriteShop = {
      placeId: shop.placeId,
      name: shop.name,
      address: shop.address,
      rating: shop.rating,
      savedAt: new Date(),
      visitCount: 0
    };

    favorites.push(favoriteShop);
    await favoritesCache.set(FAVORITES_KEY, favorites, USER_DATA_TTL);
  }

  /**
   * Remove shop from favorites
   */
  async removeFromFavorites(placeId: string): Promise<void> {
    const favorites = await this.getFavorites();
    const filteredFavorites = favorites.filter(fav => fav.placeId !== placeId);
    await favoritesCache.set(FAVORITES_KEY, filteredFavorites, USER_DATA_TTL);
  }

  /**
   * Check if shop is in favorites
   */
  async isFavorite(placeId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some(fav => fav.placeId === placeId);
  }

  /**
   * Update favorite shop notes
   */
  async updateFavoriteNotes(placeId: string, notes: string): Promise<void> {
    const favorites = await this.getFavorites();
    const favoriteIndex = favorites.findIndex(fav => fav.placeId === placeId);
    
    if (favoriteIndex === -1) {
      throw new Error('Shop not found in favorites');
    }

    favorites[favoriteIndex].personalNotes = notes;
    await favoritesCache.set(FAVORITES_KEY, favorites, USER_DATA_TTL);
  }

  /**
   * Update favorite shop tags
   */
  async updateFavoriteTags(placeId: string, tags: string[]): Promise<void> {
    const favorites = await this.getFavorites();
    const favoriteIndex = favorites.findIndex(fav => fav.placeId === placeId);
    
    if (favoriteIndex === -1) {
      throw new Error('Shop not found in favorites');
    }

    favorites[favoriteIndex].tags = tags;
    await favoritesCache.set(FAVORITES_KEY, favorites, USER_DATA_TTL);
  }

  /**
   * Get visit history
   */
  async getVisitHistory(): Promise<VisitHistory[]> {
    const visits = await visitsCache.get<VisitHistory[]>(VISITS_KEY);
    if (!visits) return [];

    // Convert date strings back to Date objects
    return visits.map(visit => ({
      ...visit,
      visitDate: new Date(visit.visitDate)
    })).sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime());
  }

  /**
   * Add visit record
   */
  async addVisit(visit: Omit<VisitHistory, 'visitDate'> & { visitDate?: Date }): Promise<void> {
    const visits = await this.getVisitHistory();
    
    const newVisit: VisitHistory = {
      ...visit,
      visitDate: visit.visitDate || new Date()
    };

    visits.unshift(newVisit); // Add to beginning (most recent first)

    // Keep only last 100 visits to prevent storage bloat
    const trimmedVisits = visits.slice(0, 100);
    await visitsCache.set(VISITS_KEY, trimmedVisits, USER_DATA_TTL);

    // Update visit count in favorites if shop is favorited
    await this.updateVisitCount(visit.placeId);
  }

  /**
   * Update visit count for favorite shop
   */
  private async updateVisitCount(placeId: string): Promise<void> {
    const favorites = await this.getFavorites();
    const favoriteIndex = favorites.findIndex(fav => fav.placeId === placeId);
    
    if (favoriteIndex !== -1) {
      const visits = await this.getVisitHistory();
      const visitCount = visits.filter(v => v.placeId === placeId).length;
      
      favorites[favoriteIndex].visitCount = visitCount;
      favorites[favoriteIndex].lastVisit = new Date();
      
      await favoritesCache.set(FAVORITES_KEY, favorites, USER_DATA_TTL);
    }
  }

  /**
   * Get visits for specific shop
   */
  async getShopVisits(placeId: string): Promise<VisitHistory[]> {
    const visits = await this.getVisitHistory();
    return visits.filter(visit => visit.placeId === placeId);
  }

  /**
   * Get favorite shops sorted by various criteria
   */
  async getFavoritesSorted(sortBy: 'recent' | 'rating' | 'name' | 'visits' = 'recent'): Promise<FavoriteShop[]> {
    const favorites = await this.getFavorites();
    
    switch (sortBy) {
      case 'recent':
        return favorites.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
      case 'rating':
        return favorites.sort((a, b) => b.rating - a.rating);
      case 'name':
        return favorites.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      case 'visits':
        return favorites.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
      default:
        return favorites;
    }
  }

  /**
   * Export user data (for backup/transfer)
   */
  async exportUserData(): Promise<{ favorites: FavoriteShop[]; visits: VisitHistory[] }> {
    const [favorites, visits] = await Promise.all([
      this.getFavorites(),
      this.getVisitHistory()
    ]);

    return { favorites, visits };
  }

  /**
   * Import user data (for backup/transfer)
   */
  async importUserData(data: { favorites: FavoriteShop[]; visits: VisitHistory[] }): Promise<void> {
    if (data.favorites) {
      await favoritesCache.set(FAVORITES_KEY, data.favorites, USER_DATA_TTL);
    }
    if (data.visits) {
      await visitsCache.set(VISITS_KEY, data.visits, USER_DATA_TTL);
    }
  }

  /**
   * Clear all user data
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      favoritesCache.clear(),
      visitsCache.clear()
    ]);
  }
}

// Export singleton instance
export const favoritesService = new FavoritesService();