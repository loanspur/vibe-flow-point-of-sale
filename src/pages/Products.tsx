import { useState, useCallback, useRef } from 'react';
import ProductManagement from '@/components/ProductManagement';
import { StockManagement } from '@/components/StockManagement';
import UnitsManagement from '@/components/UnitsManagement';
import BrandManagement from '@/components/BrandManagement';
import { UnifiedMigration } from '@/components/UnifiedMigration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeWrapper } from '@/components/SafeWrapper';
import { useAuth } from '@/contexts/AuthContext';
// import { useAutoRefresh } from '@/hooks/useAutoRefresh';
// import { useDebouncedRealtimeRefresh } from '@/hooks/useDebouncedRealtimeRefresh';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { ProductSettings } from '@/components/ProductSettings';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw } from 'lucide-react';

const Products = () => {
  const { tenantId } = useAuth();
  const { product: productSettings } = useBusinessSettings();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const realtimeTimerRef = useRef<NodeJS.Timeout>();
  const handleRealtimeRefresh = useCallback(() => {
    if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    realtimeTimerRef.current = setTimeout(() => setRefreshKey((k) => k + 1), 300);
  }, []);
  // Periodic refresh when visible
  // useAutoRefresh({ interval: 30000, onRefresh: handleRefresh, visibilityBased: true, enabled: false });

// Debounced realtime refresh to prevent excessive re-renders
  // useDebouncedRealtimeRefresh({
  //   tables: [
  //     'products',
  //     'product_variants',
  //     'stock_transactions',
  //   ],
  //   tenantId,
  //   onChange: handleRealtimeRefresh,
  //   enabled: false,
  //   debounceMs: 2000,
  // });

return (
    <div className="p-6">
      {/* Header with Product Settings */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory</p>
        </div>
        <div className="flex gap-2">
          <ProductSettings />
          <Button 
            variant="outline"
            onClick={handleRefresh}
            title="Refresh product data"
            className="shrink-0"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            <span className="whitespace-nowrap">Refresh</span>
          </Button>
          <Button 
            onClick={() => {
              setSelectedProduct(null);
              setShowProductForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
          {productSettings.enableProductUnits && (
            <TabsTrigger value="units">Units</TabsTrigger>
          )}
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <SafeWrapper>
            <ProductManagement 
              refreshSignal={refreshKey} 
              showProductForm={showProductForm}
              selectedProduct={selectedProduct}
              onShowProductForm={setShowProductForm}
              onSetSelectedProduct={setSelectedProduct}
            />
          </SafeWrapper>
        </TabsContent>
        <TabsContent value="stock">
          <SafeWrapper>
            <StockManagement />
          </SafeWrapper>
        </TabsContent>
        {productSettings.enableProductUnits && (
          <TabsContent value="units">
            <SafeWrapper>
              <UnitsManagement />
            </SafeWrapper>
          </TabsContent>
        )}
        <TabsContent value="brands">
          <SafeWrapper>
            <BrandManagement />
          </SafeWrapper>
        </TabsContent>
        <TabsContent value="migration">
          <SafeWrapper>
            <UnifiedMigration />
          </SafeWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Products;