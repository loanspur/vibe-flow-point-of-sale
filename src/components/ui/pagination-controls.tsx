import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface PaginationControlsProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  isLoading = false
}: PaginationControlsProps) {
  // Add safety check to prevent destructuring errors
  if (!pagination) {
    return null;
  }
  
  const { page = 1, pageSize = 50, total = 0 } = pagination;
  
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(value) => onPageSizeChange(Number(value))}
          disabled={isLoading}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {total > 0 ? `${startItem}-${endItem} of ${total}` : '0 items'}
        </span>
        
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canGoPrevious || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-2">
            <span className="text-sm">Page {page} of {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canGoNext || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext || isLoading}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing pagination state
 */
export function usePagination(initialPageSize: number = 50) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0
  });

  // Ensure pagination is always defined
  const safePagination = pagination || { page: 1, pageSize: initialPageSize, total: 0 };

  const updatePagination = (updates: Partial<PaginationState>) => {
    setPagination(prev => ({ ...prev, ...updates }));
  };

  const handlePageChange = (page: number) => {
    updatePagination({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    updatePagination({ page: 1, pageSize }); // Reset to first page when changing page size
  };

  const getSupabaseRange = () => {
    const from = (safePagination.page - 1) * safePagination.pageSize;
    const to = from + safePagination.pageSize - 1;
    return { from, to };
  };

  const resetPagination = () => {
    updatePagination({ page: 1, total: 0 });
  };

  return {
    pagination: safePagination,
    updatePagination,
    handlePageChange,
    handlePageSizeChange,
    getSupabaseRange,
    resetPagination
  };
}