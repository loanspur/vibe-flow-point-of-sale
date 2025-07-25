import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FeatureGuard } from '@/components/FeatureGuard';

interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

const brandSchema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  description: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
});

type BrandFormData = z.infer<typeof brandSchema>;

export const BrandManagement = () => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      description: '',
      logo_url: '',
    },
  });

  const { data: brands, isLoading } = useQuery({
    queryKey: ['brands', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      return data as Brand[];
    },
    enabled: !!tenantId,
  });

  const createBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      const { error } = await supabase
        .from('brands')
        .insert({
          name: data.name,
          description: data.description || null,
          logo_url: data.logo_url || null,
          tenant_id: tenantId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Brand created successfully' });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: 'Error creating brand', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      if (!editingBrand) return;
      
      const { error } = await supabase
        .from('brands')
        .update(data)
        .eq('id', editingBrand.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Brand updated successfully' });
      setIsDialogOpen(false);
      setEditingBrand(null);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating brand', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (brandId: string) => {
      const { error } = await supabase
        .from('brands')
        .update({ is_active: false })
        .eq('id', brandId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast({ title: 'Brand deleted successfully' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting brand', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const onSubmit = (data: BrandFormData) => {
    if (editingBrand) {
      updateBrandMutation.mutate(data);
    } else {
      createBrandMutation.mutate(data);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (brandId: string) => {
    if (confirm('Are you sure you want to delete this brand?')) {
      deleteBrandMutation.mutate(brandId);
    }
  };

  return (
    <FeatureGuard featureName="enable_brands">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Brand Management
              </CardTitle>
              <CardDescription>
                Manage product brands for better organization
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingBrand ? 'Edit Brand' : 'Add New Brand'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingBrand ? 'Update brand information' : 'Create a new product brand'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter brand name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter brand description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="logo_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter logo URL" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingBrand(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createBrandMutation.isPending || updateBrandMutation.isPending}
                      >
                        {editingBrand ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading brands...</div>
          ) : !brands?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No brands found. Create your first brand to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <div 
                  key={brand.id} 
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{brand.name}</h3>
                      {brand.description && (
                        <p className="text-sm text-muted-foreground">{brand.description}</p>
                      )}
                    </div>
                    <Badge variant={brand.is_active ? 'default' : 'secondary'}>
                      {brand.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {brand.logo_url && (
                    <img 
                      src={brand.logo_url} 
                      alt={brand.name}
                      className="w-16 h-16 object-contain rounded"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(brand)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(brand.id)}
                      disabled={deleteBrandMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </FeatureGuard>
  );
};