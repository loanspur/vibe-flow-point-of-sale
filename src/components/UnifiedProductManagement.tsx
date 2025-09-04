import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useLowStockProducts } from '@/features/products/hooks/useLowStockProducts';
import { useTenantProductsList } from '@/features/products/hooks/useTenantProductsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeWrapper } from '@/components/SafeWrapper';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import all product management components
import ProductsTab from './ProductsTab';
import { StockManagement } from './StockManagement';
import UnitsManagement from './UnitsManagement';
import BrandManagement from './BrandManagement';
import { UnifiedMigration } from './UnifiedMigration';
import { ProductSettings } from '@/components/ProductSettings';

interface UnifiedProductManagementProps {
  className?: string;
}

export const UnifiedProductManagement: React.FC<UnifiedProductManagementProps> = ({ className }) => {
  const { tenantId } = useAuth();
  const { product: productSettings } = useBusinessSettings();
  const { toast } = useToast();
  const qc = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('products');
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Unified refresh function that invalidates all product-related queries
  const handleRefresh = useCallback(() => {
    // Scoped invalidation: only invalidate product keys to prevent unnecessary re-renders
    qc.invalidateQueries({ queryKey: ['products', tenantId] });
    qc.invalidateQueries({ queryKey: ['product_units', tenantId] });
    qc.invalidateQueries({ queryKey: ['brands', tenantId] });
    qc.invalidateQueries({ queryKey: ['stock', tenantId] });
    qc.invalidateQueries({ queryKey: ['migrations', tenantId] });
    
    toast({
      title: "Data Refreshed",
      description: "All product data has been refreshed successfully.",
    });
  }, [qc, tenantId, toast]);

  // Get product count using the unified hook (same source as ProductsTab)
  const { data: products = [], error } = useTenantProductsList();
  const productCount = products.length;
  
  // Log errors visibly for diagnosis
  if (error) {
    console.warn('[UnifiedProductManagement] list error', error);
  }

  // Get low stock count using unified hook
  const { data: lowStockProducts = [] } = useLowStockProducts(tenantId);
  const lowStockCount = lowStockProducts.length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Product Settings */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">
            Unified management for all product-related operations with stable performance
          </p>
        </div>
        <div className="flex gap-2">
          <ProductSettings />
          <Button 
            type="button"
            variant="outline"
            onClick={handleRefresh}
            title="Refresh all product data"
            className="shrink-0"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            <span className="whitespace-nowrap">Refresh All</span>
          </Button>

        </div>
      </div>
      
      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products" className="relative">
            Products
            {productCount > 0 && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                {productCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stock" className="relative">
            Stock Management
            {lowStockCount > 0 && (
              <span className="ml-2 text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                {lowStockCount}
              </span>
            )}
          </TabsTrigger>
          {productSettings.enableProductUnits && (
            <TabsTrigger value="units">Units</TabsTrigger>
          )}
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <SafeWrapper>
            <ProductsTab 
              showProductForm={showProductForm}
              selectedProduct={selectedProduct}
              onShowProductForm={setShowProductForm}
              onSetSelectedProduct={setSelectedProduct}
            />
          </SafeWrapper>
        </TabsContent>

        {/* Stock Management Tab */}
        <TabsContent value="stock">
          <SafeWrapper>
            <StockManagement />
          </SafeWrapper>
        </TabsContent>

        {/* Units Tab */}
        {productSettings.enableProductUnits && (
          <TabsContent value="units">
            <SafeWrapper>
              <UnitsManagement />
            </SafeWrapper>
          </TabsContent>
        )}

        {/* Brands Tab */}
        <TabsContent value="brands">
          <SafeWrapper>
            <BrandManagement />
          </SafeWrapper>
        </TabsContent>

        {/* Migration Tab */}
        <TabsContent value="migration">
          <SafeWrapper>
            <UnifiedMigration />
          </SafeWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedProductManagement;
