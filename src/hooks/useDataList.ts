import { useState, useMemo, useCallback } from 'react';
import { useOptimizedQuery } from './useOptimizedQuery';
import { useDebounce } from './useDebounce';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DataListOptions {
  tableName: string;
  select?: string;
  orderBy?: string;
  ascending?: boolean;
  searchFields?: string[];
  filters?: Record<string, any>;
  cacheTime?: number;
  enableSearch?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
}

interface DataListResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredData: T[];
  refetch: () => Promise<void>;
  pagination: {
    currentPage: number;
    totalPages: number;
    setPage: (page: number) => void;
    pageSize: number;
    totalItems: number;
  };
}

export function useDataList<T = any>(
  options: DataListOptions
): DataListResult<T> {
  const {
    tableName,
    select = '*',
    orderBy = 'created_at',
    ascending = false,
    searchFields = [],
    filters = {},
    cacheTime = 2 * 60 * 1000, // 2 minutes
    enableSearch = true,
    enablePagination = false,
    pageSize = 10
  } = options;

  const { tenantId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Build query function
  const queryFn = useCallback(async () => {
    if (!tenantId) return { data: [], error: null };

    let query = supabase.from(tableName as any).select(select);

    // Add tenant filter
    query = query.eq('tenant_id', tenantId);

    // Add additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Add search filter
    if (enableSearch && debouncedSearchTerm && searchFields.length > 0) {
      const searchPattern = searchFields
        .map(field => `${field}.ilike.%${debouncedSearchTerm}%`)
        .join(',');
      query = query.or(searchPattern);
    }

    // Add ordering
    query = query.order(orderBy, { ascending });

    // Add pagination if enabled
    if (enablePagination) {
      const offset = (currentPage - 1) * pageSize;
      query = query.range(offset, offset + pageSize - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [], error: null };
  }, [
    tenantId,
    tableName,
    select,
    filters,
    debouncedSearchTerm,
    searchFields,
    orderBy,
    ascending,
    enableSearch,
    enablePagination,
    currentPage,
    pageSize
  ]);

  // Use optimized query
  const { data: queryResult, loading, error, refetch } = useOptimizedQuery(
    queryFn,
    [tenantId, debouncedSearchTerm, currentPage, JSON.stringify(filters)],
    {
      enabled: !!tenantId,
      staleTime: cacheTime,
      cacheKey: `${tableName}-${tenantId}-${debouncedSearchTerm}-${currentPage}-${JSON.stringify(filters)}`
    }
  );

  const data = queryResult?.data || [];

  // Memoized filtered data for client-side filtering when pagination is disabled
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!enableSearch || enablePagination) return data;
    if (!debouncedSearchTerm || searchFields.length === 0) return data;

    return data.filter((item: any) =>
      searchFields.some(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], item);
        return value?.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      })
    );
  }, [data, debouncedSearchTerm, searchFields, enableSearch, enablePagination]);

  // Calculate pagination info
  const totalItems = data?.length || 0;
  const totalPages = enablePagination ? Math.ceil(totalItems / pageSize) : 1;

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return {
    data,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filteredData,
    refetch,
    pagination: {
      currentPage,
      totalPages,
      setPage,
      pageSize,
      totalItems
    }
  };
}