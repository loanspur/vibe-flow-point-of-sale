import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBrandCRUD } from '@/hooks/useUnifiedCRUD';
import { brandSchema, BrandFormData } from '@/lib/validation-schemas';

interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  tenant_id: string;
}

export default function BrandManagement() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  // Use unified CRUD hook
  const { create: createBrand, update: updateBrand, delete: deleteBrand, isCreating, isUpdating, isDeleting } = useBrandCRUD();

  // Use TanStack Query for data fetching
  const { data: brands = [], isLoading: loading } = useQuery({
    queryKey: ['brands', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      description: '',
      logo_url: '',
      is_active: true,
    },
  });

  // Data is automatically fetched by TanStack Query

  const onSubmit = async (data: BrandFormData) => {
    try {
      if (editingBrand) {
        updateBrand({ id: editingBrand.id, data });
      } else {
        createBrand(data);
      }

      setShowForm(false);
      setEditingBrand(null);
      form.reset();
    } catch (error: any) {
      console.error('Error saving brand:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save brand',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingBrand) return;

    try {
      // Check if brand is used by any products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .eq('brand_id', deletingBrand.id)
        .eq('tenant_id', tenantId);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        toast({
          title: 'Cannot Delete',
          description: `This brand is used by ${products.length} product(s). Remove the brand from all products first.`,
          variant: 'destructive',
        });
        return;
      }

      // Use unified CRUD delete (soft delete)
      deleteBrand(deletingBrand.id);
      setDeletingBrand(null);
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete brand',
        variant: 'destructive',
      });
    }
  };

  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setEditingBrand(null);
    form.reset();
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Management</h2>
          <p className="text-muted-foreground">Manage your product brands</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? 'Edit Brand' : 'Add New Brand'}
              </DialogTitle>
              <DialogDescription>
                {editingBrand ? 'Update brand information' : 'Create a new brand for your products'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter brand name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Enter brand description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  {...form.register('logo_url')}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : editingBrand ? 'Update Brand' : 'Create Brand'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Brands Table */}
      <Card>
        <CardHeader>
          <CardTitle>Brands ({filteredBrands.length})</CardTitle>
          <CardDescription>
            Manage your product brands and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading brands...</div>
          ) : filteredBrands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No brands found matching your search' : 'No brands created yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      {brand.description ? (
                        <span className="text-sm text-muted-foreground">
                          {brand.description.length > 50
                            ? `${brand.description.substring(0, 50)}...`
                            : brand.description}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={`${brand.name} logo`}
                          className="w-8 h-8 object-contain rounded"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">No logo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(brand)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingBrand(brand)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Brand</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{brand.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeletingBrand(null)}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}