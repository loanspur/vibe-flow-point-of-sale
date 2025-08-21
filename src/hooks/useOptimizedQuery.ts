import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number; // in milliseconds
  cacheKey?: string;
}

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Enhanced cache with size limits and TTL
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 50; // Limit cache size

  get(key: string, staleTime: number): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < staleTime) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove stale entries
    }
    return null;
  }

  set(key: string, data: any): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const queryCache = new QueryCache();

export function useOptimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  dependencies: any[],
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false, // Always false for performance
    staleTime = 10 * 60 * 1000, // Increased to 10 minutes for better caching
    cacheKey
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    if (cacheKey) {
      const cached = queryCache.get(cacheKey, staleTime);
      if (cached) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      if (result.error) {
        throw new Error(result.error.message || 'Query failed');
      }

      setData(result.data);
      
      // Cache the result
      if (cacheKey && result.data) {
        queryCache.set(cacheKey, result.data);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, queryFn, staleTime, cacheKey]);

  const refetch = useCallback(async () => {
    // Clear cache for this key
    if (cacheKey) {
      queryCache.delete(cacheKey);
    }
    await executeQuery();
  }, [executeQuery, cacheKey]);

  useEffect(() => {
    executeQuery();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  // Window focus refresh disabled for performance optimization
  // This was causing excessive re-fetching when switching browser tabs

  return { data, loading, error, refetch };
}

// Clear all cached queries - including any malformed ones
export const clearQueryCache = () => {
  queryCache.clear();
  // Also clear any browser cached requests
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('supabase') || name.includes('products')) {
          caches.delete(name);
        }
      });
    });
  }
};

// Clear specific cache entry
export const clearCacheKey = (key: string) => {
  queryCache.delete(key);
};

// Get cache stats
export const getCacheStats = () => ({
  size: queryCache.size(),
  maxSize: 50
});