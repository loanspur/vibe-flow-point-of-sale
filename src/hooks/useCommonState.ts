import { useState, useCallback } from 'react';

/**
 * Unified state management patterns for common UI states
 */

// Common loading states hook
export function useLoadingStates() {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setLoadingState = useCallback((type: 'loading' | 'creating' | 'updating' | 'deleting' | 'submitting', value: boolean) => {
    switch (type) {
      case 'loading':
        setLoading(value);
        break;
      case 'creating':
        setCreating(value);
        break;
      case 'updating':
        setUpdating(value);
        break;
      case 'deleting':
        setDeleting(value);
        break;
      case 'submitting':
        setSubmitting(value);
        break;
    }
  }, []);

  const resetAllStates = useCallback(() => {
    setLoading(false);
    setCreating(false);
    setUpdating(false);
    setDeleting(false);
    setSubmitting(false);
  }, []);

  return {
    loading,
    creating,
    updating,
    deleting,
    submitting,
    setLoadingState,
    resetAllStates,
    isAnyLoading: loading || creating || updating || deleting || submitting
  };
}

// Common dialog states hook
export function useDialogStates() {
  const [dialogs, setDialogs] = useState<Record<string, boolean>>({});

  const setDialogOpen = useCallback((dialogName: string, open: boolean) => {
    setDialogs(prev => ({ ...prev, [dialogName]: open }));
  }, []);

  const closeAllDialogs = useCallback(() => {
    setDialogs({});
  }, []);

  const isDialogOpen = useCallback((dialogName: string) => {
    return dialogs[dialogName] || false;
  }, [dialogs]);

  return {
    setDialogOpen,
    closeAllDialogs,
    isDialogOpen
  };
}

// Common selection states hook
export function useSelectionState<T>() {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
    setSelectedItems([]);
  }, []);

  const selectItem = useCallback((item: T) => {
    setSelectedItem(item);
  }, []);

  const toggleItemSelection = useCallback((item: T, getId: (item: T) => string) => {
    const id = getId(item);
    setSelectedItems(prev => {
      const exists = prev.find(i => getId(i) === id);
      if (exists) {
        return prev.filter(i => getId(i) !== id);
      } else {
        return [...prev, item];
      }
    });
  }, []);

  const selectAllItems = useCallback((items: T[]) => {
    setSelectedItems(items);
  }, []);

  return {
    selectedItem,
    selectedItems,
    setSelectedItem,
    setSelectedItems,
    clearSelection,
    selectItem,
    toggleItemSelection,
    selectAllItems,
    hasSelection: selectedItems.length > 0
  };
}

// Common filter states hook
export function useFilterStates() {
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const setFilter = useCallback((key: string, value: any) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setActiveFilters(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setSearchTerm('');
  }, []);

  const hasActiveFilters = Object.keys(activeFilters).length > 0 || searchTerm.length > 0;

  return {
    activeFilters,
    searchTerm,
    setSearchTerm,
    setFilter,
    removeFilter,
    clearAllFilters,
    hasActiveFilters
  };
}

// Common pagination states hook
export function usePaginationState(initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    setCurrentPage,
    setPageSize,
    setTotalItems,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}