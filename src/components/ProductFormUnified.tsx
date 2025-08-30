import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Upload, X, Package, Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import QuickCreateCategoryDialog from './QuickCreateCategoryDialog';
import QuickCreateUnitDialog from './QuickCreateUnitDialog';
import QuickCreateBrandDialog from './QuickCreateBrandDialog';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useProductCRUD } from '@/hooks/useUnifiedCRUD';
import { productSchema, ProductFormData } from '@/lib/validation-schemas';

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

const STEPS = [
  { id: 'basic', title: 'Basic Information', description: 'Essential product details' },
  { id: 'categorization', title: 'Categorization', description: 'Organize your product' },
  { id: 'variants', title: 'Product Type', description: 'Simple or Variable product' },
  { id: 'details', title: 'Product Details', description: 'Pricing, inventory & image' },
];

export default function ProductFormUnified({ product, onSuccess, onCancel }: ProductFormProps) {
  const { tenantId } = useAuth();
  useEnsureBaseUnitPcs();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { product: productSettings } = useBusinessSettings();
  
  // Use unified CRUD hook
  const { create: createProduct, update: updateProduct, isCreating, isUpdating } = useProductCRUD();
  
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
  const [showQuickCreateCategory, setShowQuickCreateCategory] = useState(false);
  const [showQuickCreateUnit, setShowQuickCreateUnit] = useState(false);
  const [showQuickCreateBrand, setShowQuickCreateBrand] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [isComboProduct, setIsComboProduct] = useState(false);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [hasExpiryDate, setHasExpiryDate] = useState(false);

  // Initialize form with react-hook-form and zod validation
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      price: 0,
      wholesale_price: 0,
      retail_price: 0,
      cost_price: 0,
      purchase_price: 0,
      default_profit_margin: 0,
      barcode: '',
      category_id: '',
      subcategory_id: '',
      brand_id: '',
      revenue_account_id: '',
      unit_id: '',
      stock_quantity: 0,
      min_stock_level: 0,
      has_expiry_date: false,
      is_active: true,
      location_id: localStorage.getItem('selected_location') || '',
      has_variants: false,
      is_combo_product: false,
      allow_negative_stock: false,
      image_url: '',
    },
  });

  // Load initial data if editing
  useEffect(() => {
    if (product) {
      form.reset({
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        price: product.price || 0,
        wholesale_price: product.wholesale_price || 0,
        retail_price: product.retail_price || 0,
        cost_price: product.cost_price || 0,
        purchase_price: product.purchase_price || 0,
        default_profit_margin: product.default_profit_margin || 0,
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        brand_id: product.brand_id || '',
        revenue_account_id: product.revenue_account_id || '',
        unit_id: product.unit_id || '',
        stock_quantity: product.stock_quantity || 0,
        min_stock_level: product.min_stock_level || 0,
        has_expiry_date: product.has_expiry_date || false,
        is_active: product.is_active ?? true,
        location_id: product.location_id || localStorage.getItem('selected_location') || '',
        has_variants: product.has_variants || false,
        is_combo_product: product.is_combo_product || false,
        allow_negative_stock: product.allow_negative_stock || false,
        image_url: product.image_url || '',
      });
      
      setHasVariants(product.has_variants || false);
      setIsComboProduct(product.is_combo_product || false);
      setAllowNegativeStock(product.allow_negative_stock || false);
      setHasExpiryDate(product.has_expiry_date || false);
      setImagePreview(product.image_url || '');
    }
  }, [product, form]);

  // Load reference data
  useEffect(() => {
    if (!tenantId) return;

    const loadReferenceData = async () => {
      setLoading(true);
      try {
        // Load categories
        const { data: categoriesData } = await supabase
          .from('product_categories')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');
        setCategories(categoriesData || []);

        // Load brands
        const { data: brandsData } = await supabase
          .from('brands')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');
        setBrands(brandsData || []);

        // Load units
        const { data: unitsData } = await supabase
          .from('product_units')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');
        setUnits(unitsData || []);

        // Load locations
        const { data: locationsData } = await supabase
          .from('store_locations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');
        setLocations(locationsData || []);

      } catch (error) {
        console.error('Error loading reference data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load reference data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadReferenceData();
  }, [tenantId, toast]);

  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    try {
      if (product) {
        // Update existing product
        updateProduct({ id: product.id, data });
      } else {
        // Create new product
        createProduct(data);
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product',
        variant: 'destructive',
      });
    }
  };

  // Handle step navigation
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        form.setValue('image_url', e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    form.setValue('image_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-muted-foreground">
            {STEPS[currentStep].description}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-6">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {index + 1}
            </div>
            <span className={`ml-2 text-sm ${
              index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {step.title}
            </span>
            {index < STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the essential product details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter product name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    {...form.register('sku')}
                    placeholder="Enter SKU"
                  />
                  {form.formState.errors.sku && (
                    <p className="text-sm text-red-500">{form.formState.errors.sku.message}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_id">Location *</Label>
                <Select
                  value={form.watch('location_id')}
                  onValueChange={(value) => form.setValue('location_id', value)}
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
                {form.formState.errors.location_id && (
                  <p className="text-sm text-red-500">{form.formState.errors.location_id.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Categorization */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Categorization</CardTitle>
              <CardDescription>Organize your product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category *</Label>
                  <Select
                    value={form.watch('category_id')}
                    onValueChange={(value) => {
                      form.setValue('category_id', value);
                      form.setValue('subcategory_id', '');
                    }}
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
                  {form.formState.errors.category_id && (
                    <p className="text-sm text-red-500">{form.formState.errors.category_id.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Brand</Label>
                  <Select
                    value={form.watch('brand_id')}
                    onValueChange={(value) => form.setValue('brand_id', value)}
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
                </div>
              </div>

              {productSettings.enableProductUnits && (
                <div className="space-y-2">
                  <Label htmlFor="unit_id">Unit</Label>
                  <Select
                    value={form.watch('unit_id')}
                    onValueChange={(value) => form.setValue('unit_id', value)}
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
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Product Type */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Product Type</CardTitle>
              <CardDescription>Configure product type and variants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_variants"
                    checked={hasVariants}
                    onCheckedChange={(checked) => {
                      setHasVariants(checked);
                      form.setValue('has_variants', checked);
                    }}
                  />
                  <Label htmlFor="has_variants">Product has variants</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_combo_product"
                    checked={isComboProduct}
                    onCheckedChange={(checked) => {
                      setIsComboProduct(checked);
                      form.setValue('is_combo_product', checked);
                    }}
                  />
                  <Label htmlFor="is_combo_product">Combo product</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow_negative_stock"
                    checked={allowNegativeStock}
                    onCheckedChange={(checked) => {
                      setAllowNegativeStock(checked);
                      form.setValue('allow_negative_stock', checked);
                    }}
                  />
                  <Label htmlFor="allow_negative_stock">Allow negative stock</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_expiry_date"
                    checked={hasExpiryDate}
                    onCheckedChange={(checked) => {
                      setHasExpiryDate(checked);
                      form.setValue('has_expiry_date', checked);
                    }}
                  />
                  <Label htmlFor="has_expiry_date">Has expiry date</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Product Details */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
              <CardDescription>Pricing, inventory & image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Sale Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...form.register('price', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    {...form.register('cost_price', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.cost_price && (
                    <p className="text-sm text-red-500">{form.formState.errors.cost_price.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wholesale_price">Wholesale Price</Label>
                  <Input
                    id="wholesale_price"
                    type="number"
                    step="0.01"
                    {...form.register('wholesale_price', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.wholesale_price && (
                    <p className="text-sm text-red-500">{form.formState.errors.wholesale_price.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retail_price">Retail Price</Label>
                  <Input
                    id="retail_price"
                    type="number"
                    step="0.01"
                    {...form.register('retail_price', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.retail_price && (
                    <p className="text-sm text-red-500">{form.formState.errors.retail_price.message}</p>
                  )}
                </div>
              </div>

              {/* Inventory */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    {...form.register('stock_quantity', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {form.formState.errors.stock_quantity && (
                    <p className="text-sm text-red-500">{form.formState.errors.stock_quantity.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Minimum Stock Level</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    {...form.register('min_stock_level', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {form.formState.errors.min_stock_level && (
                    <p className="text-sm text-red-500">{form.formState.errors.min_stock_level.message}</p>
                  )}
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center space-x-4">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2"
                        onClick={removeImage}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={loading}
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading || isCreating || isUpdating}
            >
              {loading || isCreating || isUpdating ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
            </Button>
          )}
        </div>
      </form>

      {/* Quick Create Dialogs */}
      <QuickCreateCategoryDialog
        open={showQuickCreateCategory}
        onOpenChange={setShowQuickCreateCategory}
        onSuccess={(newCategory) => {
          setCategories([...categories, newCategory]);
          form.setValue('category_id', newCategory.id);
          setShowQuickCreateCategory(false);
        }}
      />

      <QuickCreateUnitDialog
        open={showQuickCreateUnit}
        onOpenChange={setShowQuickCreateUnit}
        onSuccess={(newUnit) => {
          setUnits([...units, newUnit]);
          form.setValue('unit_id', newUnit.id);
          setShowQuickCreateUnit(false);
        }}
      />

      <QuickCreateBrandDialog
        open={showQuickCreateBrand}
        onOpenChange={setShowQuickCreateBrand}
        onSuccess={(newBrand) => {
          setBrands([...brands, newBrand]);
          form.setValue('brand_id', newBrand.id);
          setShowQuickCreateBrand(false);
        }}
      />
    </div>
  );
}
