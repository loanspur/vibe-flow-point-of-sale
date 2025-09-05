import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus, Search, Filter, X, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

import { useTenantProductsList } from '@/features/products/hooks/useTenantProductsList';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useStockWithRefresh, useUnifiedStock } from '@/hooks/useUnifiedStock';
import { formatStockQuantity } from '@/utils/commonUtils';

// 👉 if you already have ProductFormUnified, re-use it here:
import ProductFormUnified from '@/components/ProductFormUnified'; // keep your existing form component

const money = (v: unknown) => {
  const n = v === null || v === undefined ? null : Number(v);
  if (n === null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
};

const statusLabel = (raw: unknown) => {
  if (typeof raw === 'boolean') return raw ? 'Active' : 'Inactive';
  if (raw === null || raw === undefined || raw === '') return 'Active'; // Default to Active
  // strings like 'active' / 'inactive' / 'draft'
  return String(raw);
};

// Unified Stock Display Component
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
    <span className={displayStock > 0 ? 'text-green-600' : 'text-red-600'}>
      {formatStockQuantity(displayStock)}
    </span>
  );
};

export default function ProductsTab() {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { calculateStock } = useUnifiedStock();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, refetch } = useTenantProductsList();


  // Add/Edit form state
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Product preview state
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewCalculatedStock, setPreviewCalculatedStock] = useState<number | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtered products based on search and location
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter - search across multiple fields
      const searchLower = debouncedSearchQuery.toLowerCase();
      const matchesSearch = debouncedSearchQuery === '' || 
        product.name?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower) ||
        product.brand_name?.toLowerCase().includes(searchLower) ||
        product.category_name?.toLowerCase().includes(searchLower);

      // Location filter
      const matchesLocation = selectedLocation === 'all' || 
        product.location_id === selectedLocation;

      return matchesSearch && matchesLocation;
    });
  }, [products, debouncedSearchQuery, selectedLocation]);

  // Get unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = products
      .map(p => ({ id: p.location_id, name: p.location_name }))
      .filter(loc => loc.id && loc.name)
      .filter((loc, index, self) => 
        index === self.findIndex(l => l.id === loc.id)
      );
    return locations;
  }, [products]);

  // Debounced search to improve performance
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Delete confirmation state
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const confirmDelete = async () => {
    if (!productToDelete) return;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productToDelete.id)
      .eq('tenant_id', tenantId);
    setProductToDelete(null);
    if (!error) {
      // Invalidate and refetch products data after successful deletion
      queryClient.invalidateQueries({ queryKey: ['products:list', tenantId] });
      refetch();
    }
  };

  const openAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setShowForm(true);
  };

  const openPreview = async (p: any) => {
    setPreviewProduct(p);
    setShowPreview(true);
    
    // Calculate the actual stock using the same logic as the products table
    if (p.id) {
      try {
        const stockResult = await calculateStock(p.id, p.location_id);
        setPreviewCalculatedStock(stockResult.stock);
      } catch (error) {
        setPreviewCalculatedStock(null);
      }
    }
  };

  const onFormClose = (didSave?: boolean) => {
    setShowForm(false);
    setEditingProduct(null);
    if (didSave) {
      // Invalidate and refetch products data for real-time updates
      queryClient.invalidateQueries({ queryKey: ['products:list', tenantId] });
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground">Loading products…</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search and Filter Toolbar */}
      <div className="mb-4 space-y-3">
        {/* Search Bar and Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products by name, SKU, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Location Filter */}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {/* Right side: Add Product Button */}
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Location:</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Clear Filters Button */}
              {(searchQuery !== '' || selectedLocation !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                    setSelectedLocation('all');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} product{filteredProducts.length === 1 ? '' : 's'}
          {debouncedSearchQuery && ` matching "${debouncedSearchQuery}"`}
          {selectedLocation !== 'all' && ` in selected location`}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24%]">Product</TableHead>
              <TableHead className="w-[12%]">Category</TableHead>
              <TableHead className="w-[12%]">SKU</TableHead>
              <TableHead className="w-[14%]">Location</TableHead>
              <TableHead className="w-[10%]">Retail Price</TableHead>
              <TableHead className="w-[10%]">Wholesale Price</TableHead>
              <TableHead className="w-[8%] text-right">Stock</TableHead>
              <TableHead className="w-[6%]">Status</TableHead>
              <TableHead className="w-[8%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  {products.length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-lg font-medium">No products found</p>
                      <p className="text-sm">Create your first product to get started</p>
                      <Button onClick={openAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-lg font-medium">No products match your filters</p>
                      <p className="text-sm">
                        {debouncedSearchQuery && `No products found matching "${debouncedSearchQuery}"`}
                        {selectedLocation !== 'all' && ` in the selected location`}
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSearchQuery('');
                          setDebouncedSearchQuery('');
                          setSelectedLocation('all');
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p: any) => {
                const name = p.name ?? p.title ?? p.product_name ?? '—';
                const sku = p.sku ?? '—';
                const categoryName = p.category_name ?? '—';
                const locationName = p.location_name ?? '—';
                const retail = p.retail_price_num ?? p.retail_price ?? null;
                const wholesale = p.wholesale_price_num ?? p.wholesale_price ?? null;
                const stock = p.stock_quantity ?? 0;
                const stLabel = statusLabel(p.status ?? p.is_active ?? p.active);

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {/* Product Image Badge */}
                        {p.image_url ? (
                          <div className="w-8 h-8 rounded-md overflow-hidden border border-border flex-shrink-0">
                            <img 
                              src={p.image_url} 
                              alt={name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground">📦</span>
                          </div>
                        )}
                        {/* Product Name */}
                        <span className="truncate">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-1 text-xs font-medium">
                        {categoryName}
                      </span>
                    </TableCell>
                    <TableCell>{sku}</TableCell>
                    <TableCell className="whitespace-pre-line">{locationName}</TableCell>
                    <TableCell>{money(retail)}</TableCell>
                    <TableCell>{money(wholesale)}</TableCell>
                    <TableCell className="text-right">
                      <StockDisplay 
                        productId={p.id} 
                        locationId={p.location_id} 
                        fallbackStock={stock}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {stLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View details"
                          onClick={() => openPreview(p)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => openEdit(p)}   // ✅ opens the unified form dialog (fixes wrong redirect)
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setProductToDelete(p)}  // ✅ opens confirm dialog (no alert)
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit dialog (uses your existing product form) */}
      <Dialog open={showForm} onOpenChange={(open) => !open && onFormClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product information and settings.' : 'Create a new product with details, pricing, and inventory settings.'}
            </DialogDescription>
          </DialogHeader>
          <ProductFormUnified
            product={editingProduct || undefined}
            onClose={(saved: boolean) => onFormClose(saved)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              View complete product information and settings.
            </DialogDescription>
          </DialogHeader>
          {previewProduct && (
            <div className="space-y-4">
              {/* Product Image */}
              {previewProduct.image_url && (
                <div className="flex justify-center mb-4">
                  <div className="w-32 h-32 rounded-lg overflow-hidden border">
                    <img 
                      src={previewProduct.image_url} 
                      alt={previewProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Product Name</Label>
                  <p className="text-sm">{previewProduct.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                  <p className="text-sm">{previewProduct.sku || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p className="text-sm">{previewProduct.category_name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Brand</Label>
                  <p className="text-sm">{previewProduct.brand_name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p className="text-sm">{previewProduct.location_name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Unit</Label>
                  <p className="text-sm">{previewProduct.unit_name || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Retail Price</Label>
                  <p className="text-sm">{money(previewProduct.retail_price_num || previewProduct.retail_price)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Wholesale Price</Label>
                  <p className="text-sm">{money(previewProduct.wholesale_price_num || previewProduct.wholesale_price)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cost Price</Label>
                  <p className="text-sm">{money(previewProduct.cost_price)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Stock Quantity</Label>
                  <p className="text-sm">{formatStockQuantity(previewProduct.stock_quantity)}</p>
                  {previewCalculatedStock !== null && previewCalculatedStock !== previewProduct.stock_quantity && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <p>📊 <strong>Calculated Stock:</strong> {formatStockQuantity(previewCalculatedStock)}</p>
                      <p className="text-amber-600">⚠️ Includes adjustments and recent sales</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Min Stock Level</Label>
                  <p className="text-sm">{previewProduct.min_stock_level ? formatStockQuantity(previewProduct.min_stock_level) : 'Not set'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <p className="text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      previewProduct.status === 'active' || previewProduct.status === true 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {statusLabel(previewProduct.status)}
                    </span>
                  </p>
                </div>
              </div>
              
              {previewProduct.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{previewProduct.description}</p>
                </div>
              )}
              
              {previewProduct.barcode && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Barcode</Label>
                  <p className="text-sm">{previewProduct.barcode}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowPreview(false);
                  openEdit(previewProduct);
                }}>
                  Edit Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
