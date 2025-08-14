/**
 * Persistent cache utility with TTL support
 * localStorage-based cache with automatic expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // TTL in milliseconds
}

export class PersistentCache {
  private prefix: string;

  constructor(prefix: string = 'ramensearch_cache') {
    this.prefix = prefix;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${this.prefix}_${key}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache has expired
      if (now > entry.timestamp + entry.expiresIn) {
        // Clean up expired cache
        localStorage.removeItem(cacheKey);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(key: string, data: T, ttlMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cacheKey = `${this.prefix}_${key}`;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresIn: ttlMs
      };

      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
      
      // Handle quota exceeded error
      if (error instanceof DOMException && error.code === 22) {
        console.warn('localStorage quota exceeded, clearing old cache');
        this.clearExpired();
        
        // Try again after cleanup
        try {
          const cacheKey = `${this.prefix}_${key}`;
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresIn: ttlMs
          };
          localStorage.setItem(cacheKey, JSON.stringify(entry));
        } catch (secondError) {
          console.error('Failed to cache even after cleanup:', secondError);
        }
      }
    }
  }

  /**
   * Remove specific cache entry
   */
  async remove(key: string): Promise<void> {
    const cacheKey = `${this.prefix}_${key}`;
    localStorage.removeItem(cacheKey);
  }

  /**
   * Clear all cache entries with this prefix
   */
  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Clear only expired cache entries
   */
  async clearExpired(): Promise<number> {
    const keysToRemove: string[] = [];
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry<any> = JSON.parse(cached);
            if (now > entry.timestamp + entry.expiresIn) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // Invalid cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; totalSize: number } {
    let totalEntries = 0;
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        totalEntries++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }

    return { totalEntries, totalSize };
  }
}

// Default cache instances
export const geminiCache = new PersistentCache('ramensearch_gemini');
export const placesCache = new PersistentCache('ramensearch_places');