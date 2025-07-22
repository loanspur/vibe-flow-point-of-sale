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
  purchase_price: string;
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
    cost: '',
    barcode: '',
    category_id: '',
    subcategory_id: '',
    revenue_account_id: '',
    stock_quantity: '',
    min_stock_level: '',
    is_active: true,
  });

  const generateSKU = (productName: string) => {
    if (!productName) return '';
    
    // Generate SKU from product name: Take first 3 letters + random 4 digits
    const namePrefix = productName
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .substring(0, 3)
      .toUpperCase();
    
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const timestamp = Date.now().toString().slice(-3); // Last 3 digits of timestamp
    
    return `${namePrefix}${randomSuffix}${timestamp}`;
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
        cost: product.cost?.toString() || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        revenue_account_id: product.revenue_account_id || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        min_stock_level: product.min_stock_level?.toString() || '',
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
        .select('*')
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
        purchase_price: variant.purchase_price?.toString() || '0',
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

      const productData = {
        name: formData.name,
        sku: formData.sku || null,
        description: formData.description || null,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : null,
        barcode: formData.barcode || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        revenue_account_id: formData.revenue_account_id || null,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
        min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level) : 0,
        is_active: formData.is_active,
        image_url: imageUrl || null,
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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate SKU when product name changes (only for new products)
      if (field === 'name' && !product && typeof value === 'string' && value.trim()) {
        newData.sku = generateSKU(value);
      }
      
      return newData;
    });
  };

  // Variant management functions
  const addVariant = () => {
    const newVariant: ProductVariant = {
      name: '',
      value: '',
      sku: '',
      price_adjustment: '0',
      stock_quantity: '0',
      purchase_price: '0',
      sale_price: '0',
      image_url: '',
      is_active: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | boolean) => {
    setVariants(prev => prev.map((variant, i) => 
      i === index ? { ...variant, [field]: value } : variant
    ));
  };

  const saveVariants = async (productId: string) => {
    try {
      // Delete existing variants if editing
      if (product) {
        await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', productId);
      }

      // Insert new variants
      if (variants.length > 0) {
        const variantData = variants.map(variant => ({
          product_id: productId,
          name: variant.name,
          value: variant.value,
          sku: variant.sku || null,
          price_adjustment: parseFloat(variant.price_adjustment) || 0,
          stock_quantity: parseInt(variant.stock_quantity) || 0,
          purchase_price: parseFloat(variant.purchase_price) || 0,
          sale_price: parseFloat(variant.sale_price) || 0,
          image_url: variant.image_url || null,
          is_active: variant.is_active,
        }));

        const { error } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (error) throw error;
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
              <Label htmlFor="cost">Cost Price</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleInputChange('cost', e.target.value)}
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
                      <Label>SKU</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        placeholder="Variant SKU"
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