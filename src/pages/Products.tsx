import ProductManagement from '@/components/ProductManagement';
import { StockManagement } from '@/components/StockManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeWrapper } from '@/components/SafeWrapper';

const Products = () => {
  return (
    <div className="p-6">
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <SafeWrapper>
            <ProductManagement />
          </SafeWrapper>
        </TabsContent>
        <TabsContent value="stock">
          <SafeWrapper>
            <StockManagement />
          </SafeWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Products;