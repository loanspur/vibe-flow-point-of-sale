import { useCallback } from 'react';
import { useCrudOperations } from './useCrudOperations';
import { useUnifiedFetch } from './useUnifiedDataFetching';
import { useLoadingStates } from './useCommonState';
import { performanceUtils } from '@/lib/performance-config';

interface OptimizedCrudOptions {
  tableName: string;
  entityName: string;
  enableDeletionControl?: boolean;
  cacheTime?: number;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
}

/**
 * Optimized CRUD operations with unified data fetching and performance optimizations
 */
export function useOptimizedCrud<T = any>(options: OptimizedCrudOptions) {
  const {
    tableName,
    entityName,
    enableDeletionControl = false,
    cacheTime = 5 * 60 * 1000,
    select = '*',
    orderBy = { column: 'created_at', ascending: false }
  } = options;

  const { loading, setLoadingState } = useLoadingStates();

  // Unified data fetching with caching
  const {
    data,
    loading: fetchLoading,
    error: fetchError,
    refetch
  } = useUnifiedFetch<T>(tableName, {
    select,
    orderBy,
    cacheTime,
    enabled: true
  });

  // CRUD operations
  const {
    create,
    update,
    remove,
    bulkDelete,
    creating,
    updating,
    deleting,
    canDelete
  } = useCrudOperations<T>({
    tableName,
    entityName,
    enableDeletionControl,
    onSuccess: (action) => {
      // Refresh data after successful operations
      if (action === 'create' || action === 'update' || action === 'delete') {
        refetch();
      }
    }
  });

  // Optimized create with immediate UI update
  const optimizedCreate = useCallback(async (data: Partial<T>) => {
    setLoadingState('creating', true);
    try {
      const result = await create(data);
      // Immediate refetch for consistency
      await refetch();
      return result;
    } finally {
      setLoadingState('creating', false);
    }
  }, [create, refetch, setLoadingState]);

  // Optimized update with immediate UI update
  const optimizedUpdate = useCallback(async (id: string, data: Partial<T>) => {
    setLoadingState('updating', true);
    try {
      const result = await update(id, data);
      // Immediate refetch for consistency
      await refetch();
      return result;
    } finally {
      setLoadingState('updating', false);
    }
  }, [update, refetch, setLoadingState]);

  // Optimized delete with immediate UI update
  const optimizedDelete = useCallback(async (id: string, itemName?: string) => {
    setLoadingState('deleting', true);
    try {
      const result = await remove(id, itemName);
      // Immediate refetch for consistency
      await refetch();
      return result;
    } finally {
      setLoadingState('deleting', false);
    }
  }, [remove, refetch, setLoadingState]);

  // Bulk operations with batch processing
  const optimizedBulkDelete = useCallback(async (ids: string[]) => {
    setLoadingState('deleting', true);
    try {
      const result = await bulkDelete(ids);
      // Immediate refetch for consistency
      await refetch();
      return result;
    } finally {
      setLoadingState('deleting', false);
    }
  }, [bulkDelete, refetch, setLoadingState]);

  return {
    // Data
    data: data || [],
    loading: fetchLoading || loading,
    error: fetchError,
    
    // Actions
    create: optimizedCreate,
    update: optimizedUpdate,
    delete: optimizedDelete,
    bulkDelete: optimizedBulkDelete,
    refetch,
    
    // States
    creating,
    updating,
    deleting,
    canDelete,
    
    // Performance utilities
    clearCache: () => {
      // Clear specific cache for this table
      const cacheKey = `${tableName}-*`;
      // Implementation depends on cache structure
    }
  };
}