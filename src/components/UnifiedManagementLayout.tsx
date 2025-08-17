import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLoadingStates, useFilterStates, useDialogStates } from '@/hooks/useCommonState';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (value: any, item: any) => ReactNode;
}

interface ActionButton {
  label: string;
  icon?: ReactNode;
  onClick: (item: any) => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  show?: (item: any) => boolean;
}

interface UnifiedManagementLayoutProps {
  title: string;
  description?: string;
  data: any[];
  columns: Column[];
  loading?: boolean;
  onAdd?: () => void;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  actions?: ActionButton[];
  children?: ReactNode;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function UnifiedManagementLayout({
  title,
  description,
  data,
  columns,
  loading = false,
  onAdd,
  onRefresh,
  searchPlaceholder = "Search...",
  filterOptions = [],
  actions = [],
  children,
  emptyMessage = "No items found",
  emptyDescription = "Get started by creating your first item."
}: UnifiedManagementLayoutProps) {
  const { searchTerm, setSearchTerm, activeFilters, setFilter, clearAllFilters } = useFilterStates();
  const { loading: refreshing, setLoadingState } = useLoadingStates();

  const handleRefresh = async () => {
    if (onRefresh) {
      setLoadingState('loading', true);
      try {
        await onRefresh();
      } finally {
        setLoadingState('loading', false);
      }
    }
  };

  const filteredData = React.useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        columns.some(col => {
          const value = item[col.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply active filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        filtered = filtered.filter(item => {
          if (key === 'status') {
            return item.status === value || item.is_active === (value === 'active');
          }
          return item[key] === value;
        });
      }
    });

    return filtered;
  }, [data, searchTerm, activeFilters, columns]);

  const LoadingSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            <div className="flex gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-9"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              {onAdd && (
                <Button onClick={onAdd} size="sm" className="h-9">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {filterOptions.length > 0 && (
              <div className="flex gap-2">
                {filterOptions.map((option) => (
                  <Select
                    key={option.value}
                    value={activeFilters[option.value] || 'all'}
                    onValueChange={(value) => setFilter(option.value, value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {option.label}s</SelectItem>
                      {/* Add more options based on the filter type */}
                    </SelectContent>
                  </Select>
                ))}
                
                {Object.keys(activeFilters).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="h-10"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Data Table */}
          {filteredData.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column.key} className={column.className}>
                        {column.label}
                      </TableHead>
                    ))}
                    {actions.length > 0 && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={item.id || index}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className={column.className}>
                          {column.render
                            ? column.render(item[column.key], item)
                            : item[column.key]
                          }
                        </TableCell>
                      ))}
                      {actions.length > 0 && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {actions
                              .filter(action => !action.show || action.show(item))
                              .map((action, actionIndex) => (
                                <Button
                                  key={actionIndex}
                                  variant={action.variant || 'outline'}
                                  size="sm"
                                  onClick={() => action.onClick(item)}
                                  className="h-8"
                                >
                                  {action.icon}
                                  <span className="hidden sm:inline ml-1">
                                    {action.label}
                                  </span>
                                </Button>
                              ))}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">{emptyMessage}</div>
              <div className="text-sm text-muted-foreground mb-4">{emptyDescription}</div>
              {onAdd && (
                <Button onClick={onAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {children}
    </div>
  );
}