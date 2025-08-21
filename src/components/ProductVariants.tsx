import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
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

interface Variant {
  id: string;
  name: string;
  value: string;
  sku: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

interface ProductVariantsProps {
  productId: string;
}

export default function ProductVariants({ productId }: ProductVariantsProps) {
  const { toast } = useToast();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  
  const [variantForm, setVariantForm] = useState({
    name: '',
    value: '',
    sku: '',
    price_adjustment: '0',
    stock_quantity: '0',
    is_active: true,
  });

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    if (!productId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('name');

      if (error) {
        console.error('Variant fetch error:', error);
        throw error;
      }
      
      setVariants(data || []);
    } catch (error: any) {
      console.error('Failed to fetch variants:', error);
      toast({
        title: "Error fetching variants",
        description: error.message || "Failed to load product variants",
        variant: "destructive",
      });
      setVariants([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const variantData = {
        name: variantForm.name,
        value: variantForm.value,
        sku: variantForm.sku || null,
        price_adjustment: parseFloat(variantForm.price_adjustment) || 0,
        stock_quantity: parseInt(variantForm.stock_quantity) || 0,
        is_active: variantForm.is_active,
        product_id: productId,
      };

      let error;
      if (selectedVariant) {
        ({ error } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', selectedVariant.id));
      } else {
        ({ error } = await supabase
          .from('product_variants')
          .insert([variantData]));
      }

      if (error) throw error;

      toast({
        title: selectedVariant ? "Variant updated" : "Variant created",
        description: `${variantForm.name}: ${variantForm.value} has been ${selectedVariant ? 'updated' : 'created'} successfully.`,
      });

      setShowVariantForm(false);
      setSelectedVariant(null);
      setVariantForm({
        name: '',
        value: '',
        sku: '',
        price_adjustment: '0',
        stock_quantity: '0',
        is_active: true,
      });
      fetchVariants();
    } catch (error: any) {
      toast({
        title: "Error saving variant",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;

      toast({
        title: "Variant deleted",
        description: "Variant has been successfully deleted.",
      });

      fetchVariants();
    } catch (error: any) {
      toast({
        title: "Error deleting variant",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openVariantForm = (variant?: Variant) => {
    if (variant) {
      setSelectedVariant(variant);
      setVariantForm({
        name: variant.name,
        value: variant.value,
        sku: variant.sku || '',
        price_adjustment: variant.price_adjustment?.toString() || '0',
        stock_quantity: variant.stock_quantity?.toString() || '0',
        is_active: variant.is_active,
      });
    } else {
      setSelectedVariant(null);
      setVariantForm({
        name: '',
        value: '',
        sku: '',
        price_adjustment: '0',
        stock_quantity: '0',
        is_active: true,
      });
    }
    setShowVariantForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Product Variants</h3>
          <p className="text-muted-foreground">Manage different versions of this product</p>
        </div>
        <Button onClick={() => openVariantForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Variant
        </Button>
      </div>

      {/* Variants List */}
      {variants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Variants Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create variants like different sizes, colors, or styles for this product.
            </p>
            <Button onClick={() => openVariantForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Variant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {variants.map((variant) => (
            <Card key={variant.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {variant.name}: {variant.value}
                    </CardTitle>
                    <CardDescription>
                      {variant.sku && `SKU: ${variant.sku} • `}
                      Stock: {variant.stock_quantity}
                      {variant.price_adjustment !== 0 && (
                        <span className={variant.price_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                          {' • '}
                          {variant.price_adjustment > 0 ? '+' : ''}${variant.price_adjustment}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={variant.is_active ? "secondary" : "outline"}>
                      {variant.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openVariantForm(variant)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Variant</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{variant.name}: {variant.value}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteVariant(variant.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Variant Form Dialog */}
      <Dialog open={showVariantForm} onOpenChange={setShowVariantForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedVariant ? 'Edit Variant' : 'Add New Variant'}
            </DialogTitle>
            <DialogDescription>
              {selectedVariant ? 'Update variant information' : 'Create a new product variant'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVariantSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-name">Variant Type *</Label>
                <Input
                  id="variant-name"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Size, Color, Material"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="variant-value">Variant Value *</Label>
                <Input
                  id="variant-value"
                  value={variantForm.value}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g., Large, Red, Cotton"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="variant-sku">SKU</Label>
              <Input
                id="variant-sku"
                value={variantForm.sku}
                onChange={(e) => setVariantForm(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="Variant-specific SKU"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant-price-adjustment">Price Adjustment</Label>
                <Input
                  id="variant-price-adjustment"
                  type="number"
                  step="0.01"
                  value={variantForm.price_adjustment}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, price_adjustment: e.target.value }))}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Additional cost for this variant (can be negative)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="variant-stock">Stock Quantity</Label>
                <Input
                  id="variant-stock"
                  type="number"
                  value={variantForm.stock_quantity}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="variant-active"
                checked={variantForm.is_active}
                onCheckedChange={(checked) => setVariantForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="variant-active">Active (available for sale)</Label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowVariantForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedVariant ? 'Update' : 'Create'} Variant
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}