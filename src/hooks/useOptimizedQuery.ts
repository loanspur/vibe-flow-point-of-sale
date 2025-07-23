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

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number }>();

export function useOptimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  dependencies: any[],
  options: QueryOptions = {}
): QueryResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    staleTime = 5 * 60 * 1000, // 5 minutes default
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
      const cached = queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTime) {
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
        queryCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        });
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

  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        executeQuery();
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [executeQuery, refetchOnWindowFocus]);

  return { data, loading, error, refetch };
}

// Clear all cached queries
export const clearQueryCache = () => {
  queryCache.clear();
};

// Clear specific cache entry
export const clearCacheKey = (key: string) => {
  queryCache.delete(key);
};