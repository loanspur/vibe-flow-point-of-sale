import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  min_stock_level: number;
}

export function LowStockAlert() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLowStockItems = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity, min_stock_level')
        .eq('tenant_id', tenantId)
        .neq('min_stock_level', null)
        .filter('stock_quantity', 'lte', 'min_stock_level')
        .order('stock_quantity', { ascending: true })
        .limit(10);

      if (error) throw error;
      setLowStockItems(data || []);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      toast({ title: "Error", description: "Failed to fetch low stock items", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const viewAllProducts = () => {
    window.open('/admin/products?filter=low-stock', '_blank');
  };

  useEffect(() => {
    fetchLowStockItems();
  }, [tenantId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('low-stock-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => fetchLowStockItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  if (loading || lowStockItems.length === 0) {
    return null; // Don't show the card if no low stock items
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="h-5 w-5" />
          Low Stock Alert
        </CardTitle>
        <CardDescription className="text-yellow-700 dark:text-yellow-300">
          {lowStockItems.length} product{lowStockItems.length === 1 ? '' : 's'} running low on stock
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lowStockItems.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.sku}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="destructive" className="text-xs">
                {item.stock_quantity} / {item.min_stock_level}
              </Badge>
            </div>
          </div>
        ))}
        
        {lowStockItems.length > 3 && (
          <p className="text-sm text-yellow-700 dark:text-yellow-300 text-center">
            +{lowStockItems.length - 3} more items need attention
          </p>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={viewAllProducts}
          className="w-full mt-3 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900/30"
        >
          <Eye className="h-4 w-4 mr-2" />
          View All Low Stock Products
        </Button>
      </CardContent>
    </Card>
  );
}