import { useApp } from '@/contexts/AppContext';
import { useProductHistory, type ProductHistoryEntry, type ProductHistorySummary, type ProductTransactionData } from '@/hooks/useProductHistory';
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
  Filter,
  ShoppingCart,
  Package,
  RotateCcw,
  DollarSign
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
    transactionData,
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
          {/* Transaction Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{summary.total_sales}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(summary.sales_revenue)}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Purchases</p>
                  <p className="text-2xl font-bold">{summary.total_purchases}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(summary.purchase_cost)}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Returns</p>
                  <p className="text-2xl font-bold">{summary.total_returns}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(summary.return_amount)}</p>
                </div>
                <RotateCcw className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.sales_revenue - summary.purchase_cost - summary.return_amount)}</p>
                  <p className="text-xs text-muted-foreground">Revenue - Cost - Returns</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* History Summary */}
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
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="purchases">Purchases</SelectItem>
            <SelectItem value="returns">Returns</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction History Tabs */}
      {transactionData && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Detailed sales, purchases, and returns for this product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Sales */}
              {transactionData.sales.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Sales ({transactionData.sales.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Cashier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionData.sales.slice(0, 5).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="text-sm">
                            {format(new Date(sale.sale_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{sale.quantity}</TableCell>
                          <TableCell>{formatCurrency(sale.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(sale.total_price)}</TableCell>
                          <TableCell className="text-sm">{sale.customer_name || 'Walk-in'}</TableCell>
                          <TableCell className="text-sm">{sale.cashier_name || 'Unknown'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Purchases */}
              {transactionData.purchases.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Purchases ({transactionData.purchases.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Ordered</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Supplier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionData.purchases.slice(0, 5).map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="text-sm">
                            {format(new Date(purchase.purchase_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{purchase.quantity_ordered}</TableCell>
                          <TableCell>{purchase.quantity_received}</TableCell>
                          <TableCell>{formatCurrency(purchase.unit_cost)}</TableCell>
                          <TableCell>{formatCurrency(purchase.total_cost)}</TableCell>
                          <TableCell className="text-sm">{purchase.supplier_name || 'Unknown'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Returns */}
              {transactionData.returns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Returns ({transactionData.returns.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Refund Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Customer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionData.returns.slice(0, 5).map((returnItem) => (
                        <TableRow key={returnItem.id}>
                          <TableCell className="text-sm">
                            {format(new Date(returnItem.return_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{returnItem.quantity_returned}</TableCell>
                          <TableCell>{formatCurrency(returnItem.refund_amount)}</TableCell>
                          <TableCell className="text-sm">{returnItem.reason}</TableCell>
                          <TableCell className="text-sm">{returnItem.customer_name || 'Unknown'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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