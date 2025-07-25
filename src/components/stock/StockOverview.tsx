import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Package, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getLowStockItems, getInventoryLevels } from '@/lib/inventory-integration';

export const StockOverview: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchInventoryData();
  }, [user]);

  const fetchInventoryData = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (!profile?.tenant_id) return;

      const [inventory, lowStock] = await Promise.all([
        getInventoryLevels(profile.tenant_id),
        getLowStockItems(profile.tenant_id)
      ]);

      setInventoryData(inventory);
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (currentStock: number, minLevel: number) => {
    if (currentStock <= 0) return { label: 'Out of Stock', color: 'bg-red-500' };
    if (currentStock <= minLevel) return { label: 'Low Stock', color: 'bg-yellow-500' };
    return { label: 'In Stock', color: 'bg-green-500' };
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
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Inventory Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inventory data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryData.map((product) => {
                  const status = getStockStatus(product.stock_quantity, product.min_stock_level || 0);
                  const value = (product.stock_quantity || 0) * (product.cost_price || 0);
                  
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || '-'}</TableCell>
                      <TableCell>{product.stock_quantity || 0}</TableCell>
                      <TableCell>{product.min_stock_level || 0}</TableCell>
                      <TableCell>
                        <Badge className={`text-white ${status.color}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>KES {value.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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