import { useState, useCallback, useRef } from 'react';
import ProductManagement from '@/components/ProductManagement';
import { StockManagement } from '@/components/StockManagement';
import UnitsManagement from '@/components/UnitsManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeWrapper } from '@/components/SafeWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

const Products = () => {
  const { tenantId } = useAuth();
  const { hasFeature } = useFeatureAccess();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const realtimeTimerRef = useRef<NodeJS.Timeout>();
  const handleRealtimeRefresh = useCallback(() => {
    if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
    realtimeTimerRef.current = setTimeout(() => setRefreshKey((k) => k + 1), 1000);
  }, []);
  // Periodic refresh when visible
  useAutoRefresh({ interval: 30000, onRefresh: handleRefresh, visibilityBased: true });

// Realtime refresh on data changes
  useRealtimeRefresh({
    tables: [
      'products',
      'product_variants',
      'stock_transactions',
    ],
    tenantId,
    onChange: handleRealtimeRefresh,
  });

return (
    <div className="p-6">
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
          {hasFeature('enable_product_units') && (
            <TabsTrigger value="units">Units</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="products">
          <SafeWrapper>
            <ProductManagement refreshSignal={refreshKey} />
          </SafeWrapper>
        </TabsContent>
        <TabsContent value="stock">
          <SafeWrapper>
            <StockManagement />
          </SafeWrapper>
        </TabsContent>
        {hasFeature('enable_product_units') && (
          <TabsContent value="units">
            <SafeWrapper>
              <UnitsManagement />
            </SafeWrapper>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Products;