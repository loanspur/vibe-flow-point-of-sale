import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTenantProductsList } from '@/features/products/hooks/useTenantProductsList';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const money = (v: unknown) => {
  const n = v === null || v === undefined ? null : Number(v);
  if (n === null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n);
};

const getStatusBadge = (status: string | null) => {
  if (!status) return <Badge variant="secondary">Unknown</Badge>;
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('active') || statusLower.includes('in stock')) {
    return <Badge variant="default">Active</Badge>;
  } else if (statusLower.includes('inactive') || statusLower.includes('discontinued')) {
    return <Badge variant="secondary">Inactive</Badge>;
  } else if (statusLower.includes('low stock') || statusLower.includes('out of stock')) {
    return <Badge variant="destructive">Low Stock</Badge>;
  } else if (statusLower.includes('pending') || statusLower.includes('draft')) {
    return <Badge variant="outline">Pending</Badge>;
  }
  
  return <Badge variant="secondary">{status}</Badge>;
};

export default function ProductsTab() {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { data: products = [], isLoading, refetch } = useTenantProductsList();
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);

  // Fetch locations for products
  useEffect(() => {
    const fetchLocations = async () => {
      if (!tenantId || products.length === 0) return;

      const locationIds = Array.from(
        new Set(products.map(p => p.location_id).filter(Boolean))
      );

      if (locationIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('store_locations')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .in('id', locationIds);

        if (!error && data) {
          const locationMap = Object.fromEntries(
            data.map(loc => [loc.id, loc.name])
          );
          setLocations(locationMap);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, [tenantId, products]);

  const handleAddProduct = () => {
    navigate('/admin/products/new');
  };

  const handleEdit = (product: any) => {
    navigate(`/admin/products/${product.id}/edit`);
  };

  const handleDelete = (product: any) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;
      
      // Refresh the product list
      refetch();
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const handlePreview = (product: any) => {
    setSelectedProduct(product);
    setPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[220px]">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {products.length} product{products.length === 1 ? '' : 's'}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
          <Button onClick={handleAddProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Product</TableHead>
              <TableHead className="w-[15%]">SKU</TableHead>
              <TableHead className="w-[15%]">Location</TableHead>
              <TableHead className="w-[12%]">Retail Price</TableHead>
              <TableHead className="w-[12%]">Wholesale Price</TableHead>
              <TableHead className="w-[8%] text-right">Stock</TableHead>
              <TableHead className="w-[8%]">Status</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  <div className="space-y-4">
                    <p className="text-lg font-medium">No products found</p>
                    <p className="text-sm">Create your first product to get started</p>
                    <Button onClick={handleAddProduct}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map((p: any) => {
                const name = p.name ?? p.title ?? p.product_name ?? '—';
                const sku = p.sku ?? '—';
                const locationName = locations[p.location_id] ?? '—';
                const retail = p.retail_price_num ?? p.retail_price ?? null;
                const wholesale = p.wholesale_price_num ?? p.wholesale_price ?? null;
                const stock = p.stock_quantity ?? 0;
                const status = p.status ?? '—';

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{sku}</TableCell>
                    <TableCell>{locationName}</TableCell>
                    <TableCell>{money(retail)}</TableCell>
                    <TableCell>{money(wholesale)}</TableCell>
                    <TableCell className="text-right">{stock}</TableCell>
                    <TableCell>{getStatusBadge(status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View details"
                          onClick={() => handlePreview(p)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit product"
                          onClick={() => handleEdit(p)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete product"
                          onClick={() => handleDelete(p)}
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

      {/* Product Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Image */}
              {selectedProduct.image_url && (
                <div className="flex justify-center">
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="max-w-full h-64 object-cover rounded-lg border shadow-sm"
                  />
                </div>
              )}
              
              {/* Product Information Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                  <p className="text-base font-medium mt-1">{selectedProduct.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="text-base font-mono mt-1">{selectedProduct.sku || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-base mt-1">{locations[selectedProduct.location_id] || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedProduct.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                  <p className="text-base font-medium mt-1">{selectedProduct.stock_quantity || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Min Stock Level</label>
                  <p className="text-base mt-1">{selectedProduct.min_stock_level || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Retail Price</label>
                  <p className="text-base font-medium text-green-600 mt-1">
                    {money(selectedProduct.retail_price_num)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Wholesale Price</label>
                  <p className="text-base font-medium text-blue-600 mt-1">
                    {money(selectedProduct.wholesale_price_num)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="text-base mt-1">{selectedProduct.category_name || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Brand</label>
                  <p className="text-base mt-1">{selectedProduct.brand_name || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit</label>
                  <p className="text-base mt-1">{selectedProduct.unit_name || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                  <p className="text-base mt-1">
                    {selectedProduct.created_at 
                      ? new Date(selectedProduct.created_at).toLocaleDateString('en-KE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '—'
                    }
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-base mt-2 p-3 bg-muted rounded-lg">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cost Price</label>
                  <p className="text-base mt-1">{money(selectedProduct.cost_price)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Weight</label>
                  <p className="text-base mt-1">
                    {selectedProduct.weight ? `${selectedProduct.weight} kg` : '—'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                  <p className="text-base mt-1">
                    {selectedProduct.length && selectedProduct.width && selectedProduct.height
                      ? `${selectedProduct.length} × ${selectedProduct.width} × ${selectedProduct.height} cm`
                      : '—'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                  <p className="text-base font-mono mt-1">{selectedProduct.barcode || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
