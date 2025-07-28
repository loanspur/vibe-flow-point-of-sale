import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Package, Plus, Trash2 } from 'lucide-react';
import QuickCreateCategoryDialog from './QuickCreateCategoryDialog';

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface ProductVariant {
  id?: string;
  name: string;
  value: string;
  sku: string;
  price_adjustment: string;
  stock_quantity: string;
  default_profit_margin: string;
  sale_price: string;
  image_url?: string;
  is_active: boolean;
}

interface ProductFormProps {
  product?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantImages, setVariantImages] = useState<{[key: number]: { file: File | null, preview: string }}>({});
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    default_profit_margin: '',
    barcode: '',
    category_id: '',
    subcategory_id: '',
    revenue_account_id: '',
    stock_quantity: '',
    min_stock_level: '',
    has_expiry_date: false,
    is_active: true,
  });

  const generateSKU = async (productName: string): Promise<string> => {
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

  const generateVariantSKU = (productSku: string, variantValue: string) => {
    if (!productSku || !variantValue) return '';
    
    // Generate variant SKU: ProductSKU + VariantValue (cleaned)
    const variantSuffix = variantValue
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .substring(0, 4) // Take first 4 characters
      .toUpperCase();
    
    return `${productSku}-${variantSuffix}`;
  };

  useEffect(() => {
    if (tenantId) {
      fetchCategories();
      fetchRevenueAccounts();
    }
  }, [tenantId]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        default_profit_margin: product.default_profit_margin?.toString() || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        revenue_account_id: product.revenue_account_id || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        min_stock_level: product.min_stock_level?.toString() || '',
        has_expiry_date: product.has_expiry_date || false,
        is_active: product.is_active ?? true,
      });
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
      fetchProductVariants(product.id);
    }
  }, [product?.id]); // Only depend on product ID to prevent unnecessary refreshes

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
    } else {
      setSubcategories([]);
      setFormData(prev => ({ ...prev, subcategory_id: '' }));
    }
  }, [formData.category_id]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching subcategories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchRevenueAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          *,
          account_types!inner(
            name,
            category
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('account_types.category', 'assets')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRevenueAccounts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching asset accounts",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchProductVariants = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*, sale_price, image_url')
        .eq('product_id', productId)
        .order('created_at');

      if (error) throw error;
      
      const formattedVariants = (data || []).map(variant => ({
        id: variant.id,
        name: variant.name,
        value: variant.value,
        sku: variant.sku || '',
        price_adjustment: variant.price_adjustment?.toString() || '0',
        stock_quantity: variant.stock_quantity?.toString() || '0',
        default_profit_margin: variant.default_profit_margin?.toString() || '',
        sale_price: variant.sale_price?.toString() || '0',
        image_url: variant.image_url || '',
        is_active: variant.is_active ?? true,
      }));
      
      setVariants(formattedVariants);
    } catch (error: any) {
      toast({
        title: "Error fetching variants",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Image too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !tenantId) return null;

    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = product?.image_url || '';
      
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      // Ensure we have a unique SKU for new products
      let finalSKU = formData.sku;
      if (!product && (!finalSKU || finalSKU.trim() === '')) {
        finalSKU = await generateSKU(formData.name);
      } else if (!product && finalSKU) {
        // Check if the provided SKU is unique
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('sku', finalSKU)
          .maybeSingle();
        
        if (existingProduct) {
          // SKU exists, generate a new one
          finalSKU = await generateSKU(formData.name);
        }
      }

      const productData = {
        name: formData.name,
        sku: finalSKU || null,
        description: formData.description || null,
        price: parseFloat(formData.price),
        default_profit_margin: formData.default_profit_margin ? parseFloat(formData.default_profit_margin) : null,
        barcode: formData.barcode || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        revenue_account_id: formData.revenue_account_id || null,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
        min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level) : 0,
        is_active: formData.is_active,
        image_url: imageUrl || null,
        has_expiry_date: formData.has_expiry_date,
        tenant_id: tenantId,
      };

      let error;
      let productId = product?.id;
      
      if (product) {
        ({ error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id));
      } else {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select('id')
          .single();
        
        error = insertError;
        if (data) productId = data.id;
      }

      if (error) throw error;

      // Save variants if product was created/updated successfully
      if (productId) {
        await saveVariants(productId);
      }

      toast({
        title: product ? "Product updated" : "Product created",
        description: `${formData.name} has been ${product ? 'updated' : 'created'} successfully.`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: `Error ${product ? 'updating' : 'creating'} product`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      return newData;
    });

    // Auto-generate SKU when product name changes (only for new products)
    if (field === 'name' && !product && typeof value === 'string' && value.trim()) {
      const generatedSKU = await generateSKU(value);
      setFormData(prev => ({ ...prev, sku: generatedSKU }));
    }

    // Update all variant SKUs when product SKU changes
    if (field === 'sku' && typeof value === 'string' && value.trim()) {
      setVariants(prev => prev.map(variant => ({
        ...variant,
        sku: variant.value ? generateVariantSKU(value, variant.value) : variant.sku
      })));
    }
  };

  // Variant management functions
  const addVariant = () => {
    const newVariant: ProductVariant = {
      name: '',
      value: '',
      sku: '',
      price_adjustment: '0',
      stock_quantity: '0',
      default_profit_margin: '',
      sale_price: '0',
      image_url: '',
      is_active: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
    // Remove associated image
    setVariantImages(prev => {
      const newImages = { ...prev };
      delete newImages[index];
      return newImages;
    });
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | boolean) => {
    setVariants(prev => prev.map((variant, i) => {
      if (i === index) {
        const updatedVariant = { ...variant, [field]: value };
        
        // Auto-generate variant SKU when value changes
        if (field === 'value' && typeof value === 'string' && value.trim() && formData.sku) {
          updatedVariant.sku = generateVariantSKU(formData.sku, value);
        }
        
        return updatedVariant;
      }
      return variant;
    }));
  };

  const handleVariantImageSelect = (variantIndex: number, file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Image too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setVariantImages(prev => ({
          ...prev,
          [variantIndex]: {
            file: file,
            preview: e.target?.result as string
          }
        }));
      };
      reader.readAsDataURL(file);
    } else {
      setVariantImages(prev => {
        const newImages = { ...prev };
        delete newImages[variantIndex];
        return newImages;
      });
    }
  };

  const uploadVariantImage = async (file: File): Promise<string | null> => {
    if (!tenantId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `variant_${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Error uploading variant image",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const saveVariants = async (productId: string) => {
    try {
      if (variants.length > 0) {
        // Get existing variants for this product
        const { data: existingVariants, error: fetchError } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId);

        if (fetchError) throw fetchError;

        const variantDataPromises = variants.map(async (variant, index) => {
          let imageUrl = variant.image_url;
          
          // Upload variant image if a new one was selected
          if (variantImages[index]?.file) {
            const uploadedUrl = await uploadVariantImage(variantImages[index].file);
            if (uploadedUrl) {
              imageUrl = uploadedUrl;
            }
          }

          return {
            id: variant.id,
            product_id: productId,
            name: variant.name,
            value: variant.value,
            sku: variant.sku || null,
            price_adjustment: parseFloat(variant.price_adjustment) || 0,
            stock_quantity: parseInt(variant.stock_quantity) || 0,
            default_profit_margin: variant.default_profit_margin ? parseFloat(variant.default_profit_margin) : null,
            sale_price: parseFloat(variant.sale_price) || 0,
            image_url: imageUrl || null,
            is_active: variant.is_active,
          };
        });

        const variantData = await Promise.all(variantDataPromises);

        // Separate variants into updates and inserts
        const toUpdate = variantData.filter(v => v.id && existingVariants?.some(ev => ev.id === v.id));
        const toInsert = variantData.filter(v => !v.id);

        // Update existing variants
        for (const variant of toUpdate) {
          const { id, ...updateData } = variant;
          const { error: updateError } = await supabase
            .from('product_variants')
            .update(updateData)
            .eq('id', id);

          if (updateError) throw updateError;
        }

        // Insert new variants
        if (toInsert.length > 0) {
          // Remove id field from new variants since it should be auto-generated
          const insertData = toInsert.map(({ id, ...variantWithoutId }) => variantWithoutId);
          
          const { error: insertError } = await supabase
            .from('product_variants')
            .insert(insertData);

          if (insertError) throw insertError;
        }

        // Handle variants to delete (only delete if not referenced)
        if (existingVariants && existingVariants.length > 0) {
          const variantIdsToKeep = variantData.map(v => v.id).filter(Boolean);
          const variantsToDelete = existingVariants.filter(ev => !variantIdsToKeep.includes(ev.id));

          for (const variantToDelete of variantsToDelete) {
            // Check if variant is referenced in other tables
            const { data: purchaseRefs, error: purchaseError } = await supabase
              .from('purchase_items')
              .select('id')
              .eq('variant_id', variantToDelete.id)
              .limit(1);

            if (purchaseError) throw purchaseError;

            const { data: quoteRefs, error: quoteError } = await supabase
              .from('quote_items')
              .select('id')
              .eq('variant_id', variantToDelete.id)
              .limit(1);

            if (quoteError) throw quoteError;

            const { data: returnRefs, error: returnError } = await supabase
              .from('return_items')
              .select('id')
              .eq('variant_id', variantToDelete.id)
              .limit(1);

            if (returnError) throw returnError;

            const { data: exchangeRefs, error: exchangeError } = await supabase
              .from('exchange_items')
              .select('id')
              .eq('variant_id', variantToDelete.id)
              .limit(1);

            if (exchangeError) throw exchangeError;

            // Only delete if not referenced anywhere
            if (!purchaseRefs?.length && !quoteRefs?.length && !returnRefs?.length && !exchangeRefs?.length) {
              const { error: deleteError } = await supabase
                .from('product_variants')
                .delete()
                .eq('id', variantToDelete.id);

              if (deleteError) throw deleteError;
            } else {
              // If referenced, just mark as inactive
              const { error: deactivateError } = await supabase
                .from('product_variants')
                .update({ is_active: false })
                .eq('id', variantToDelete.id);

              if (deactivateError) throw deactivateError;
            }
          }
        }
      } else if (product) {
        // If no variants are provided but we're editing a product, 
        // check existing variants and handle them appropriately
        const { data: existingVariants, error: fetchError } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId);

        if (fetchError) throw fetchError;

        if (existingVariants && existingVariants.length > 0) {
          for (const variant of existingVariants) {
            // Check if variant is referenced in other tables
            const { data: refs, error: refError } = await supabase
              .from('purchase_items')
              .select('id')
              .eq('variant_id', variant.id)
              .limit(1);

            if (refError) throw refError;

            if (!refs?.length) {
              // Not referenced, safe to delete
              const { error: deleteError } = await supabase
                .from('product_variants')
                .delete()
                .eq('id', variant.id);

              if (deleteError) throw deleteError;
            } else {
              // Referenced, mark as inactive
              const { error: deactivateError } = await supabase
                .from('product_variants')
                .update({ is_active: false })
                .eq('id', variant.id);

              if (deactivateError) throw deactivateError;
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Error saving variants: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Essential product details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU {!product && <span className="text-muted-foreground text-sm">(Auto-generated)</span>}</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder={product ? "Product SKU" : "Will be auto-generated from product name"}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Product description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Inventory</CardTitle>
          <CardDescription>Set prices and manage stock levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_profit_margin">Default Profit Margin %</Label>
              <Input
                id="default_profit_margin"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.default_profit_margin}
                onChange={(e) => handleInputChange('default_profit_margin', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Current Stock</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_stock_level">Minimum Stock Alert</Label>
              <Input
                id="min_stock_level"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="has_expiry_date"
              checked={formData.has_expiry_date || false}
              onCheckedChange={(checked) => handleInputChange('has_expiry_date', checked)}
            />
            <Label htmlFor="has_expiry_date">Track expiry date for this product</Label>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categorization</CardTitle>
          <CardDescription>Organize your product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleInputChange('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <QuickCreateCategoryDialog onCategoryCreated={fetchCategories} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(value) => handleInputChange('subcategory_id', value)}
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => handleInputChange('barcode', e.target.value)}
                placeholder="Product barcode"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="revenue_account">Revenue Account</Label>
              <Select
                value={formData.revenue_account_id}
                onValueChange={(value) => handleInputChange('revenue_account_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select revenue account" />
                </SelectTrigger>
                <SelectContent>
                  {revenueAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Image */}
      <Card>
        <CardHeader>
          <CardTitle>Product Image</CardTitle>
          <CardDescription>Upload a product image (max 5MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-24 h-24 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                  onClick={() => {
                    setImagePreview('');
                    setImageFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {imagePreview ? 'Change Image' : 'Upload Image'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Variants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Product Variants
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="w-4 h-4 mr-2" />
              Add Variant
            </Button>
          </CardTitle>
          <CardDescription>Create different versions of this product (e.g., sizes, colors)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {variants.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No variants added yet</p>
              <p className="text-sm">Add variants to offer different options for this product</p>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Variant {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Variant Name *</Label>
                      <Input
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        placeholder="e.g., Size, Color"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Variant Value *</Label>
                      <Input
                        value={variant.value}
                        onChange={(e) => updateVariant(index, 'value', e.target.value)}
                        placeholder="e.g., Large, Red"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                       <Label>SKU <span className="text-muted-foreground text-sm">(Auto-generated)</span></Label>
                       <Input
                         value={variant.sku}
                         onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                         placeholder="Auto-generated from variant value"
                       />
                     </div>
                    <div className="space-y-2">
                      <Label>Price Adjustment</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variant.price_adjustment}
                        onChange={(e) => updateVariant(index, 'price_adjustment', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock</Label>
                      <Input
                        type="number"
                        value={variant.stock_quantity}
                        onChange={(e) => updateVariant(index, 'stock_quantity', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Default Profit Margin %</Label>
                       <Input
                         type="number"
                         step="0.01"
                         min="0"
                         max="100"
                         value={variant.default_profit_margin}
                         onChange={(e) => updateVariant(index, 'default_profit_margin', e.target.value)}
                         placeholder="0.00"
                       />
                     </div>
                     <div className="space-y-2">
                       <Label>Sale Price</Label>
                       <Input
                         type="number"
                         step="0.01"
                         value={variant.sale_price}
                         onChange={(e) => updateVariant(index, 'sale_price', e.target.value)}
                         placeholder="0.00"
                       />
                     </div>
                   </div>

                   {/* Variant Image */}
                   <div className="space-y-2">
                     <Label>Variant Image</Label>
                     <div className="flex items-center gap-4">
                       {variantImages[index]?.preview || variant.image_url ? (
                         <div className="relative">
                           <img
                             src={variantImages[index]?.preview || variant.image_url}
                             alt={`${variant.name} ${variant.value}`}
                             className="w-16 h-16 object-cover rounded-lg border"
                           />
                           <Button
                             type="button"
                             variant="destructive"
                             size="sm"
                             className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0"
                             onClick={() => {
                               handleVariantImageSelect(index, null);
                               updateVariant(index, 'image_url', '');
                             }}
                           >
                             <X className="w-3 h-3" />
                           </Button>
                         </div>
                       ) : (
                         <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                           <Package className="w-6 h-6 text-muted-foreground" />
                         </div>
                       )}
                       
                       <div className="flex-1">
                         <input
                           type="file"
                           accept="image/*"
                           onChange={(e) => handleVariantImageSelect(index, e.target.files?.[0] || null)}
                           className="hidden"
                           id={`variant-image-${index}`}
                         />
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => document.getElementById(`variant-image-${index}`)?.click()}
                         >
                           <Upload className="w-4 h-4 mr-2" />
                           {variantImages[index]?.preview || variant.image_url ? 'Change' : 'Upload'}
                         </Button>
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center space-x-2">
                     <Switch
                       checked={variant.is_active}
                       onCheckedChange={(checked) => updateVariant(index, 'is_active', checked)}
                     />
                     <Label>Active variant</Label>
                   </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Product availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active (visible to customers)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name || !formData.price}>
          {loading ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}