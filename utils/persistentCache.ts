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
/**
 * Advanced IndexedDB-based cache system with LRU eviction
 * Provides robust caching for Google Maps API responses with intelligent storage management
 */

interface IndexedDBCacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  version: number;
}

interface CacheConfig {
  dbName: string;
  storeName: string;
  version: number;
  maxEntries: number;
  maxSizeBytes: number;
  defaultTTL: number;
}

export class AdvancedIndexedDBCache {
  private config: CacheConfig;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      dbName: 'ramensearch_cache_db',
      storeName: 'cache_entries',
      version: 1,
      maxEntries: 1000,
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };
  }

  /**
   * Initialize IndexedDB connection
   */
  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        console.error('IndexedDB cache initialization failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB cache initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, { keyPath: 'key' });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          store.createIndex('accessCount', 'accessCount', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get cached data with LRU tracking
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.init();
      if (!this.db) return null;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry: IndexedDBCacheEntry<T> | undefined = request.result;
          
          if (!entry) {
            resolve(null);
            return;
          }

          const now = Date.now();
          
          // Check if expired
          if (now > entry.expiresAt) {
            // Delete expired entry
            store.delete(key);
            resolve(null);
            return;
          }

          // Update access statistics for LRU
          entry.lastAccessed = now;
          entry.accessCount++;
          
          // Update the entry with new access stats
          store.put(entry);
          
          resolve(entry.data);
        };

        request.onerror = () => {
          console.warn(`IndexedDB cache get error for key ${key}:`, request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.warn(`IndexedDB cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with intelligent storage management
   */
  async set<T>(key: string, data: T, ttlMs: number = this.config.defaultTTL): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      const now = Date.now();
      const serializedSize = new Blob([JSON.stringify(data)]).size;

      // Check if we need to make space
      await this.ensureCapacity(serializedSize);

      const entry: IndexedDBCacheEntry<T> = {
        key,
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
        accessCount: 1,
        lastAccessed: now,
        size: serializedSize,
        version: this.config.version
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn(`IndexedDB cache set error for key ${key}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn(`IndexedDB cache set error for key ${key}:`, error);
    }
  }

  /**
   * Ensure we have enough capacity for new data using LRU eviction
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const stats = await this.getStats();
    
    // Check if we exceed size or entry limits
    if (stats.totalSize + newEntrySize > this.config.maxSizeBytes || 
        stats.totalEntries >= this.config.maxEntries) {
      
      console.log('Cache capacity exceeded, performing LRU eviction');
      await this.performLRUEviction(newEntrySize);
    }
  }

  /**
   * Perform LRU eviction to make space
   */
  private async performLRUEviction(spaceNeeded: number): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index('lastAccessed');
      const request = index.openCursor(); // Opens in ascending order (oldest first)

      let freedSpace = 0;
      let evictedCount = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor && (freedSpace < spaceNeeded || evictedCount < 10)) {
          const entry: IndexedDBCacheEntry<any> = cursor.value;
          
          // Delete the entry
          cursor.delete();
          
          freedSpace += entry.size;
          evictedCount++;
          
          console.log(`Evicted cache entry: ${entry.key} (${entry.size} bytes)`);
          
          cursor.continue();
        } else {
          console.log(`LRU eviction complete: ${evictedCount} entries, ${freedSpace} bytes freed`);
          resolve();
        }
      };

      request.onerror = () => {
        console.error('LRU eviction failed:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Remove specific cache entry
   */
  async remove(key: string): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn(`IndexedDB cache remove error for key ${key}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn(`IndexedDB cache remove error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('IndexedDB cache cleared successfully');
          resolve();
        };
        request.onerror = () => {
          console.error('IndexedDB cache clear failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('IndexedDB cache clear error:', error);
    }
  }

  /**
   * Clear expired entries only
   */
  async clearExpired(): Promise<number> {
    try {
      await this.init();
      if (!this.db) return 0;

      const now = Date.now();
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        const index = store.index('expiresAt');
        const range = IDBKeyRange.upperBound(now);
        const request = index.openCursor(range);

        let expiredCount = 0;

        request.onsuccess = () => {
          const cursor = request.result;
          
          if (cursor) {
            cursor.delete();
            expiredCount++;
            cursor.continue();
          } else {
            console.log(`Cleared ${expiredCount} expired cache entries`);
            resolve(expiredCount);
          }
        };

        request.onerror = () => {
          console.error('Clear expired entries failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('IndexedDB clear expired error:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
    averageAccessCount: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      await this.init();
      if (!this.db) {
        return {
          totalEntries: 0,
          totalSize: 0,
          expiredEntries: 0,
          averageAccessCount: 0,
          oldestEntry: 0,
          newestEntry: 0
        };
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.config.storeName], 'readonly');
        const store = transaction.objectStore(this.config.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries: IndexedDBCacheEntry<any>[] = request.result;
          const now = Date.now();
          
          let totalSize = 0;
          let totalAccessCount = 0;
          let expiredEntries = 0;
          let oldestEntry = now;
          let newestEntry = 0;

          entries.forEach(entry => {
            totalSize += entry.size;
            totalAccessCount += entry.accessCount;
            
            if (now > entry.expiresAt) {
              expiredEntries++;
            }
            
            if (entry.timestamp < oldestEntry) {
              oldestEntry = entry.timestamp;
            }
            
            if (entry.timestamp > newestEntry) {
              newestEntry = entry.timestamp;
            }
          });

          resolve({
            totalEntries: entries.length,
            totalSize,
            expiredEntries,
            averageAccessCount: entries.length > 0 ? totalAccessCount / entries.length : 0,
            oldestEntry,
            newestEntry
          });
        };

        request.onerror = () => {
          console.error('Get cache stats failed:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('IndexedDB get stats error:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0,
        averageAccessCount: 0,
        oldestEntry: 0,
        newestEntry: 0
      };
    }
  }

  /**
   * Maintenance function to optimize cache
   */
  async performMaintenance(): Promise<void> {
    console.log('Performing cache maintenance...');
    
    const expiredCount = await this.clearExpired();
    const stats = await this.getStats();
    
    console.log(`Cache maintenance complete:
      - Cleared ${expiredCount} expired entries
      - Total entries: ${stats.totalEntries}
      - Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB
      - Average access count: ${stats.averageAccessCount.toFixed(1)}`);
  }
}

// Create global advanced cache instance
export const advancedCache = new AdvancedIndexedDBCache({
  dbName: 'ramensearch_advanced_cache',
  storeName: 'google_maps_cache',
  maxEntries: 2000,
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days for Google Maps data
});
