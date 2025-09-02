import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

import { useTenantProductsList } from '@/features/products/hooks/useTenantProductsList';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

export default function ProductsTab() {
  const navigate = useNavigate();
  const { tenantId } = useAuth();

  const { data: products = [], isLoading, refetch } = useTenantProductsList();

  // Add/Edit form state
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

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
    if (!error) refetch();
    // optional: toast on success/error (left out to avoid UI churn)
  };

  const openAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);           // ✅ open in-place dialog instead of redirecting
    setShowForm(true);
  };

  const onFormClose = (didSave?: boolean) => {
    setShowForm(false);
    setEditingProduct(null);
    if (didSave) refetch();
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
      {/* top toolbar: Add button only (refresh button removed) */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {products.length} product{products.length === 1 ? '' : 's'}
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Product</TableHead>
              <TableHead className="w-[14%]">SKU</TableHead>
              <TableHead className="w-[16%]">Location</TableHead>
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
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((p: any) => {
                const name = p.name ?? p.title ?? p.product_name ?? '—';
                const sku = p.sku ?? '—';
                const locationName = p.location_name ?? '—';
                const retail = p.retail_price_num ?? p.retail_price ?? null;
                const wholesale = p.wholesale_price_num ?? p.wholesale_price ?? null;
                const stock = p.stock_quantity ?? 0;
                const stLabel = statusLabel(p.status ?? p.is_active ?? p.active);

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{sku}</TableCell>
                    <TableCell className="whitespace-pre-line">{locationName}</TableCell>
                    <TableCell>{money(retail)}</TableCell>
                    <TableCell>{money(wholesale)}</TableCell>
                    <TableCell className="text-right">{stock}</TableCell>
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
                          onClick={() => navigate(`/admin/products/${p.id}`)}
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
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
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
    </div>
  );
}
