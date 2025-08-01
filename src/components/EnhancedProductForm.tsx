import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Package, Barcode, Shield, Layers, Clock } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Product/Service name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  brand_id: z.string().optional(),
  unit_id: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  default_profit_margin: z.number().min(0, 'Profit margin must be positive').max(100, 'Profit margin cannot exceed 100%').optional(),
  stock_quantity: z.number().min(0, 'Stock quantity must be positive'),
  has_expiry_date: z.boolean().default(false),
  is_combo_product: z.boolean().default(false),
  allow_negative_stock: z.boolean().default(false),
  warranty_period_months: z.number().min(0).optional(),
  warranty_type: z.string().optional(),
  warranty_terms: z.string().optional(),
  product_type: z.enum(['product', 'service']).default('product'),
  is_billable: z.boolean().default(true),
  service_duration_minutes: z.number().min(0).optional(),
  requires_appointment: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

interface EnhancedProductFormProps {
  productId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const EnhancedProductForm = ({ productId, onSuccess, onCancel }: EnhancedProductFormProps) => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasFeature } = useFeatureAccess();
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      price: 0,
      default_profit_margin: 0,
      stock_quantity: 0,
      has_expiry_date: false,
      is_combo_product: false,
      allow_negative_stock: false,
      warranty_period_months: 0,
      warranty_type: 'manufacturer',
      warranty_terms: '',
      product_type: 'product',
      is_billable: true,
      service_duration_minutes: 0,
      requires_appointment: false,
    },
  });

  // Generate unique SKU function
  const generateUniqueSKU = async (productName: string): Promise<string> => {
    if (!productName || !tenantId) return '';
    
    // Generate SKU from product name: Take first 3 letters + timestamp + random
    const namePrefix = productName
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .substring(0, 3)
      .toUpperCase();
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
      const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random number
      const potentialSKU = `${namePrefix}${timestamp}${randomSuffix}`;
      
      // Check if SKU exists in database
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('sku', potentialSKU)
        .maybeSingle();
      
      if (!existingProduct) {
        return potentialSKU;
      }
      
      attempts++;
      // Add small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    // Fallback: use UUID-like suffix if all attempts failed
    const fallbackSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${namePrefix}${fallbackSuffix}`;
  };

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && hasFeature('enable_brands'),
  });

  // Fetch product units
  const { data: units } = useQuery({
    queryKey: ['product_units', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_units')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && hasFeature('enable_product_units'),
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch existing product for editing
  const { data: existingProduct } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          warranty_info (*)
        `)
        .eq('id', productId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  // Set form values when editing
  useEffect(() => {
    if (existingProduct) {
      const warrantyInfo = Array.isArray(existingProduct.warranty_info) ? existingProduct.warranty_info[0] : null;
      
      form.reset({
        name: existingProduct.name,
        description: existingProduct.description || '',
        sku: existingProduct.sku || '',
        barcode: existingProduct.barcode || '',
        category_id: existingProduct.category_id || '',
        subcategory_id: existingProduct.subcategory_id || '',
        brand_id: existingProduct.brand_id || '',
        unit_id: existingProduct.unit_id || '',
        price: existingProduct.price || 0,
        default_profit_margin: existingProduct.default_profit_margin || 0,
        stock_quantity: existingProduct.stock_quantity || 0,
        has_expiry_date: existingProduct.has_expiry_date || false,
        is_combo_product: existingProduct.is_combo_product || false,
        allow_negative_stock: existingProduct.allow_negative_stock || false,
        warranty_period_months: warrantyInfo?.warranty_period_months || 0,
        warranty_type: warrantyInfo?.warranty_type || 'manufacturer',
        warranty_terms: warrantyInfo?.warranty_terms || '',
        product_type: (existingProduct as any)?.product_type || 'product',
        is_billable: (existingProduct as any)?.is_billable ?? true,
        service_duration_minutes: (existingProduct as any)?.service_duration_minutes || 0,
        requires_appointment: (existingProduct as any)?.requires_appointment || false,
      });
    }
  }, [existingProduct, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      // Ensure we have a unique SKU for new products
      let finalSKU = data.sku;
      if (!productId && (!finalSKU || finalSKU.trim() === '')) {
        finalSKU = await generateUniqueSKU(data.name);
      } else if (!productId && finalSKU) {
        // Check if the provided SKU is unique
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('sku', finalSKU)
          .maybeSingle();
        
        if (existingProduct) {
          // SKU exists, generate a new one
          finalSKU = await generateUniqueSKU(data.name);
        }
      }

      const productData = {
        name: data.name,
        description: data.description || null,
        sku: finalSKU || null,
        barcode: data.barcode || null,
        category_id: data.category_id || null,
        subcategory_id: data.subcategory_id || null,
        brand_id: hasFeature('enable_brands') ? (data.brand_id || null) : null,
        unit_id: hasFeature('enable_product_units') ? (data.unit_id || null) : null,
        price: data.price,
        default_profit_margin: data.default_profit_margin || null,
        stock_quantity: data.product_type === 'service' ? 0 : data.stock_quantity,
        has_expiry_date: data.product_type === 'service' ? false : data.has_expiry_date,
        is_combo_product: hasFeature('enable_combo_products') ? data.is_combo_product : false,
        allow_negative_stock: hasFeature('enable_negative_stock') ? data.allow_negative_stock : false,
        product_type: data.product_type,
        is_billable: data.is_billable,
        service_duration_minutes: data.product_type === 'service' ? (data.service_duration_minutes || null) : null,
        requires_appointment: data.product_type === 'service' ? data.requires_appointment : false,
        tenant_id: tenantId,
      };

      let savedProductId = productId;

      if (productId) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);
        
        if (error) throw error;
      } else {
        // Create new product
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        
        if (error) throw error;
        savedProductId = newProduct.id;
      }

      // Handle warranty information if enabled
      if (hasFeature('enable_warranty') && savedProductId) {
        if (data.warranty_period_months && data.warranty_period_months > 0) {
          const warrantyData = {
            product_id: savedProductId,
            warranty_period_months: data.warranty_period_months,
            warranty_type: data.warranty_type || 'manufacturer',
            warranty_terms: data.warranty_terms || null,
          };

          // Check if warranty info already exists
          const { data: existingWarranty } = await supabase
            .from('warranty_info')
            .select('id')
            .eq('product_id', savedProductId)
            .single();

          if (existingWarranty) {
            // Update existing warranty
            const { error } = await supabase
              .from('warranty_info')
              .update(warrantyData)
              .eq('product_id', savedProductId);
            
            if (error) throw error;
          } else {
            // Create new warranty
            const { error } = await supabase
              .from('warranty_info')
              .insert(warrantyData);
            
            if (error) throw error;
          }
        } else {
          // Remove warranty if period is 0
          await supabase
            .from('warranty_info')
            .delete()
            .eq('product_id', savedProductId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: productId ? 'Product updated successfully' : 'Product created successfully' });
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        title: 'Error saving product', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {productId ? 'Edit Product/Service' : 'Add New Product/Service'}
        </CardTitle>
        <CardDescription>
          {productId ? 'Update product or service information' : 'Create a new product or service with advanced features'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter SKU" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter product/service description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="product_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="product">📦 Product</SelectItem>
                            <SelectItem value="service">🛠️ Service</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('product_type') === 'service' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg border">
                    <FormField
                      control={form.control}
                      name="service_duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="60" 
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_billable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Billable Service</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requires_appointment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Requires Appointment</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {hasFeature('enable_brands') && (
                    <FormField
                      control={form.control}
                      name="brand_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Brand 
                            <Badge variant="secondary" className="ml-2">Premium</Badge>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {brands?.map((brand) => (
                                <SelectItem key={brand.id} value={brand.id}>
                                  {brand.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {hasFeature('enable_product_units') && (
                    <FormField
                      control={form.control}
                      name="unit_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Unit 
                            <Badge variant="secondary" className="ml-2">Premium</Badge>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {units?.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.name} ({unit.abbreviation})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {hasFeature('enable_barcode_scanning') && (
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Barcode className="h-4 w-4" />
                          Barcode
                          <Badge variant="secondary">Premium</Badge>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter or scan barcode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="has_expiry_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Track Expiry Date</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable this to track expiry dates for this product
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {hasFeature('enable_negative_stock') && (
                  <FormField
                    control={form.control}
                    name="allow_negative_stock"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-2">
                            Allow Negative Stock
                            <Badge variant="secondary">Premium</Badge>
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Allow sales even when stock quantity is zero or negative
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>

              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_profit_margin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Profit Margin %</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="0.00" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hasFeature('enable_wholesale_pricing') && (
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">Wholesale Pricing</h4>
                      <Badge variant="secondary">Premium</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Advanced wholesale pricing options will be available here
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                {hasFeature('enable_combo_products') && (
                  <FormField
                    control={form.control}
                    name="is_combo_product"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Combo Product
                            <Badge variant="secondary">Premium</Badge>
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            This product is a combination of multiple products
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {hasFeature('enable_warranty') && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <h4 className="font-medium">Warranty Information</h4>
                      <Badge variant="secondary">Premium</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="warranty_period_months"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warranty Period (Months)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="0" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="warranty_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Warranty Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select warranty type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                                <SelectItem value="store">Store</SelectItem>
                                <SelectItem value="extended">Extended</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="warranty_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Terms</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter warranty terms and conditions" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveMutation.isPending}
              >
                {productId ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};