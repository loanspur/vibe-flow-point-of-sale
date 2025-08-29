import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePagination, PaginationState } from '@/components/ui/pagination-controls';

interface PaginatedQueryOptions {
  enabled?: boolean;
  searchTerm?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending: boolean };
  initialPageSize?: number;
}

interface PaginatedQueryResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pagination: PaginationState;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  refetch: () => Promise<void>;
  resetPagination: () => void;
}

export function usePaginatedQuery<T>(
  tableName: string,
  selectClause: string = '*',
  options: PaginatedQueryOptions = {}
): PaginatedQueryResult<T> {
  const {
    enabled = true,
    searchTerm = '',
    filters = {},
    orderBy = { column: 'created_at', ascending: false },
    initialPageSize = 50
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    pagination,
    updatePagination,
    handlePageChange,
    handlePageSizeChange,
    getSupabaseRange,
    resetPagination
  } = usePagination(initialPageSize);

  // Ensure pagination is always defined
  const safePagination = pagination || { page: 1, pageSize: initialPageSize, total: 0 };

  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError(null);

    try {
      const { from, to } = getSupabaseRange();
      
      // Build query with proper typing
      let query = supabase
        .from(tableName as any)
        .select(selectClause, { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Apply search if provided
      if (searchTerm && searchTerm.trim()) {
        // This is a basic search - you may want to customize per table
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      // Apply ordering
      query = query.order(orderBy.column, { ascending: orderBy.ascending });

      // Apply pagination
      query = query.range(from, to);

      const { data: results, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      setData((results as T[]) || []);
      updatePagination({ total: count || 0 });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err);
        console.error(`Error fetching ${tableName}:`, err);
      }
    } finally {
      setLoading(false);
    }
  }, [
    enabled,
    tableName,
    selectClause,
    searchTerm,
    JSON.stringify(filters),
    orderBy.column,
    orderBy.ascending,
    getSupabaseRange,
    updatePagination
  ]);

  // Execute query when dependencies change - with debouncing to prevent excessive calls
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const runQuery = async () => {
      if (isMounted) {
        await executeQuery();
      }
    };
    
    // Debounce the query execution to prevent rapid successive calls
    timeoutId = setTimeout(runQuery, 100);
    
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeQuery]);

  // Reset to first page when search term or filters change
  useEffect(() => {
    if (pagination.page > 1) {
      handlePageChange(1);
    }
  }, [searchTerm, JSON.stringify(filters), handlePageChange]);

  const refetch = useCallback(async () => {
    await executeQuery();
  }, [executeQuery]);

  return {
    data,
    loading,
    error,
    pagination: safePagination,
    handlePageChange,
    handlePageSizeChange,
    refetch,
    resetPagination
  };
}