import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { PaginationControls } from '@/components/ui/pagination-controls';
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
import { Plus, Search, Filter, Edit, Trash2, Eye, AlertTriangle, Package, Image, RotateCcw, History, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDeletionControl } from '@/hooks/useDeletionControl';
import { useSoftWarnings } from '@/hooks/useSoftWarnings';
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
  purchase_price?: number;
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
  location_id?: string;
  product_categories?: { name: string };
  product_subcategories?: { name: string };
  product_units?: { name: string; abbreviation: string };
  store_locations?: { name: string };
  variants?: any[];
  product_variants?: any[];
}

interface ProductManagementProps {
  refreshSignal?: number;
  onShowProductForm?: (show: boolean) => void;
  onSetSelectedProduct?: (product: Product | null) => void;
  showProductForm?: boolean;
  selectedProduct?: Product | null;
}

export default function ProductManagement({ 
  refreshSignal, 
  onShowProductForm, 
  onSetSelectedProduct,
  showProductForm: externalShowProductForm,
  selectedProduct: externalSelectedProduct
}: ProductManagementProps) {
  const { user, tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const { canDelete, logDeletionAttempt } = useDeletionControl();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [locations, setLocations] = useState<any[]>([]);

  // Centralized warning system
  const {
    showLowStockWarning,
    showNegativeStockWarning,
    showOutOfStockWarning,
  } = useSoftWarnings();

  // Function to show soft warnings for products
  const showProductWarnings = (product: Product) => {
    // Use centralized warning system
    showLowStockWarning(product.name, product.stock_quantity);
    showNegativeStockWarning(product.name, product.stock_quantity);
    
    // Out of stock warning
    if (product.stock_quantity === 0) {
      showOutOfStockWarning(product.name);
    }
  };
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const finalSelectedProduct = externalSelectedProduct !== undefined ? externalSelectedProduct : selectedProduct;
  const finalShowProductForm = externalShowProductForm !== undefined ? externalShowProductForm : showProductForm;
  
  const setFinalSelectedProduct = (product: Product | null) => {
    if (onSetSelectedProduct) {
      onSetSelectedProduct(product);
    } else {
      setSelectedProduct(product);
    }
  };
  
  const setFinalShowProductForm = (show: boolean) => {
    if (onShowProductForm) {
      onShowProductForm(show);
    } else {
      setShowProductForm(show);
    }
  };
  const [activeTab, setActiveTab] = useState('products');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'product'>('all');
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState<'all' | 'low-stock' | 'out-of-stock' | 'expiring'>('all');
  const [expiringIds, setExpiringIds] = useState<Set<string>>(new Set());
  const [hasLoaded, setHasLoaded] = useState(false);
  const didMountRef = useRef(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
 
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

  // Fetch locations for filter
  useEffect(() => {
    if (!tenantId) return;

    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('store_locations')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, [tenantId]);

  // Pagination and data fetching with optimized query
  const {
    data: products = [],
    loading,
    pagination,
    handlePageChange,
    handlePageSizeChange,
    refetch: refetchProducts
  } = usePaginatedQuery<any>(
    'products',
    `
      id,
      name,
      sku,
      description,
      price,
      purchase_price,
      default_profit_margin,
      barcode,
      category_id,
      subcategory_id,
      revenue_account_id,
      unit_id,
      stock_quantity,
      min_stock_level,
      is_active,
      image_url,
      brand_id,
      is_combo_product,
      allow_negative_stock,
      cost_price,
      retail_price,
      wholesale_price,
      created_at,
      updated_at,
      product_categories(name),
      product_subcategories(name),
      product_units(name, abbreviation),
      store_locations(name),
      brands(name),
      product_variants(
        id,
        name,
        value,
        stock_quantity,
        is_active
      )
    `,
    {
      enabled: !!tenantId,
      searchTerm: searchTerm,
      filters: { 
        tenant_id: tenantId,
        ...(locationFilter !== 'all' && { location_id: locationFilter })
      },
      orderBy: { column: 'created_at', ascending: false },
      initialPageSize: 50
    }
  );

  useEffect(() => {
    if (!loading) setHasLoaded(true);
  }, [loading]);

  // Remove the problematic sync to prevent input flickering

  // Memoized refresh function to prevent loops
  const refetch = useMemo(() => {
    return refetchProducts;
  }, [refetchProducts]);

  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) return [];
    
    // No additional filtering needed as search is handled by pagination
    return products;
  }, [products]);

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
              <TableHead className="hidden sm:table-cell">Location</TableHead>
              <TableHead className="hidden md:table-cell">SKU</TableHead>
              <TableHead className="hidden lg:table-cell">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Unit</TableHead>
              <TableHead>Sale Price</TableHead>
              <TableHead className="hidden md:table-cell">Purchase Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Variants</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
           {products.map((product) => (
            <TableRow 
              key={product.id} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => showProductWarnings(product)}
            >
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
                     {useMemo(() => {
                       // Memoize expensive stock calculations
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
                     }, [product.stock_quantity, product.min_stock_level, (product as any).product_variants])}
                  </div>
                </div>
              </TableCell>
               <TableCell className="hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {(product as any).store_locations?.name || 'Main Location'}
                  </span>
                </TableCell>
               <TableCell className="hidden md:table-cell text-sm">{product.sku || 'N/A'}</TableCell>
               <TableCell className="hidden lg:table-cell text-sm">
                 {product.product_categories?.name || 'None'}
               </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {product.product_units?.abbreviation || 'N/A'}
                </TableCell>
                 <TableCell className="text-sm font-medium">{formatCurrency(product.price)}</TableCell>
                 <TableCell className="hidden md:table-cell text-sm font-medium">
                   {formatCurrency(product.purchase_price || product.cost_price || 0)}
                 </TableCell>
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
               <TableCell className="hidden lg:table-cell">
                {product.product_variants && product.product_variants.length > 0 ? (
                  <div className="space-y-1 max-w-xs">
                    {product.product_variants
                      .filter((variant: any) => variant.is_active)
                      .slice(0, 4)
                      .map((variant: any) => (
                      <div key={variant.id} className="flex items-center justify-between gap-2 p-1 bg-muted/30 rounded-sm">
                        <Badge variant="outline" className="text-xs px-1 py-0.5 flex-1 min-w-0">
                          <span className="truncate">{variant.name}: {variant.value}</span>
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground">
                          {variant.stock_quantity || 0}
                        </span>
                      </div>
                    ))}
                    {product.product_variants.filter((v: any) => v.is_active).length > 4 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{product.product_variants.filter((v: any) => v.is_active).length - 4} more
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
              setFinalSelectedProduct(product);
              setFinalShowProductForm(true);
            }}
                     className="h-8 w-8 sm:w-auto px-2"
                   >
                     <Edit className="h-3 w-3 sm:mr-1" />
                     <span className="hidden sm:inline text-xs">Edit</span>
                   </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                       <Button 
                         variant="ghost" 
                         size="sm"
                         className="h-8 w-8 px-2"
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
                         className="h-8 w-8 px-2"
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
                         className="h-8 w-8 px-2 text-destructive"
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
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
             <Select value={locationFilter} onValueChange={setLocationFilter}>
               <SelectTrigger className="w-[180px]">
                 <SelectValue placeholder="All Locations" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Locations</SelectItem>
                 {locations.map((location) => (
                   <SelectItem key={location.id} value={location.id}>
                     {location.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>

           {/* Products Table */}
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
                    setFinalSelectedProduct(null);
                    setFinalShowProductForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
           ) : (
             <>
               <ProductTable />
               
               {/* Pagination Controls */}
               <PaginationControls
                 pagination={pagination}
                 onPageChange={handlePageChange}
                 onPageSizeChange={handlePageSizeChange}
                 isLoading={loading}
               />
             </>
           )}
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManagement onUpdate={refetchProducts} />
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
              <Dialog open={finalShowProductForm} onOpenChange={setFinalShowProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
                          <DialogTitle>
                {finalSelectedProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <DialogDescription>
                {finalSelectedProduct ? 'Update product information' : 'Create a new product with details, variants, and images'}
              </DialogDescription>
          </DialogHeader>
          <ProductForm
            product={finalSelectedProduct}
            onSuccess={() => {
              setFinalShowProductForm(false);
              setFinalSelectedProduct(null);
              // Refresh products after successful form submission
              if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
              }
              refreshTimeoutRef.current = setTimeout(() => refetchProducts(), 300);
            }}
            onCancel={() => {
              setFinalShowProductForm(false);
              setFinalSelectedProduct(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}