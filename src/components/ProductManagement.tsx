import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Search, Filter, Edit, Trash2, Eye, AlertTriangle, Package, Image, RotateCcw, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDeletionControl } from '@/hooks/useDeletionControl';
import { useLocation } from 'react-router-dom';
import ProductForm from './ProductForm';

import CategoryManagement from './CategoryManagement';
import ProductVariants from './ProductVariants';
import ProductHistory from './ProductHistory';
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
  default_profit_margin?: number;
  stock_quantity: number;
  min_stock_level: number;
  description?: string;
  barcode?: string;
  image_url: string;
  is_active: boolean;
  category_id: string;
  subcategory_id: string;
  unit_id?: string;
  product_categories?: { name: string };
  product_subcategories?: { name: string };
  product_units?: { name: string; abbreviation: string };
  variants?: any[];
  product_variants?: any[];
}

export default function ProductManagement({ refreshSignal }: { refreshSignal?: number }) {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const { canDelete, logDeletionAttempt } = useDeletionControl();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'product'>('all');
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'expiring'>('all');
  const [expiringIds, setExpiringIds] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const didMountRef = useRef(false);
 
   useEffect(() => {
    const params = new URLSearchParams(location.search);
    const f = params.get('filter') as 'low-stock' | 'out-of-stock' | 'expiring' | null;
    setActiveFilter(f || 'all');
  }, [location.search]);

  useEffect(() => {
    if (activeFilter !== 'expiring' || !tenantId) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    supabase
      .from('purchase_items')
      .select('product_id')
      .gte('expiry_date', todayStr)
      .lte('expiry_date', next30)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching expiring items', error);
        } else {
          setExpiringIds(new Set((data || []).map((d: any) => d.product_id)));
        }
      });
  }, [activeFilter, tenantId]);

  // Optimized product fetching with minimal fields and caching
  const { data: products = [], loading, refetch: refetchProducts } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: [], error: null };
      
        const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories(name),
          product_subcategories(name),
          product_units(name, abbreviation),
          product_variants(
            id,
            name,
            value,
            stock_quantity,
            price_adjustment,
            is_active
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    },
    [tenantId, refreshSignal],
    {
      enabled: !!tenantId,
      staleTime: 0, // No cache for real-time updates
      cacheKey: `products-list-${tenantId}-${Date.now()}`
    }
  );

  useEffect(() => {
    if (!loading) setHasLoaded(true);
  }, [loading]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (typeof refreshSignal !== 'undefined') {
      refetchProducts();
    }
  }, [refreshSignal, refetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    const getTotalStock = (product: any) => {
      if ((product as any).product_variants && (product as any).product_variants.length > 0) {
        const totalVariantStock = (product as any).product_variants.reduce((total: number, variant: any) => {
          return total + (variant.stock_quantity || 0);
        }, 0);
        return (product.stock_quantity || 0) + totalVariantStock;
      }
      return product.stock_quantity || 0;
    };
    
    let filtered = products as any[];
    
    // Apply active filter from URL
    if (activeFilter === 'low-stock') {
      filtered = filtered.filter((product: any) => getTotalStock(product) <= (product.min_stock_level || 0));
    } else if (activeFilter === 'out-of-stock') {
      filtered = filtered.filter((product: any) => getTotalStock(product) === 0);
    } else if (activeFilter === 'expiring') {
      filtered = filtered.filter((product: any) => expiringIds.has(product.id));
    }
    
    // Filter by search term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [products, debouncedSearchTerm, activeFilter, expiringIds]);

  // Memoized low stock calculation
  const lowStockProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    return products.filter(product => {
      
      // For products with variants, calculate total stock from variants
      if ((product as any).product_variants && (product as any).product_variants.length > 0) {
        const totalVariantStock = (product as any).product_variants.reduce((total: number, variant: any) => {
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
    <Card className="mobile-card">
      <div className="mobile-table-wrapper">
        <Table className="mobile-table">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Product</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Unit</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden xl:table-cell">Variants</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {filteredProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">{product.name}</div>
                     {(() => {
                       // Calculate if product is low stock based on variants or main stock
                      
                      let isLowStock = false;
                      let currentStock = product.stock_quantity || 0;
                      
                      if ((product as any).product_variants && (product as any).product_variants.length > 0) {
                        currentStock = (product as any).product_variants.reduce((total: number, variant: any) => {
                          return total + (variant.stock_quantity || 0);
                        }, 0);
                      }
                      
                      isLowStock = currentStock <= (product.min_stock_level || 0);
                      
                      return isLowStock ? (
                        <Badge variant="destructive" className="text-xs mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Low Stock</span>
                          <span className="sm:hidden">Low</span>
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                </div>
              </TableCell>
               <TableCell className="hidden sm:table-cell">
                 <Badge variant="secondary" className="text-xs">
                   Product
                 </Badge>
               </TableCell>
               <TableCell className="hidden md:table-cell text-sm">{product.sku || 'N/A'}</TableCell>
               <TableCell className="hidden lg:table-cell text-sm">
                 {product.product_categories?.name || 'None'}
               </TableCell>
               <TableCell className="hidden lg:table-cell text-sm">
                 {product.product_units?.abbreviation || 'N/A'}
               </TableCell>
               <TableCell className="text-sm font-medium">{formatCurrency(product.price)}</TableCell>
               <TableCell className="text-sm">
                 {(() => {
                   // Show total stock including variants
                   if ((product as any).product_variants && (product as any).product_variants.length > 0) {
                     const totalVariantStock = (product as any).product_variants.reduce((total: number, variant: any) => {
                       return total + (variant.stock_quantity || 0);
                     }, 0);
                     const mainStock = product.stock_quantity || 0;
                     return mainStock + totalVariantStock;
                   }
                   return product.stock_quantity || 0;
                 })()}
               </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={product.is_active ? "secondary" : "outline"} className="text-xs">
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
               <TableCell className="hidden xl:table-cell">
                {product.product_variants && product.product_variants.length > 0 ? (
                  <div className="space-y-1">
                    {product.product_variants.slice(0, 2).map((variant: any, index: number) => (
                      <div key={index} className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          {variant.name}: {variant.value}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
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
                <div className="flex justify-end gap-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowProductForm(true);
                    }}
                    className="h-8 w-8 sm:w-auto px-2 hover:bg-primary hover:text-primary-foreground transition-colors duration-150"
                  >
                    <Edit className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline text-xs">Edit</span>
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 px-2 hover:bg-muted transition-colors duration-150"
                        title="View variants"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{product.name}</DialogTitle>
                        <DialogDescription>Product details and variants</DialogDescription>
                      </DialogHeader>
                      <ProductVariants productId={product.id} />
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="View history"
                        className="h-8 w-8 px-2 hover:bg-muted transition-colors duration-150"
                      >
                        <History className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Product History</DialogTitle>
                        <DialogDescription>View all changes made to this product</DialogDescription>
                      </DialogHeader>
                      <ProductHistory productId={product.id} productName={product.name} />
                    </DialogContent>
                  </Dialog>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 px-2 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors duration-150"
                        disabled={!canDelete('product')}
                        title={!canDelete('product') ? 'Deletion disabled for audit trail' : 'Delete product'}
                      >
                        <Trash2 className="h-3 w-3" />
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
      </div>
    </Card>
  );

  if (loading && !hasLoaded) {
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
            onClick={() => {
              setHasLoaded(false);
              refetchProducts();
            }}
            disabled={loading}
            title="Refresh product data"
          >
            <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                if ((product as any).product_variants && (product as any).product_variants.length > 0) {
                  currentStock = (product as any).product_variants.reduce((total: number, variant: any) => {
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
             <Select value={productTypeFilter} onValueChange={(value: 'all' | 'product') => setProductTypeFilter(value)}>
               <SelectTrigger className="w-48">
                 <SelectValue placeholder="Filter by type" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Products</SelectItem>
                 <SelectItem value="product">Active Products</SelectItem>
               </SelectContent>
             </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || productTypeFilter !== 'all' ? 'No items match your search criteria.' : 'Get started by adding your first product.'}
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