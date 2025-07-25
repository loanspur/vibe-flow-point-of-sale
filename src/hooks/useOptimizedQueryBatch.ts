import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BatchQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheKey?: string;
  refetchOnWindowFocus?: boolean;
}

interface BatchQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Enhanced cache with TTL and size limits
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 100;

  get(key: string, staleTime: number): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < staleTime) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: any): void {
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
}

const batchQueryCache = new QueryCache();

// Batch multiple queries into a single hook
export function useOptimizedQueryBatch<T>(
  queries: Record<string, () => Promise<{ data: any; error: any }>>,
  dependencies: any[],
  options: BatchQueryOptions = {}
): BatchQueryResult<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    cacheKey,
    refetchOnWindowFocus = false
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeQueries = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    if (cacheKey) {
      const cached = batchQueryCache.get(cacheKey, staleTime);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    // Cancel previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // Execute all queries in parallel
      const results = await Promise.allSettled(
        Object.entries(queries).map(async ([key, queryFn]) => {
          const result = await queryFn();
          if (result.error) {
            throw new Error(`${key}: ${result.error.message || 'Query failed'}`);
          }
          return [key, result.data];
        })
      );

      // Process results
      const combinedData: any = {};
      const errors: string[] = [];

      results.forEach((result, index) => {
        const key = Object.keys(queries)[index];
        if (result.status === 'fulfilled') {
          combinedData[key] = result.value[1];
        } else {
          errors.push(`${key}: ${result.reason.message}`);
        }
      });

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      setData(combinedData as T);

      // Cache the result
      if (cacheKey) {
        batchQueryCache.set(cacheKey, combinedData);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, queries, staleTime, cacheKey]);

  const refetch = useCallback(async () => {
    if (cacheKey) {
      batchQueryCache.delete(cacheKey);
    }
    await executeQueries();
  }, [executeQueries, cacheKey]);

  useEffect(() => {
    executeQueries();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executeQueries();
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [executeQueries, refetchOnWindowFocus]);

  return { data, loading, error, refetch };
}

// Clear all cached batch queries
export const clearBatchQueryCache = () => {
  batchQueryCache.clear();
};

// Clear specific cache entry
export const clearBatchCacheKey = (key: string) => {
  batchQueryCache.delete(key);
};