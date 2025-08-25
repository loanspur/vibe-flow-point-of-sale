/**
 * Enhanced Performance Cache System for Phase 4
 * Provides intelligent caching with TTL, memory management, and performance optimization
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
}

interface CacheOptions {
  maxSize?: number; // Maximum number of entries
  maxMemory?: number; // Maximum memory usage in bytes
  defaultTTL?: number; // Default time to live in milliseconds
  cleanupInterval?: number; // Cleanup interval in milliseconds
  enableCompression?: boolean; // Enable data compression
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
  hitRate: number;
  evictions: number;
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    memoryUsage: 0,
    hitRate: 0,
    evictions: 0,
  };

  private options: Required<CacheOptions> = {
    maxSize: 1000,
    maxMemory: 50 * 1024 * 1024, // 50MB default
    defaultTTL: 5 * 60 * 1000, // 5 minutes default
    cleanupInterval: 60 * 1000, // 1 minute cleanup interval
    enableCompression: false,
  };

  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.options = { ...this.options, ...options };
    this.startCleanupTimer();
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.estimateSize(data),
    };

    // Check if we need to evict entries before adding
    this.ensureCapacity(entry.size);

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
    this.stats.memoryUsage += entry.size;
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.memoryUsage -= entry.size;
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return true;
    }
    return false;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.memoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get memory usage in bytes
   */
  memoryUsage(): number {
    return this.stats.memoryUsage;
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Estimate memory size of data
   */
  private estimateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch {
      // Fallback estimation
      return 1024; // 1KB default
    }
  }

  /**
   * Ensure cache capacity before adding new entry
   */
  private ensureCapacity(newEntrySize: number): void {
    const maxMemory = this.options.maxMemory;
    const maxSize = this.options.maxSize;

    // Check memory limit
    while (this.stats.memoryUsage + newEntrySize > maxMemory && this.cache.size > 0) {
      this.evictLRU();
    }

    // Check size limit
    while (this.cache.size >= maxSize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Create specialized cache instances
export const dashboardCache = new PerformanceCache({
  maxSize: 100,
  maxMemory: 10 * 1024 * 1024, // 10MB
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  cleanupInterval: 30 * 1000, // 30 seconds
});

export const queryCache = new PerformanceCache({
  maxSize: 500,
  maxMemory: 25 * 1024 * 1024, // 25MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000, // 1 minute
});

export const userCache = new PerformanceCache({
  maxSize: 200,
  maxMemory: 5 * 1024 * 1024, // 5MB
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 2 * 60 * 1000, // 2 minutes
});

// Cache utilities
export const cacheUtils = {
  /**
   * Generate cache key from parameters
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  },

  /**
   * Cache function results
   */
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    cache: PerformanceCache,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : cacheUtils.generateKey(fn.name, { args: JSON.stringify(args) });

      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },

  /**
   * Batch cache operations
   */
  batchGet<T>(cache: PerformanceCache, keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
      results.set(key, cache.get<T>(key));
    }
    
    return results;
  },

  /**
   * Batch set cache operations
   */
  batchSet<T>(cache: PerformanceCache, entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      cache.set(key, value, ttl);
    }
  },

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics(): Record<string, CacheStats> {
    return {
      dashboard: dashboardCache.getStats(),
      query: queryCache.getStats(),
      user: userCache.getStats(),
    };
  },

  /**
   * Clear all caches
   */
  clearAll(): void {
    dashboardCache.clear();
    queryCache.clear();
    userCache.clear();
  },

  /**
   * Destroy all caches
   */
  destroyAll(): void {
    dashboardCache.destroy();
    queryCache.destroy();
    userCache.destroy();
  },
};

// Export the main cache class
export { PerformanceCache };

// Export cache instances
export const caches = {
  dashboard: dashboardCache,
  query: queryCache,
  user: userCache,
};
