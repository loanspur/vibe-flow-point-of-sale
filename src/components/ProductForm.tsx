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
import QuickCreateBrandDialog from './QuickCreateBrandDialog';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useProductSettingsValidation } from '@/hooks/useProductSettingsValidation';



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
  wholesale_price: string;
  retail_price: string;
  cost_price: string;
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
  wholesale_price: string;
  retail_price: string;
  cost_price: string;
  default_profit_margin: string;
  barcode: string;
  category_id: string;
  subcategory_id?: string;
  brand_id?: string;
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
  const { product: productSettings } = useBusinessSettings();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantImages, setVariantImages] = useState<{[key: number]: { file: File | null, preview: string }}>({});

  const { validateProductCreation, isFeatureEnabled, getRequiredFields } = useProductSettingsValidation();

  const validateForm = useCallback((data: Partial<ProductFormData>) => {
    const errors: Record<string, string> = {};
    
    if (currentStep === 0) {
      if (!data.name?.trim()) errors.name = 'Product name is required';
      if (!data.location_id) errors.location_id = 'Location is required';
    }
    
    if (currentStep === 1) {
      if (!data.category_id) errors.category_id = 'Category is required';
      
      // Validate unit if product units are enabled
      if (isFeatureEnabled('enableProductUnits') && !data.unit_id) {
        errors.unit_id = 'Product unit is required when unit management is enabled';
      }
    }
    
    if (currentStep === 3) {
      // Validate pricing based on settings - only for simple products
      if (!data.has_variants) {
        if (!data.cost_price) {
          errors.cost_price = 'Cost price is required';
        } else if (data.cost_price && parseFloat(data.cost_price) < 0) {
          errors.cost_price = 'Cost price must be 0 or greater';
        }
        
        if (isFeatureEnabled('enableRetailPricing') && !data.retail_price) {
          errors.retail_price = 'Retail price is required when retail pricing is enabled';
        } else if (data.retail_price && parseFloat(data.retail_price) <= 0) {
          errors.retail_price = 'Retail price must be greater than 0';
        }
        
        if (!data.wholesale_price) {
          errors.wholesale_price = 'Wholesale price is required';
        } else if (data.wholesale_price && parseFloat(data.wholesale_price) <= 0) {
          errors.wholesale_price = 'Wholesale price must be greater than 0';
        }
      }

      // Validate SKU if auto-generate is enabled
      if (isFeatureEnabled('autoGenerateSku') && !data.sku) {
        errors.sku = 'SKU is required when auto-generate SKU is enabled';
      }
    }
    
    return errors;
  }, [currentStep, isFeatureEnabled]);

  const [formState, formActions] = useFormState<ProductFormData>({
    initialData: {
      name: '',
      sku: '',
      description: '',
      price: '',
      wholesale_price: '',
      retail_price: '',
      cost_price: '',
      default_profit_margin: '',
      barcode: '',
      category_id: '',
      subcategory_id: undefined,
      brand_id: undefined,
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
    if (!productName) return '';
    const namePrefix = productName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
    // If tenantId not ready, produce a random SKU without DB check
    if (!tenantId) {
      const fallbackSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `${namePrefix}${fallbackSuffix}`;
    }

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
    if (!categoryId || !tenantId) {
      setSubcategories([]);
      return;
    }
    
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
      console.error('Subcategories fetch error:', error);
      toast({
        title: "Error fetching subcategories",
        description: error.message,
        variant: "destructive",
      });
      setSubcategories([]); // Ensure we have a fallback
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

  const fetchBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching brands",
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
      if (!tenantId || formState.data.location_id) return;
      
      const { data, error } = await supabase.rpc('get_user_default_location', {
        user_tenant_id: tenantId
      });

      if (error) throw error;
      
      if (data) {
        formActions.setFieldValue('location_id', data);
        localStorage.setItem('selected_location', data);
      }
    } catch (error: any) {
      console.warn('Failed to get default location, using fallback:', error);
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
  }, [tenantId, formActions, formState.data.location_id]);

  useEffect(() => {
    if (tenantId) {
      fetchCategories();
      fetchBrands();
      fetchRevenueAccounts();
      fetchUnits();
      fetchLocations();
    }
  }, [tenantId, fetchCategories, fetchBrands, fetchRevenueAccounts, fetchUnits, fetchLocations]);

  useEffect(() => {
    if (tenantId && !product && !formState.data.location_id) {
      setDefaultLocation();
    }
  }, [tenantId, product, formState.data.location_id, setDefaultLocation]);

  // Initialize form with product data (only run once per product)
  useEffect(() => {
    if (product && product.id) {
      const savedLocation = localStorage.getItem('selected_location');
      const productData = {
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        wholesale_price: product.wholesale_price?.toString() || '',
        retail_price: product.retail_price?.toString() || '',
        cost_price: product.cost_price?.toString() || '',
        default_profit_margin: product.default_profit_margin?.toString() || '',
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || undefined,
        brand_id: product.brand_id || undefined,
        revenue_account_id: product.revenue_account_id || undefined,
        unit_id: product.unit_id || undefined,
        stock_quantity: product.stock_quantity?.toString() || '',
        min_stock_level: product.min_stock_level?.toString() || '',
        has_expiry_date: product.has_expiry_date || false,
        is_active: product.is_active ?? true,
        location_id: savedLocation || product.location_id || '',
        has_variants: false,
      };
      
      // Set form data without triggering re-renders
      formActions.setData(productData);
      
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
      
      // Fetch subcategories if category is set
      if (product.category_id) {
        fetchSubcategories(product.category_id);
      }
      
      // Fetch variants for existing product
      fetchProductVariants(product.id);
    }
  }, [product?.id]);

  // Handle subcategory fetching with stable reference
  useEffect(() => {
    if (formState.data.category_id) {
      fetchSubcategories(formState.data.category_id);
    } else {
      setSubcategories([]);
      if (formState.data.subcategory_id) {
        formActions.setFieldValue('subcategory_id', undefined);
      }
    }
  }, [formState.data.category_id, fetchSubcategories]);

  const fetchProductVariants = useCallback(async (productId: string) => {
    if (!productId) return;
    
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*, sale_price, retail_price, wholesale_price, image_url')
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
        wholesale_price: variant.wholesale_price?.toString() || '0',
        retail_price: variant.retail_price?.toString() || '0',
        cost_price: (variant as any).cost_price?.toString() || '0',
        image_url: variant.image_url || '',
        is_active: variant.is_active ?? true,
      }));
      
      console.log('Fetched product variants:', { 
        productId, 
        variantCount: formattedVariants.length,
        hasVariants: formattedVariants.length > 0 
      });
      
      setVariants(formattedVariants);
      
      // Only set has_variants to true if there are actually variants
      // For editing existing products, this should reflect the actual state
      if (formattedVariants.length > 0) {
        console.log('Setting has_variants to true for existing product with variants');
        formActions.setFieldValue('has_variants', true);
      } else {
        console.log('No variants found, ensuring has_variants is false');
        formActions.setFieldValue('has_variants', false);
      }
    } catch (error: any) {
      console.error('Variants fetch error:', error);
      toast({
        title: "Error fetching variants",
        description: error.message || "Failed to load product variants",
        variant: "destructive",
      });
    }
  }, [formActions, toast]);

  // Function to calculate profit margin percentage
  const calculateProfitMargin = (costPrice: number, retailPrice: number): string => {
    if (!costPrice || !retailPrice || costPrice <= 0 || retailPrice <= 0) {
      return '';
    }
    
    const profit = retailPrice - costPrice;
    const profitMargin = (profit / costPrice) * 100;
    return profitMargin.toFixed(2);
  };

  // Enhanced handleInputChange to auto-calculate profit margin
  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    const newData = { ...formState.data, [field]: value };
    
    // Auto-calculate profit margin when cost_price or retail_price changes
    if (field === 'cost_price' || field === 'retail_price') {
      const costPrice = field === 'cost_price' ? parseFloat(value) || 0 : parseFloat(newData.cost_price) || 0;
      const retailPrice = field === 'retail_price' ? parseFloat(value) || 0 : parseFloat(newData.retail_price) || 0;
      
      if (costPrice > 0 && retailPrice > 0) {
        const calculatedMargin = calculateProfitMargin(costPrice, retailPrice);
        newData.default_profit_margin = calculatedMargin;
      }
    }
    
    formActions.updateField(field, value);
    
    // Update profit margin if it was auto-calculated
    if ((field === 'cost_price' || field === 'retail_price') && newData.default_profit_margin !== formState.data.default_profit_margin) {
      formActions.updateField('default_profit_margin', newData.default_profit_margin);
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
      // Add timeout wrapper
      const uploadPromise = (async () => {
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
      })();

      // 30-second timeout for image upload
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Image upload timeout')), 30000)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('Image upload error:', error);
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
    wholesale_price: '0',
    retail_price: '0',
    cost_price: '0',
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
      // Add timeout wrapper
      const uploadPromise = (async () => {
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
      })();

      // 30-second timeout for variant image upload
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Variant image upload timeout')), 30000)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('Variant image upload error:', error);
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
      console.log('Starting variant save process for product:', productId);
      
      if (variants.length === 0) {
        console.log('No variants to save');
        return;
      }

      // Fetch existing variants with timeout
      const fetchPromise = supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId);

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 15000)
      );

      const { data: existingVariants, error: fetchError } = await Promise.race([
        fetchPromise, 
        timeoutPromise
      ]);

      if (fetchError) throw fetchError;

      console.log('Processing variants with image uploads...');
      
      // Process variants with limited concurrency to prevent timeout
      const variantData = [];
      const batchSize = 3; // Process 3 variants at a time
      
      for (let i = 0; i < variants.length; i += batchSize) {
        const batch = variants.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (variant, batchIndex) => {
          const originalIndex = i + batchIndex;
          let imageUrl = variant.image_url;
          
          if (variantImages[originalIndex]?.file) {
            console.log(`Uploading image for variant ${originalIndex + 1}`);
            const uploadedUrl = await uploadVariantImage(variantImages[originalIndex].file);
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
            retail_price: parseFloat(variant.retail_price) || 0,
            wholesale_price: parseFloat(variant.wholesale_price) || 0,
            cost_price: parseFloat(variant.cost_price) || 0,
            image_url: imageUrl || null,
            is_active: variant.is_active,
          };
        });

        const batchResults = await Promise.all(batchPromises);
        variantData.push(...batchResults);
      }

      console.log('All variant data processed, saving to database...');

      // Separate operations for better error handling
      const toUpdate = variantData.filter(v => v.id && existingVariants?.some(ev => ev.id === v.id));
      const toInsert = variantData.filter(v => !v.id);

      // Update existing variants
      if (toUpdate.length > 0) {
        console.log(`Updating ${toUpdate.length} existing variants`);
        for (const variant of toUpdate) {
          const { id, ...updateData } = variant;
          const { error: updateError } = await supabase
            .from('product_variants')
            .update(updateData)
            .eq('id', id);

          if (updateError) {
            console.error('Error updating variant:', updateError);
            throw updateError;
          }
        }
      }

      // Insert new variants
      if (toInsert.length > 0) {
        console.log(`Inserting ${toInsert.length} new variants`);
        const insertData = toInsert.map(({ id, ...variantWithoutId }) => variantWithoutId);
        
        const { error: insertError } = await supabase
          .from('product_variants')
          .insert(insertData);

        if (insertError) {
          console.error('Error inserting variants:', insertError);
          throw insertError;
        }
      }

      // Handle variant deletion (simplified)
      if (existingVariants && existingVariants.length > 0) {
        const variantIdsToKeep = variantData.map(v => v.id).filter(Boolean);
        const variantsToDelete = existingVariants.filter(ev => !variantIdsToKeep.includes(ev.id));

        if (variantsToDelete.length > 0) {
          console.log(`Deactivating ${variantsToDelete.length} removed variants`);
          
          // Simplified: just deactivate variants instead of complex deletion logic
          for (const variantToDelete of variantsToDelete) {
            const { error: deactivateError } = await supabase
              .from('product_variants')
              .update({ is_active: false })
              .eq('id', variantToDelete.id);

            if (deactivateError) {
              console.error('Error deactivating variant:', deactivateError);
              // Continue with other variants instead of failing completely
            }
          }
        }
      }

      console.log('Variant save process completed successfully');
    } catch (error: any) {
      console.error('Error in saveVariants:', error);
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
    console.log('Starting product save process...');

    try {
      let imageUrl = product?.image_url || '';
      
      // Handle main product image upload
      if (imageFile) {
        console.log('Uploading main product image...');
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      // Handle SKU generation for new products
      let finalSKU = formState.data.sku;
      if (!product && (!finalSKU || finalSKU.trim() === '')) {
        console.log('Generating new SKU...');
        finalSKU = await generateSKU(formState.data.name);
      } else if (!product && finalSKU) {
        // Check for SKU conflicts for new products
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('sku', finalSKU)
          .maybeSingle();
        
        if (existingProduct) {
          console.log('SKU conflict detected, generating new SKU...');
          finalSKU = await generateSKU(formState.data.name);
        }
      }

      const productData = {
        name: formState.data.name,
        sku: finalSKU || null,
        description: formState.data.description || null,
        price: formState.data.has_variants ? 0 : parseFloat(formState.data.retail_price || '0'),
        retail_price: formState.data.has_variants ? null : parseFloat(formState.data.retail_price || '0'),
        wholesale_price: formState.data.has_variants ? null : parseFloat(formState.data.wholesale_price || '0'),
        cost_price: formState.data.has_variants ? null : parseFloat(formState.data.cost_price || '0'),
        default_profit_margin: formState.data.default_profit_margin ? parseFloat(formState.data.default_profit_margin) : null,
        barcode: formState.data.barcode || null,
        category_id: formState.data.category_id || null,
        subcategory_id: formState.data.subcategory_id || null,
        brand_id: formState.data.brand_id || null,
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

      console.log('Saving product data:', product ? 'update' : 'create');
      
      let error;
      let productId = product?.id;
      
      if (product) {
        // Update existing product
        ({ error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id));
      } else {
        // Create new product
        const { data, error: insertError } = await supabase
          .from('products')
          .insert([productData])
          .select('id')
          .single();
        
        error = insertError;
        if (data) productId = data.id;
      }

      if (error) {
        console.error('Product save error:', error);
        throw error;
      }

      // Handle variants if they exist
      if (productId && formState.data.has_variants && variants.length > 0) {
        console.log('Saving product variants...');
        await saveVariants(productId);
      }

      console.log('Product save completed successfully');
      
      toast({
        title: product ? "Product updated" : "Product created",
        description: `${formState.data.name} has been ${product ? 'updated' : 'created'} successfully.`,
      });

      // Reset form for new products
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
      console.error('Product save error:', error);
      toast({
        title: `Error ${product ? 'updating' : 'creating'} product`,
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('Product save process finished');
    }
  };

  const nextStep = () => {
    console.log('nextStep called:', { 
      currentStep, 
      hasVariants: formState.data.has_variants, 
      variantsLength: variants.length,
      stepTitle: STEPS[currentStep]?.title 
    });
    
    // Prevent accidental form submission by validating current step only
    const validationErrors = validateForm(formState.data);
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Please complete all required fields",
        description: "Fix the errors before proceeding to the next step",
        variant: "destructive",
      });
      return;
    }
    
    // Always proceed to the next step - don't skip pricing step
    // Users should be able to access pricing regardless of product type
    if (currentStep < STEPS.length - 1) {
      console.log('Proceeding to next step:', STEPS[currentStep + 1]?.title);
      setCurrentStep(currentStep + 1);
    } else {
      console.log('Already at final step, cannot proceed further');
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
        // For variable products, ensure at least one variant is configured with pricing
        if (formState.data.has_variants && variants.length > 0) {
          return variants.some(v => v.name.trim() && v.value.trim() && parseFloat(v.retail_price || '0') > 0 && parseFloat(v.wholesale_price || '0') > 0);
        }
        return true; // For simple products, no validation needed
      case 3:
        // For variant products, pricing is managed per variant, so no main product price validation needed
        if (formState.data.has_variants) {
          return true; // Variant products don't need main product pricing
        }
        // For simple products, validate the pricing
        return formState.data.retail_price && parseFloat(formState.data.retail_price) > 0 && 
               formState.data.wholesale_price && parseFloat(formState.data.wholesale_price) > 0;
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
                <Label htmlFor="sku">
                  SKU {!product && productSettings.autoGenerateSku && <span className="text-muted-foreground text-sm">(Auto-generated)</span>}
                </Label>
                <Input
                  id="sku"
                  value={formState.data.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  placeholder={product ? "Product SKU" : productSettings.autoGenerateSku ? "Will be auto-generated from product name" : "Enter product SKU"}
                  disabled={!product && productSettings.autoGenerateSku}
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
              
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={formState.data.brand_id}
                    onValueChange={(value) => handleInputChange('brand_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <QuickCreateBrandDialog onBrandCreated={fetchBrands} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {productSettings.enableBarcodeScanning && (
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={formState.data.barcode}
                      onChange={(e) => handleInputChange('barcode', e.target.value)}
                      placeholder="Product barcode"
                    />
                  </div>
                )}
                
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
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Configure Product Variants & Pricing</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Add variants with their individual pricing below. Each variant needs a name, value, and price before you can proceed to the next step.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Product Variants</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>
                  
                  {variants.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/20">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No variants added yet</p>
                      <p className="text-sm text-muted-foreground mb-4">Add variants with pricing to offer different options for this product</p>
                      <Button type="button" variant="outline" onClick={addVariant}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Variant
                      </Button>
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
                              
                              <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                  <Label>Cost Price *</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                    value={variant.cost_price}
                                    onChange={(e) => updateVariant(index, 'cost_price', e.target.value)}
                                  placeholder="0.00"
                                  required
                                />
                                  <p className="text-xs text-muted-foreground">
                                    Cost for profit calculations
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Retail Price *</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={variant.retail_price}
                                    onChange={(e) => updateVariant(index, 'retail_price', e.target.value)}
                                    placeholder="0.00"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Wholesale Price *</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={variant.wholesale_price}
                                    onChange={(e) => updateVariant(index, 'wholesale_price', e.target.value)}
                                    placeholder="0.00"
                                    required
                                  />
                                </div>
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
            {/* Pricing - Only show for simple products */}
            {!formState.data.has_variants && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set the pricing structure for this product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="cost_price">Purchase Price (Cost) *</Label>
                    <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                    value={formState.data.cost_price}
                    onChange={(e) => handleInputChange('cost_price', e.target.value)}
                  placeholder="0.00"
                  required
                />
                  <p className="text-sm text-muted-foreground">
                    The price you paid to purchase this product
                  </p>
                  {formState.errors.cost_price && (
                    <p className="text-sm text-destructive">{formState.errors.cost_price}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="retail_price">Retail Price (Sale Price) *</Label>
                <Input
                  id="retail_price"
                  type="number"
                  step="0.01"
                  value={formState.data.retail_price}
                  onChange={(e) => handleInputChange('retail_price', e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  The price customers pay when purchasing
                </p>
                {formState.errors.retail_price && (
                  <p className="text-sm text-destructive">{formState.errors.retail_price}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                  readOnly={!!(parseFloat(formState.data.cost_price) > 0 && parseFloat(formState.data.retail_price) > 0)}
                  className={parseFloat(formState.data.cost_price) > 0 && parseFloat(formState.data.retail_price) > 0 ? "bg-muted" : ""}
                />
                <p className="text-sm text-muted-foreground">
                  {parseFloat(formState.data.cost_price) > 0 && parseFloat(formState.data.retail_price) > 0 
                    ? "Auto-calculated from cost and retail prices" 
                    : "Enter manually or set cost and retail prices to auto-calculate"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wholesale_price">Wholesale Price *</Label>
                <Input
                  id="wholesale_price"
                  type="number"
                  step="0.01"
                  value={formState.data.wholesale_price}
                  onChange={(e) => handleInputChange('wholesale_price', e.target.value)}
                  placeholder="0.00"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Special price for reseller customers
                </p>
                {formState.errors.wholesale_price && (
                  <p className="text-sm text-destructive">{formState.errors.wholesale_price}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

            {/* Inventory - Only show for simple products */}
            {!formState.data.has_variants && (
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
                
                {productSettings.enableProductExpiry && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_expiry_date"
                      checked={formState.data.has_expiry_date || false}
                      onCheckedChange={(checked) => handleInputChange('has_expiry_date', checked)}
                    />
                    <Label htmlFor="has_expiry_date">Track expiry date for this product</Label>
                  </div>
                )}
                
                {!productSettings.enableProductExpiry && (
                  <div className="p-3 bg-muted/50 rounded-lg border border-muted">
                    <p className="text-sm text-muted-foreground">
                      Product expiry tracking is disabled in business settings. 
                      <span className="text-primary cursor-pointer hover:underline ml-1">Enable it in Settings → Product Settings</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            )}

            {/* Variant Products Notice */}
            {formState.data.has_variants && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription>Pricing and inventory are managed per variant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Since this is a variable product, pricing and inventory levels are managed individually for each variant. 
                      You can configure these settings when adding or editing variants in the previous step.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

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

      <div className="space-y-6">
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

          {currentStep < STEPS.length - 1 ? (
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
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
            >
              {loading ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}