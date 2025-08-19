import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useEnsureBaseUnitPcs } from '@/hooks/useEnsureBaseUnitPcs';
import { useFormState } from '@/hooks/useFormState';
import { Upload, X, Package, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import QuickCreateCategoryDialog from './QuickCreateCategoryDialog';
import QuickCreateUnitDialog from './QuickCreateUnitDialog';

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
  min_stock_level: string;
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

interface ProductFormData {
  name: string;
  sku: string;
  description: string;
  price: string;
  default_profit_margin: string;
  barcode: string;
  category_id: string;
  subcategory_id?: string;
  revenue_account_id?: string;
  unit_id?: string;
  stock_quantity: string;
  min_stock_level: string;
  has_expiry_date: boolean;
  is_active: boolean;
  location_id: string;
  has_variants: boolean;
}

const STEPS = [
  { id: 'basic', title: 'Basic Information', description: 'Essential product details' },
  { id: 'categorization', title: 'Categorization', description: 'Organize your product' },
  { id: 'variants', title: 'Product Type', description: 'Simple or Variable product' },
  { id: 'details', title: 'Product Details', description: 'Pricing, inventory & image' },
];

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { tenantId } = useAuth();
  useEnsureBaseUnitPcs();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantImages, setVariantImages] = useState<{[key: number]: { file: File | null, preview: string }}>({});

  const validateForm = useCallback((data: Partial<ProductFormData>) => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 0) {
      if (!data.name?.trim()) errors.name = 'Product name is required';
      if (!data.location_id) errors.location_id = 'Location is required';
    }
    
    if (currentStep === 1) {
      if (!data.category_id) errors.category_id = 'Category is required';
      if (!data.unit_id) errors.unit_id = 'Unit is required';
    }
    
    if (currentStep === 3) {
      if (!data.price) errors.price = 'Selling price is required';
      if (parseFloat(data.price || '0') <= 0) errors.price = 'Price must be greater than 0';
    }
    
    return errors;
  }, [currentStep]);

  const [formState, formActions] = useFormState<ProductFormData>({
    initialData: {
      name: '',
      sku: '',
      description: '',
      price: '',
      default_profit_margin: '',
      barcode: '',
      category_id: '',
      subcategory_id: undefined,
      revenue_account_id: undefined,
      unit_id: undefined,
      stock_quantity: '',
      min_stock_level: '',
      has_expiry_date: false,
      is_active: true,
      location_id: localStorage.getItem('selected_location') || '',
      has_variants: false,
    },
    validator: validateForm,
    validateOnChange: true,
  });

  const generateSKU = async (productName: string): Promise<string> => {
    if (!productName || !tenantId) return '';
    
    const namePrefix = productName
      .replace(/[^a-zA-Z0-9]/g, '') 
      .substring(0, 3)
      .toUpperCase();
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const timestamp = Date.now().toString().slice(-4);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const potentialSKU = `${namePrefix}${timestamp}${randomSuffix}`;
      
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
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    
    const fallbackSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${namePrefix}${fallbackSuffix}`;
  };

  const generateVariantSKU = (productSku: string, variantValue: string) => {
    if (!productSku || !variantValue) return '';
    
    const variantSuffix = variantValue
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 4)
      .toUpperCase();
    
    return `${productSku}-${variantSuffix}`;
  };

  const fetchCategories = useCallback(async () => {
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
  }, [tenantId, toast]);

  const fetchSubcategories = useCallback(async (categoryId: string) => {
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
  }, [tenantId, toast]);

  const fetchRevenueAccounts = useCallback(async () => {
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
  }, [tenantId, toast]);

  const fetchUnits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('product_units')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setUnits(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching units",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [tenantId, toast]);

  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('store_locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching locations",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [tenantId, toast]);

  const setDefaultLocation = useCallback(async () => {
    try {
      if (!tenantId) return;
      
      const { data, error } = await supabase.rpc('get_user_default_location', {
        user_tenant_id: tenantId
      });

      if (error) throw error;
      
      if (data) {
        formActions.setFieldValue('location_id', data);
        localStorage.setItem('selected_location', data);
      }
    } catch (error: any) {
      const { data: locations } = await supabase
        .from('store_locations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at')
        .limit(1);
      
      if (locations && locations.length > 0) {
        formActions.setFieldValue('location_id', locations[0].id);
        localStorage.setItem('selected_location', locations[0].id);
      }
    }
  }, [tenantId, formActions]);

  useEffect(() => {
    if (tenantId) {
      fetchCategories();
      fetchRevenueAccounts();
      fetchUnits();
      fetchLocations();
    }
  }, [tenantId, fetchCategories, fetchRevenueAccounts, fetchUnits, fetchLocations]);

  useEffect(() => {
    if (tenantId && !product && !formState.data.location_id) {
      setDefaultLocation();
    }
  }, [tenantId, product, setDefaultLocation]);

  useEffect(() => {
    if (product) {
      formActions.setData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        default_profit_margin: product.default_profit_margin?.toString() || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || undefined,
        revenue_account_id: product.revenue_account_id || undefined,
        unit_id: product.unit_id || undefined,
        stock_quantity: product.stock_quantity?.toString() || '',
        min_stock_level: product.min_stock_level?.toString() || '',
        has_expiry_date: product.has_expiry_date || false,
        is_active: product.is_active ?? true,
        location_id: product.location_id || '',
        has_variants: false,
      });
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
      fetchProductVariants(product.id);
    }
  }, [product?.id, formActions]);

  useEffect(() => {
    if (formState.data.category_id) {
      fetchSubcategories(formState.data.category_id);
    } else {
      setSubcategories([]);
      formActions.setFieldValue('subcategory_id', undefined);
    }
  }, [formState.data.category_id, fetchSubcategories, formActions]);

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
        min_stock_level: (variant as any).min_stock_level?.toString() || '0',
        default_profit_margin: variant.default_profit_margin?.toString() || '',
        sale_price: variant.sale_price?.toString() || '0',
        image_url: variant.image_url || '',
        is_active: variant.is_active ?? true,
      }));
      
      setVariants(formattedVariants);
      if (formattedVariants.length > 0) {
        formActions.setFieldValue('has_variants', true);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching variants",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = async (field: keyof ProductFormData, value: string | boolean) => {
    formActions.setFieldValue(field, value);

    if (field === 'location_id' && typeof value === 'string') {
      localStorage.setItem('selected_location', value);
    }

    if (field === 'name' && !product && typeof value === 'string' && value.trim()) {
      const generatedSKU = await generateSKU(value);
      formActions.setFieldValue('sku', generatedSKU);
    }

    if (field === 'sku' && typeof value === 'string' && value.trim()) {
      setVariants(prev => prev.map(variant => ({
        ...variant,
        sku: variant.value ? generateVariantSKU(value, variant.value) : variant.sku
      })));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
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

  // Variant management functions
  const addVariant = () => {
    const newVariant: ProductVariant = {
      name: '',
      value: '',
      sku: '',
      price_adjustment: '0',
      stock_quantity: '0',
      min_stock_level: '0',
      default_profit_margin: '',
      sale_price: '0',
      image_url: '',
      is_active: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
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
        
        if (field === 'value' && typeof value === 'string' && value.trim() && formState.data.sku) {
          updatedVariant.sku = generateVariantSKU(formState.data.sku, value);
        }
        
        return updatedVariant;
      }
      return variant;
    }));
  };

  const handleVariantImageSelect = (variantIndex: number, file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
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
        const { data: existingVariants, error: fetchError } = await supabase
          .from('product_variants')
          .select('*')
          .eq('product_id', productId);

        if (fetchError) throw fetchError;

        const variantDataPromises = variants.map(async (variant, index) => {
          let imageUrl = variant.image_url;
          
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
            min_stock_level: parseInt(variant.min_stock_level) || 0,
            default_profit_margin: variant.default_profit_margin ? parseFloat(variant.default_profit_margin) : null,
            sale_price: parseFloat(variant.sale_price) || 0,
            image_url: imageUrl || null,
            is_active: variant.is_active,
          };
        });

        const variantData = await Promise.all(variantDataPromises);

        const toUpdate = variantData.filter(v => v.id && existingVariants?.some(ev => ev.id === v.id));
        const toInsert = variantData.filter(v => !v.id);

        for (const variant of toUpdate) {
          const { id, ...updateData } = variant;
          const { error: updateError } = await supabase
            .from('product_variants')
            .update(updateData)
            .eq('id', id);

          if (updateError) throw updateError;
        }

        if (toInsert.length > 0) {
          const insertData = toInsert.map(({ id, ...variantWithoutId }) => variantWithoutId);
          
          const { error: insertError } = await supabase
            .from('product_variants')
            .insert(insertData);

          if (insertError) throw insertError;
        }

        if (existingVariants && existingVariants.length > 0) {
          const variantIdsToKeep = variantData.map(v => v.id).filter(Boolean);
          const variantsToDelete = existingVariants.filter(ev => !variantIdsToKeep.includes(ev.id));

          for (const variantToDelete of variantsToDelete) {
            const { data: purchaseRefs, error: purchaseError } = await supabase
              .from('purchase_items')
              .select('id')
              .eq('variant_id', variantToDelete.id)
              .limit(1);

            if (purchaseError) throw purchaseError;

            if (!purchaseRefs?.length) {
              const { error: deleteError } = await supabase
                .from('product_variants')
                .delete()
                .eq('id', variantToDelete.id);

              if (deleteError) throw deleteError;
            } else {
              const { error: deactivateError } = await supabase
                .from('product_variants')
                .update({ is_active: false })
                .eq('id', variantToDelete.id);

              if (deactivateError) throw deactivateError;
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Error saving variants: ${error.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formActions.validate()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before continuing",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = product?.image_url || '';
      
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      let finalSKU = formState.data.sku;
      if (!product && (!finalSKU || finalSKU.trim() === '')) {
        finalSKU = await generateSKU(formState.data.name);
      } else if (!product && finalSKU) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('sku', finalSKU)
          .maybeSingle();
        
        if (existingProduct) {
          finalSKU = await generateSKU(formState.data.name);
        }
      }

      const productData = {
        name: formState.data.name,
        sku: finalSKU || null,
        description: formState.data.description || null,
        price: formState.data.has_variants ? 0 : parseFloat(formState.data.price || '0'),
        default_profit_margin: formState.data.default_profit_margin ? parseFloat(formState.data.default_profit_margin) : null,
        barcode: formState.data.barcode || null,
        category_id: formState.data.category_id || null,
        subcategory_id: formState.data.subcategory_id || null,
        revenue_account_id: formState.data.revenue_account_id || null,
        unit_id: formState.data.unit_id || null,
        stock_quantity: formState.data.stock_quantity ? parseInt(formState.data.stock_quantity) : 0,
        min_stock_level: formState.data.min_stock_level ? parseInt(formState.data.min_stock_level) : 0,
        is_active: formState.data.is_active,
        image_url: imageUrl || null,
        has_expiry_date: formState.data.has_expiry_date,
        location_id: formState.data.location_id || null,
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

      if (productId && formState.data.has_variants && variants.length > 0) {
        await saveVariants(productId);
      }

      toast({
        title: product ? "Product updated" : "Product created",
        description: `${formState.data.name} has been ${product ? 'updated' : 'created'} successfully.`,
      });

      if (!product) {
        formActions.reset();
        setImagePreview('');
        setImageFile(null);
        setVariants([]);
        setVariantImages({});
        setCurrentStep(0);
      }
      
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

  const nextStep = () => {
    if (!formActions.validate()) {
      toast({
        title: "Please complete all required fields",
        description: "Fix the errors before proceeding to the next step",
        variant: "destructive",
      });
      return;
    }
    
    // Skip pricing/inventory/image step for variable products
    if (currentStep === 2 && formState.data.has_variants) {
      // For variable products, complete the form submission
      handleSubmit(new Event('submit') as any);
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formState.data.name.trim() && formState.data.location_id;
      case 1:
        return formState.data.category_id && formState.data.unit_id;
      case 2:
        return true; // No validation needed for variant selection
      case 3:
        return formState.data.price && parseFloat(formState.data.price) > 0;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
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
                    value={formState.data.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                  {formState.errors.name && (
                    <p className="text-sm text-destructive">{formState.errors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select
                    value={formState.data.location_id}
                    onValueChange={(value) => handleInputChange('location_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formState.errors.location_id && (
                    <p className="text-sm text-destructive">{formState.errors.location_id}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku">SKU {!product && <span className="text-muted-foreground text-sm">(Auto-generated)</span>}</Label>
                <Input
                  id="sku"
                  value={formState.data.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder={product ? "Product SKU" : "Will be auto-generated from product name"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.data.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Product description"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 1: // Categorization
        return (
          <Card>
            <CardHeader>
              <CardTitle>Categorization</CardTitle>
              <CardDescription>Organize your product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formState.data.category_id}
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
                  {formState.errors.category_id && (
                    <p className="text-sm text-destructive">{formState.errors.category_id}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select
                    value={formState.data.subcategory_id}
                    onValueChange={(value) => handleInputChange('subcategory_id', value)}
                    disabled={!formState.data.category_id}
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
                    value={formState.data.barcode}
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    placeholder="Product barcode"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="revenue_account">Revenue Account</Label>
                  <Select
                    value={formState.data.revenue_account_id}
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
              
              <div className="space-y-2">
                <Label htmlFor="unit">Unit of Measurement *</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={formState.data.unit_id}
                    onValueChange={(value) => handleInputChange('unit_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.abbreviation})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <QuickCreateUnitDialog onUnitCreated={fetchUnits} />
                </div>
                {formState.errors.unit_id && (
                  <p className="text-sm text-destructive">{formState.errors.unit_id}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 2: // Product Type (Simple vs Variable)
        return (
          <Card>
            <CardHeader>
              <CardTitle>Product Type</CardTitle>
              <CardDescription>Choose if this product has variations or is a simple product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer border-2 transition-all ${
                    !formState.data.has_variants ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleInputChange('has_variants', false)}
                >
                  <CardContent className="p-6 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">Simple Product</h3>
                    <p className="text-sm text-muted-foreground">
                      A basic product without variations (size, color, etc.)
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer border-2 transition-all ${
                    formState.data.has_variants ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onClick={() => handleInputChange('has_variants', true)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <Package className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">Variable Product</h3>
                    <p className="text-sm text-muted-foreground">
                      A product with variations like different sizes, colors, or styles
                    </p>
                  </CardContent>
                </Card>
              </div>

              {formState.data.has_variants && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Product Variants</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>
                  
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
                            <h5 className="font-medium">Variant {index + 1}</h5>
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
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
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
                              
                              <div className="space-y-2">
                                <Label>Variant Price *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={variant.sale_price}
                                  onChange={(e) => updateVariant(index, 'sale_price', e.target.value)}
                                  placeholder="0.00"
                                  required
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Stock Quantity</Label>
                                <Input
                                  type="number"
                                  value={variant.stock_quantity}
                                  onChange={(e) => updateVariant(index, 'stock_quantity', e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Minimum Stock Alert</Label>
                                <Input
                                  type="number"
                                  value={variant.min_stock_level}
                                  onChange={(e) => updateVariant(index, 'min_stock_level', e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Variant Image</Label>
                                <div className="flex items-center gap-4">
                                  {variantImages[index]?.preview || variant.image_url ? (
                                    <div className="relative">
                                      <img
                                        src={variantImages[index]?.preview || variant.image_url}
                                        alt="Variant preview"
                                        className="w-20 h-20 object-cover rounded-lg border"
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
                                    <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                                      <Package className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                  )}
                                  
                                  <div className="flex-1">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleVariantImageSelect(index, file);
                                        }
                                      }}
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
                              
                              <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                  placeholder="Auto-generated"
                                  className="text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Auto-generated from product SKU and variant value
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3: // Product Details (Pricing, Inventory, Image)
        return (
          <div className="space-y-6">
            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set the selling price for this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Selling Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formState.data.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    {formState.errors.price && (
                      <p className="text-sm text-destructive">{formState.errors.price}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_profit_margin">Profit Margin %</Label>
                    <Input
                      id="default_profit_margin"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formState.data.default_profit_margin}
                      onChange={(e) => handleInputChange('default_profit_margin', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory</CardTitle>
                <CardDescription>Manage stock levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_quantity">Current Stock (pcs)</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formState.data.stock_quantity}
                      onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock_level">Minimum Stock Alert (pcs)</Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      value={formState.data.min_stock_level}
                      onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_expiry_date"
                    checked={formState.data.has_expiry_date || false}
                    onCheckedChange={(checked) => handleInputChange('has_expiry_date', checked)}
                  />
                  <Label htmlFor="has_expiry_date">Track expiry date for this product</Label>
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
                    checked={formState.data.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Active (visible to customers)</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
          >
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              index <= currentStep 
                ? 'border-primary bg-primary text-primary-foreground' 
                : 'border-muted-foreground text-muted-foreground'
            }`}>
              {index + 1}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${
                index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-px bg-border flex-1 mx-4 ${
                index < currentStep ? 'bg-primary' : ''
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={currentStep === 0 ? onCancel : prevStep}
          >
            {currentStep === 0 ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </>
            )}
          </Button>

          {currentStep < STEPS.length - 1 && !(currentStep === 2 && formState.data.has_variants) ? (
            <Button 
              type="button" 
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              type={currentStep === 2 && formState.data.has_variants ? "submit" : currentStep === STEPS.length - 1 ? "submit" : "button"}
              onClick={currentStep === 2 && formState.data.has_variants ? undefined : nextStep}
              disabled={loading || !canProceed()}
            >
              {loading ? 'Saving...' : (currentStep === 2 && formState.data.has_variants) || currentStep === STEPS.length - 1 ? (product ? 'Update Product' : 'Create Product') : 'Next'}
              {!(currentStep === 2 && formState.data.has_variants) && currentStep !== STEPS.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}