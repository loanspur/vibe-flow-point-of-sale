import { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Filter, Edit, Trash2, Eye, AlertTriangle, Package, Image, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDeletionControl } from '@/hooks/useDeletionControl';
import ProductForm from './ProductForm';
import CategoryManagement from './CategoryManagement';
import ProductVariants from './ProductVariants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock_quantity: number;
  min_stock_level: number;
  description: string;
  barcode: string;
  image_url: string;
  is_active: boolean;
  category_id: string;
  subcategory_id: string;
  product_categories?: { name: string };
  product_subcategories?: { name: string };
  variants?: any[];
  product_variants?: any[];
}

export default function ProductManagement() {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const { canDelete, logDeletionAttempt } = useDeletionControl();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  // Optimized product fetching with caching
  const { data: products = [], loading, refetch: refetchProducts } = useOptimizedQuery(

    async () => {
      if (!tenantId) return { data: [], error: null };
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (name),
          product_subcategories (name),
          product_variants (*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    },
    [tenantId],
    {
      enabled: !!tenantId,
      staleTime: 1 * 60 * 1000, // 1 minute cache
      cacheKey: `products-${tenantId}`
    }
  );

  // Memoized filtered products for better performance
  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    if (!debouncedSearchTerm) return products;
    
    return products.filter(product =>
      product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      product.product_categories?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [products, debouncedSearchTerm]);

  // Memoized low stock calculation
  const lowStockProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    return products.filter(product => {
      // For products with variants, calculate total stock from variants
      if (product.product_variants && product.product_variants.length > 0) {
        const totalVariantStock = product.product_variants.reduce((total: number, variant: any) => {
          return total + (variant.stock_quantity || 0);
        }, 0);
        return totalVariantStock <= (product.min_stock_level || 0);
      }
      // For products without variants, use main product stock
      return product.stock_quantity <= (product.min_stock_level || 0);
    });
  }, [products]);

  const handleDeleteProduct = async (productId: string) => {
    const product = products?.find(p => p.id === productId);
    
    if (!canDelete('product')) {
      logDeletionAttempt('product', productId, product?.name);
      toast({
        title: "Deletion Disabled",
        description: "Product deletion has been disabled to maintain audit trail and data integrity.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete product image if exists
      if (product?.image_url) {
        const imagePath = product.image_url.split('/').pop();
        if (imagePath) {
          await supabase.storage
            .from('product-images')
            .remove([`${tenantId}/${imagePath}`]);
        }
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "Product has been successfully deleted.",
      });
      
      refetchProducts();
    } catch (error: any) {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const ProductTable = () => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {(() => {
                      // Calculate if product is low stock based on variants or main stock
                      let isLowStock = false;
                      let currentStock = product.stock_quantity || 0;
                      
                      if (product.product_variants && product.product_variants.length > 0) {
                        currentStock = product.product_variants.reduce((total: number, variant: any) => {
                          return total + (variant.stock_quantity || 0);
                        }, 0);
                      }
                      
                      isLowStock = currentStock <= (product.min_stock_level || 0);
                      
                      return isLowStock ? (
                        <Badge variant="destructive" className="text-xs mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low Stock
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                </div>
              </TableCell>
              <TableCell>{product.sku || 'N/A'}</TableCell>
              <TableCell>{product.product_categories?.name || 'None'}</TableCell>
              <TableCell>{formatCurrency(product.price)}</TableCell>
              <TableCell>
                {(() => {
                  // Show total stock including variants
                  if (product.product_variants && product.product_variants.length > 0) {
                    const totalVariantStock = product.product_variants.reduce((total: number, variant: any) => {
                      return total + (variant.stock_quantity || 0);
                    }, 0);
                    const mainStock = product.stock_quantity || 0;
                    return mainStock + totalVariantStock;
                  }
                  return product.stock_quantity || 0;
                })()}
              </TableCell>
              <TableCell>
                <Badge variant={product.is_active ? "secondary" : "outline"}>
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {product.product_variants && product.product_variants.length > 0 ? (
                  <div className="space-y-1">
                    {product.product_variants.slice(0, 2).map((variant: any, index: number) => (
                      <div key={index} className="text-xs flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {variant.name}: {variant.value}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          Stock: {variant.stock_quantity || 0}
                        </span>
                      </div>
                    ))}
                    {product.product_variants.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{product.product_variants.length - 2} more variants
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">No variants</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowProductForm(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{product.name}</DialogTitle>
                        <DialogDescription>Product details and variants</DialogDescription>
                      </DialogHeader>
                      <ProductVariants productId={product.id} />
                    </DialogContent>
                  </Dialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive"
                        disabled={!canDelete('product')}
                        title={!canDelete('product') ? 'Deletion disabled for audit trail' : 'Delete product'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Product</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{product.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteProduct(product.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={!canDelete('product')}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Management</h2>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={refetchProducts}
            title="Refresh product data"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
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

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription className="text-orange-700">
              {lowStockProducts.length} product(s) are running low on stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map(product => {
                // Calculate current stock (including variants)
                let currentStock = product.stock_quantity || 0;
                if (product.product_variants && product.product_variants.length > 0) {
                  currentStock = product.product_variants.reduce((total: number, variant: any) => {
                    return total + (variant.stock_quantity || 0);
                  }, 0);
                }
                
                return (
                  <Badge key={product.id} variant="outline" className="text-orange-700">
                    {product.name} ({currentStock} left)
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm ? 'No products match your search.' : 'Get started by adding your first product.'}
                </p>
                <Button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setShowProductForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ProductTable />
          )}
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManagement onUpdate={refetchProducts} />
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct ? 'Update product information' : 'Create a new product with details, variants, and images'}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            onSuccess={() => {
              setShowProductForm(false);
              setSelectedProduct(null);
              refetchProducts();
            }}
            onCancel={() => {
              setShowProductForm(false);
              setSelectedProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}