import React, { useState, useEffect } from 'react';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Package, TrendingUp, Search, Download, Filter, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnsureBaseUnitPcs } from '@/hooks/useEnsureBaseUnitPcs';
import { getLowStockItems, getInventoryLevels } from '@/lib/inventory-integration';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { useSoftWarnings } from '@/hooks/useSoftWarnings';
import { useLowStockProducts } from '@/features/products/hooks/useLowStockProducts';
import { supabase } from '@/integrations/supabase/client';
import { useStockWithRefresh } from '@/hooks/useUnifiedStock';
import { formatStockQuantity } from '@/utils/commonUtils';

// Unified Stock Display Component for Stock Overview
const StockDisplay = ({ productId, locationId, fallbackStock }: { 
  productId: string; 
  locationId?: string; 
  fallbackStock?: number;
}) => {
  const { stockData, loadStock } = useStockWithRefresh(productId, locationId);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!hasLoaded) {
      loadStock();
      setHasLoaded(true);
    }
  }, [loadStock, hasLoaded]);

  const displayStock = stockData?.stock ?? fallbackStock ?? 0;
  const isLoading = stockData?.isLoading ?? false;

  if (isLoading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return (
    <span className={displayStock > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
      {formatStockQuantity(displayStock)}
    </span>
  );
};

export const StockOverview: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const { tenantId } = useAuth();
  const { data: lowStockItems = [] } = useLowStockProducts(tenantId);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lowStockItemsLocal, setLowStockItemsLocal] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  useEnsureBaseUnitPcs();
  
  // Centralized warning system
  const {
    showLowStockWarning,
    showNegativeStockWarning,
    showOutOfStockWarning,
  } = useSoftWarnings();

  // Function to show soft warnings for stock items
  const showStockWarnings = (item: any) => {
    // Use centralized warning system
    showLowStockWarning(item.name, item.stock_quantity);
    showNegativeStockWarning(item.name, item.stock_quantity);
    
    // Out of stock warning
    if (item.stock_quantity === 0) {
      showOutOfStockWarning(item.name);
    }

    // Cost price warning
    if (!item.cost_price || item.cost_price <= 0) {
      toast({
        title: "Missing Cost Price",
        description: `${item.name} has no cost price set. This may affect profit calculations.`,
        variant: "default",
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchInventoryData();
    }
  }, [user?.id]);

  const fetchInventoryData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.tenant_id) {
        setLoading(false);
        return;
      }

      // Optimized: Fetch data with pagination and better performance
      const [inventoryResult, locationsResult, lowStockResult] = await Promise.allSettled([
        // Simplified products query - only essential fields, limit to 100 for better performance
        supabase
          .from('products')
          .select('id, name, sku, stock_quantity, min_stock_level, cost_price, location_id')
          .eq('tenant_id', profile.tenant_id)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(100), // Reduced limit for better performance
        // Fetch locations separately
        supabase
          .from('store_locations')
          .select('id, name')
          .eq('tenant_id', profile.tenant_id)
          .eq('is_active', true),
        // Use low stock view directly
        supabase
          .from('low_stock_products')
          .select('*')
          .eq('tenant_id', profile.tenant_id)
      ]);

      // Handle inventory data with location mapping
      if (inventoryResult.status === 'fulfilled' && !inventoryResult.value.error) {
        const inventory = inventoryResult.value.data || [];
        
        // Handle locations data first to create location map
        let locationMap = new Map();
        if (locationsResult.status === 'fulfilled' && !locationsResult.value.error) {
          const locations = locationsResult.value.data || [];
          setLocations(locations);
          locationMap = new Map(locations.map(loc => [loc.id, loc.name]));
        }
        
        // Map location names to inventory items
        const inventoryWithLocations = inventory.map(item => ({
          ...item,
          store_locations: { name: locationMap.get(item.location_id) || 'N/A' }
        }));
        
        setInventoryData(inventoryWithLocations);
        setFilteredData(inventoryWithLocations);
      }

      // Handle low stock data
      if (lowStockResult.status === 'fulfilled') {
        const lowStockData = lowStockResult.value?.data || [];
        setLowStockItemsLocal(lowStockData);
      }

      // Set all products for reference
      if (inventoryResult.status === 'fulfilled' && !inventoryResult.value.error) {
        setAllProducts(inventoryResult.value.data || []);
      }

    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search functionality
  useEffect(() => {
    let filtered = inventoryData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply location filter
    if (selectedLocation && selectedLocation !== 'all') {
      filtered = filtered.filter(product => product.location_id === selectedLocation);
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(product => {
        const status = getStockStatus(product.stock_quantity, product.min_stock_level || 0);
        return status.label.toLowerCase().replace(' ', '').includes(statusFilter);
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  }, [inventoryData, searchTerm, selectedLocation, statusFilter]);

  const totalPages = Math.max(1, Math.ceil((filteredData?.length || 0) / pageSize));
  const pagedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const getStockStatus = (currentStock: number, minLevel: number) => {
    if (currentStock <= 0) return { label: 'Out of Stock', color: 'bg-red-500' };
    if (currentStock <= minLevel) return { label: 'Low Stock', color: 'bg-yellow-500' };
    return { label: 'In Stock', color: 'bg-green-500' };
  };

  const exportToCSV = () => {
    const csvData = filteredData.map(product => ({
      Product: product.name,
      SKU: product.sku || '',
      'Current Stock (pcs)': product.stock_quantity || 0,
      'Min Level (pcs)': product.min_stock_level || 0,
      Location: product.store_locations?.name || 'N/A',
      Status: getStockStatus(product.stock_quantity, product.min_stock_level || 0).label,
      Value: ((product.stock_quantity || 0) * (product.cost_price || 0)).toFixed(2)
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-levels-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading inventory data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              {lowStockItems.length} items are below minimum stock levels
            </p>
            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="destructive">
                    {item.currentStock} / {item.minLevel} min
                  </Badge>
                </div>
              ))}
              {lowStockItems.length > 3 && (
                <p className="text-sm text-red-600">
                  and {lowStockItems.length - 3} more items...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Inventory Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Current Inventory Levels
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={filteredData.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="instock">In Stock</SelectItem>
                  <SelectItem value="lowstock">Low Stock</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {inventoryData.length === 0 ? 'No inventory data available' : 'No items match your filters'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Current Stock (pcs)</TableHead>
                  <TableHead>Min Level (pcs)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedData.map((product) => {
                  // Use fallback stock for status calculation (will be updated by StockDisplay component)
                  const fallbackStock = product.stock_quantity || 0;
                  const status = getStockStatus(fallbackStock, product.min_stock_level || 0);
                  const value = fallbackStock * (product.cost_price || 0);
                  
                  return (
                    <TableRow 
                      key={product.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => showStockWarnings(product)}
                    >
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || '-'}</TableCell>
                      <TableCell>{product.store_locations?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <StockDisplay 
                          productId={product.id} 
                          locationId={product.location_id} 
                          fallbackStock={product.stock_quantity || 0}
                        />
                      </TableCell>
                      <TableCell>{formatStockQuantity(product.min_stock_level)}</TableCell>
                      <TableCell>
                        <Badge className={`text-white ${status.color}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                                             <TableCell>{formatCurrency(value)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {/* Pagination Controls */}
          {filteredData.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                  <div className="text-sm">Page {currentPage} / {totalPages}</div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Stock Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent stock activities
          </div>
        </CardContent>
      </Card>
    </div>
  );
};