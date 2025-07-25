import { useState, useCallback, useMemo } from 'react';

interface TableItem {
  id: string;
  [key: string]: any;
}

interface TableActionsState<T> {
  selectedItems: Set<string>;
  isAllSelected: boolean;
  selectedCount: number;
  selectedData: T[];
}

interface TableActionsOptions<T> {
  data: T[];
  onBulkAction?: (action: string, items: T[]) => void;
  onSelectionChange?: (selectedItems: T[]) => void;
}

export function useTableActions<T extends TableItem>(
  options: TableActionsOptions<T>
) {
  const { data = [], onBulkAction, onSelectionChange } = options;
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Computed state
  const state = useMemo<TableActionsState<T>>(() => {
    const selectedData = data.filter(item => selectedItems.has(item.id));
    return {
      selectedItems,
      isAllSelected: data.length > 0 && selectedItems.size === data.length,
      selectedCount: selectedItems.size,
      selectedData
    };
  }, [selectedItems, data]);

  // Actions
  const toggleItem = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      
      const selectedData = data.filter(item => newSet.has(item.id));
      onSelectionChange?.(selectedData);
      
      return newSet;
    });
  }, [data, onSelectionChange]);

  const toggleAll = useCallback(() => {
    setSelectedItems(prev => {
      const newSet = prev.size === data.length ? new Set<string>() : new Set(data.map(item => item.id));
      const selectedData = data.filter(item => newSet.has(item.id));
      onSelectionChange?.(selectedData);
      return newSet;
    });
  }, [data, onSelectionChange]);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedItems(new Set(ids));
    const selectedData = data.filter(item => ids.includes(item.id));
    onSelectionChange?.(selectedData);
  }, [data, onSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const selectRange = useCallback((startIndex: number, endIndex: number) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const rangeIds = data.slice(start, end + 1).map(item => item.id);
    
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      rangeIds.forEach(id => newSet.add(id));
      const selectedData = data.filter(item => newSet.has(item.id));
      onSelectionChange?.(selectedData);
      return newSet;
    });
  }, [data, onSelectionChange]);

  const executeBulkAction = useCallback((action: string) => {
    if (state.selectedData.length === 0) return;
    onBulkAction?.(action, state.selectedData);
  }, [state.selectedData, onBulkAction]);

  // Bulk actions helpers
  const bulkActions = useMemo(() => ({
    delete: () => executeBulkAction('delete'),
    archive: () => executeBulkAction('archive'),
    activate: () => executeBulkAction('activate'),
    deactivate: () => executeBulkAction('deactivate'),
    export: () => executeBulkAction('export'),
    duplicate: () => executeBulkAction('duplicate')
  }), [executeBulkAction]);

  // Row props helper for easy integration
  const getRowProps = useCallback((item: T, index: number) => ({
    key: item.id,
    selected: selectedItems.has(item.id),
    onSelect: () => toggleItem(item.id),
    onRangeSelect: (shiftKey: boolean, lastSelectedIndex?: number) => {
      if (shiftKey && lastSelectedIndex !== undefined) {
        selectRange(lastSelectedIndex, index);
      } else {
        toggleItem(item.id);
      }
    }
  }), [selectedItems, toggleItem, selectRange]);

  // Header checkbox props
  const getHeaderCheckboxProps = useCallback(() => ({
    checked: state.isAllSelected,
    indeterminate: state.selectedCount > 0 && !state.isAllSelected,
    onChange: toggleAll
  }), [state.isAllSelected, state.selectedCount, toggleAll]);

  // Row checkbox props
  const getRowCheckboxProps = useCallback((item: T) => ({
    checked: selectedItems.has(item.id),
    onChange: () => toggleItem(item.id)
  }), [selectedItems, toggleItem]);

  return {
    // State
    ...state,
    
    // Actions
    toggleItem,
    toggleAll,
    selectItems,
    clearSelection,
    selectRange,
    executeBulkAction,
    bulkActions,
    
    // Helpers
    getRowProps,
    getHeaderCheckboxProps,
    getRowCheckboxProps,
    
    // Utilities
    isSelected: (id: string) => selectedItems.has(id),
    hasSelection: state.selectedCount > 0,
    canExecuteBulkActions: state.selectedCount > 0
  };
}