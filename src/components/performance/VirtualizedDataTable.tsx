import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualizedDataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  pageSize?: number;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  loading?: boolean;
  totalCount?: number;
  onLoadMore?: () => void;
  className?: string;
}

interface ColumnDefinition<T> {
  key: keyof T;
  header: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface SortConfig {
  key: keyof any;
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  key: keyof any;
  value: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
}

export default function VirtualizedDataTable<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 50,
  searchable = true,
  filterable = true,
  sortable = true,
  selectable = false,
  onRowClick,
  onSelectionChange,
  loading = false,
  totalCount,
  onLoadMore,
  className = '',
}: VirtualizedDataTableProps<T>) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const [rowHeight] = useState(48); // Fixed row height for virtualization
  const [visibleRows, setVisibleRows] = useState(20); // Number of visible rows

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate unique row ID
  const getRowId = useCallback((row: T): string => {
    return row.id || row.uuid || JSON.stringify(row);
  }, []);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchTerm) {
      result = result.filter(row =>
        columns.some(column => {
          const value = row[column.key];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    filters.forEach(filter => {
      result = result.filter(row => {
        const value = row[filter.key];
        if (value == null) return false;
        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case 'contains':
            return stringValue.includes(filterValue);
          case 'equals':
            return stringValue === filterValue;
          case 'startsWith':
            return stringValue.startsWith(filterValue);
          case 'endsWith':
            return stringValue.endsWith(filterValue);
          default:
            return true;
        }
      });
    });

    return result;
  }, [data, searchTerm, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Calculate virtual scroll properties
  const totalHeight = sortedData.length * rowHeight;
  const startIndex = Math.floor(virtualScrollTop / rowHeight);
  const endIndex = Math.min(startIndex + visibleRows, sortedData.length);
  const visibleData = sortedData.slice(startIndex, endIndex);

  // Handle sort
  const handleSort = useCallback((key: keyof T) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // Handle filter
  const handleFilter = useCallback((key: keyof T, value: string, operator: FilterConfig['operator'] = 'contains') => {
    setFilters(current => {
      const existing = current.find(f => f.key === key);
      if (existing) {
        if (!value) {
          return current.filter(f => f.key !== key);
        }
        return current.map(f => f.key === key ? { ...f, value, operator } : f);
      }
      if (!value) return current;
      return [...current, { key, value, operator }];
    });
  }, []);

  // Handle row selection
  const handleRowSelect = useCallback((row: T) => {
    const rowId = getRowId(row);
    setSelectedRows(current => {
      const newSet = new Set(current);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, [getRowId]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === visibleData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(visibleData.map(getRowId)));
    }
  }, [selectedRows.size, visibleData, getRowId]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    setVirtualScrollTop(scrollTop);
  }, []);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Export data
  const handleExport = useCallback(() => {
    try {
      const csvContent = generateCSV(sortedData, columns);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Data exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
    }
  }, [sortedData, columns, toast]);

  // Generate CSV content
  const generateCSV = (data: T[], columns: ColumnDefinition<T>[]): string => {
    const headers = columns.map(col => col.header).join(',');
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    return [headers, ...rows].join('\n');
  };

  // Calculate pagination info
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Update selected rows when data changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedData = data.filter(row => selectedRows.has(getRowId(row)));
      onSelectionChange(selectedData);
    }
  }, [selectedRows, data, getRowId, onSelectionChange]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Table</CardTitle>
            <CardDescription>
              {totalCount !== undefined 
                ? `${totalCount.toLocaleString()} total records`
                : `${sortedData.length.toLocaleString()} records`
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-4">
          {searchable && (
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
          
          {filterable && (
            <Select onValueChange={(value) => handleFilter('status' as keyof T, value)}>
              <SelectTrigger className="w-32">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <div 
            ref={containerRef}
            className="relative"
            style={{ height: `${visibleRows * rowHeight}px` }}
          >
            <div
              ref={scrollRef}
              className="absolute inset-0 overflow-auto"
              onScroll={handleScroll}
            >
              <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                {/* Virtual rows */}
                {visibleData.map((row, index) => {
                  const actualIndex = startIndex + index;
                  const rowId = getRowId(row);
                  const isSelected = selectedRows.has(rowId);
                  
                  return (
                    <div
                      key={rowId}
                      className={`flex items-center border-b hover:bg-muted/50 cursor-pointer ${
                        isSelected ? 'bg-primary/10' : ''
                      }`}
                      style={{
                        position: 'absolute',
                        top: `${actualIndex * rowHeight}px`,
                        height: `${rowHeight}px`,
                        width: '100%',
                      }}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <div className="w-12 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleRowSelect(row);
                            }}
                            className="h-4 w-4"
                          />
                        </div>
                      )}
                      
                      {columns.map((column) => (
                        <div
                          key={String(column.key)}
                          className="flex-1 px-4 py-2"
                          style={{ 
                            width: column.width,
                            textAlign: column.align || 'left'
                          }}
                        >
                          {column.render 
                            ? column.render(row[column.key], row)
                            : String(row[column.key] || '')
                          }
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        )}

        {/* Load more button */}
        {onLoadMore && hasNextPage && (
          <div className="flex justify-center mt-4">
            <Button onClick={onLoadMore} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
