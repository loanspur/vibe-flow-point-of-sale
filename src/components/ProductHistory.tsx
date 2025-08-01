import { useApp } from '@/contexts/AppContext';
import { useProductHistory, type ProductHistoryEntry, type ProductHistorySummary } from '@/hooks/useProductHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  History, 
  User, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Edit, 
  Plus, 
  Trash2,
  BarChart3,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';


interface ProductHistoryProps {
  productId: string;
  productName: string;
}

export default function ProductHistory({ productId, productName }: ProductHistoryProps) {
  const { formatCurrency } = useApp();
  
  const {
    history: filteredHistory,
    summary,
    userProfiles,
    isLoading,
    searchTerm,
    setSearchTerm,
    actionFilter,
    setActionFilter
  } = useProductHistory(productId);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'updated':
        return <Edit className="h-4 w-4" />;
      case 'price_change':
        return <TrendingUp className="h-4 w-4" />;
      case 'stock_adjustment':
        return <BarChart3 className="h-4 w-4" />;
      case 'status_change':
        return <TrendingDown className="h-4 w-4" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'price_change':
        return 'bg-purple-100 text-purple-800';
      case 'stock_adjustment':
        return 'bg-orange-100 text-orange-800';
      case 'status_change':
        return 'bg-yellow-100 text-yellow-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: any, fieldName: string) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (fieldName === 'price' && typeof value === 'number') {
      return formatCurrency(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const getChangeDescription = (entry: ProductHistoryEntry) => {
    switch (entry.action_type) {
      case 'created':
        return 'Product was created';
      case 'price_change':
        return `Price changed from ${formatValue(entry.old_value, 'price')} to ${formatValue(entry.new_value, 'price')}`;
      case 'stock_adjustment':
        return `Stock adjusted from ${formatValue(entry.old_value, 'stock_quantity')} to ${formatValue(entry.new_value, 'stock_quantity')}`;
      case 'status_change':
        return `Status changed from ${entry.old_value ? 'Active' : 'Inactive'} to ${entry.new_value ? 'Active' : 'Inactive'}`;
      case 'updated':
        if (entry.field_changed) {
          return `${entry.field_changed.replace('_', ' ')} changed from "${formatValue(entry.old_value, entry.field_changed)}" to "${formatValue(entry.new_value, entry.field_changed)}"`;
        }
        return 'Product information updated';
      case 'deleted':
        return 'Product was deleted';
      default:
        return 'Unknown change';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Product History: {productName}
          </h3>
          <p className="text-sm text-muted-foreground">Track all changes made to this product</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Changes</p>
                  <p className="text-2xl font-bold">{summary.total_changes}</p>
                </div>
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price Changes</p>
                  <p className="text-2xl font-bold">{summary.price_changes}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stock Adjustments</p>
                  <p className="text-2xl font-bold">{summary.stock_adjustments}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status Changes</p>
                  <p className="text-2xl font-bold">{summary.status_changes}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search changes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="price_change">Price Changes</SelectItem>
            <SelectItem value="stock_adjustment">Stock Adjustments</SelectItem>
            <SelectItem value="status_change">Status Changes</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>
            {filteredHistory.length} changes shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No history entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="secondary" className={getActionColor(entry.action_type)}>
                        <span className="flex items-center gap-1">
                          {getActionIcon(entry.action_type)}
                          {entry.action_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm">{getChangeDescription(entry)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {userProfiles[entry.changed_by]?.full_name || 'Unknown User'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(entry.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {entry.change_reason || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}