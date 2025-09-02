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
import { Upload, X, Package, Plus, Trash2, ArrowLeft, ArrowRight, Search, Filter } from 'lucide-react';
import QuickCreateCategoryDialog from './QuickCreateCategoryDialog';
import QuickCreateUnitDialog from './QuickCreateUnitDialog';
import QuickCreateBrandDialog from './QuickCreateBrandDialog';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useProductCRUD } from '@/features/products/crud/useProductCRUD';
import { productSchema, ProductFormData } from '@/lib/validation-schemas';
import { generateUniqueSku, makeVariantSku } from '@/lib/sku';

// Helper function for SKU generation
const slugify = (s: string) =>
  s.trim().toUpperCase()
   .replace(/[^A-Z0-9]+/g, '-')
   .replace(/(^-|-$)/g, '')
   .slice(0, 24);

// Ensure unique SKU function
async function ensureUniqueSku(baseSku: string) {
  let sku = baseSku;
  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase.from('products').select('id').eq('sku', sku).limit(1);
    if (!error && (!data || data.length === 0)) return sku;
    sku = `${baseSku}-${i+1}`;
  }
  return sku;
}

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
  price_adjustment: number;
  stock_quantity: number;
  min_stock_level: number;
  retail_price: number;
  wholesale_price: number;
  cost_price: number;
  image_url?: string;
  is_active: boolean;
}

interface ProductFormProps {
  product?: any;
  onClose: (saved: boolean) => void;
}

const STEPS = [
  { id: 'basic', title: 'Basic Information', description: 'Essential product details' },
  { id: 'categorization', title: 'Categorization', description: 'Organize your product' },
  { id: 'variants', title: 'Product Type', description: 'Simple or Variable product' },
  { id: 'details', title: 'Product Details', description: 'Pricing, inventory & image' },
];

export default function ProductFormUnified({ product, onClose }: ProductFormProps) {
  const { tenantId } = useAuth();
  useEnsureBaseUnitPcs();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { product: productSettings } = useBusinessSettings();
  
  // Use unified CRUD hook
  const productCRUD = useProductCRUD(tenantId);
  const { createItem: createProduct, updateItem: updateProduct, isLoading: isCreating } = productCRUD;
  const isUpdating = isCreating;
  
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
  const [hasExpiryDate, setHasExpiryDate] = useState(false);
  
  // Search and filter functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('');
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

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
        image_url: product.image_url || '',
      });
      
      setHasVariants(product.has_variants || false);
      setHasExpiryDate(product.has_expiry_date || false);
      setImagePreview(product.image_url || '');
      
      // Load variants if editing
      if (product.has_variants && product.variants) {
        setVariants(product.variants);
      }
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

  // Auto-populate SKU when name changes
  useEffect(() => {
    const name: string = form.watch('name') || form.watch('product_name') || '';
    if (!name) return;

    const currentSku = form.watch('sku');
    // Only set if sku empty or matches our previous pattern
    if (!currentSku || /^[A-Z0-9-]{3,}$/.test(currentSku)) {
      const base = slugify(name);
      // Small random suffix to avoid immediate collisions; true uniqueness is validated on submit
      form.setValue('sku', `${base}-${Math.floor(1000 + Math.random()*9000)}`);
    }
  }, [form.watch('name'), form.watch('product_name')]);

  // Load all products for search functionality
  useEffect(() => {
    if (!tenantId) return;

    const loadProducts = async () => {
      try {
        setSearchLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('id, name, sku, description, stock_quantity, location_id')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        setAllProducts(data || []);
      } catch (error) {
        console.error('Error loading products for search:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    loadProducts();
  }, [tenantId]);

  // Filter products based on search query and location
  useEffect(() => {
    if (!searchQuery.trim() && !selectedLocationFilter) {
      setFilteredProducts([]);
      return;
    }

    let filtered = allProducts;

    // Filter by location
    if (selectedLocationFilter) {
      filtered = filtered.filter(p => p.location_id === selectedLocationFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered.slice(0, 10)); // Limit to 10 results
  }, [searchQuery, selectedLocationFilter, allProducts]);

  // Handle product selection from search
  const handleProductSelect = (selectedProduct: any) => {
    form.reset({
      ...form.getValues(),
      name: selectedProduct.name || '',
      sku: selectedProduct.sku || '',
      description: selectedProduct.description || '',
      location_id: selectedProduct.location_id || '',
      stock_quantity: selectedProduct.stock_quantity || 0,
    });
    
    setSearchQuery('');
    setShowProductSearch(false);
    setFilteredProducts([]);
  };

  // Handle click outside to close search dropdown
  const searchRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductSearch(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProductSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-map product to inventory journal
  const createInventoryJournalEntry = async (productData: any, isCreate: boolean) => {
    try {
      const journalEntry = {
        tenant_id: tenantId,
        product_id: productData.id,
        entry_type: isCreate ? 'initial_stock' : 'stock_adjustment',
        quantity: productData.stock_quantity || 0,
        unit_cost: productData.cost_price || 0,
        total_cost: (productData.stock_quantity || 0) * (productData.cost_price || 0),
        reference: isCreate ? 'Product Creation' : 'Product Update',
        notes: `${isCreate ? 'Initial' : 'Updated'} stock for ${productData.name}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('inventory_journal')
        .insert(journalEntry);

      if (error) {
        console.warn('Failed to create inventory journal entry:', error);
      }
    } catch (error) {
      console.warn('Error creating inventory journal entry:', error);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    try {
      // Generate SKU if not provided
      let sku = data.sku?.trim();
      if (!sku) {
        sku = await generateUniqueSku(data.name, tenantId);
      }
      
      // Ensure SKU uniqueness
      const baseSku = slugify(sku || data.name || 'SKU');
      sku = await ensureUniqueSku(baseSku);

      // Prepare payload with generated SKU and tenant_id
      const payload = { 
        ...data, 
        sku,
        tenant_id: tenantId,
        has_variants: hasVariants,
        // Remove combo and negative stock settings
        is_combo_product: false,
        allow_negative_stock: false,
      };

      let savedProduct;
      if (product) {
        // Update existing product
        savedProduct = await updateProduct({ id: product.id, data: payload });
        // Create inventory journal entry for update
        await createInventoryJournalEntry(savedProduct, false);
      } else {
        // Create new product
        savedProduct = await createProduct(payload);
        // Create inventory journal entry for new product
        await createInventoryJournalEntry(savedProduct, true);
      }

      // Handle variants if product has variants
      if (hasVariants && variants.length > 0) {
        for (const variant of variants) {
          const variantPayload = {
            ...variant,
            product_id: savedProduct.id,
            tenant_id: tenantId,
            sku: variant.sku || makeVariantSku(savedProduct.sku, variant.name),
          };

          if (variant.id) {
            // Update existing variant
            await supabase
              .from('product_variants')
              .update(variantPayload)
              .eq('id', variant.id);
          } else {
            // Create new variant
            await supabase
              .from('product_variants')
              .insert(variantPayload);
          }
        }
      }
      
      onClose(true);
      toast({
        title: 'Success',
        description: product ? 'Product updated successfully' : 'Product created successfully',
      });
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

  // Add variant
  const addVariant = () => {
    const newVariant: ProductVariant = {
      name: '',
      value: '',
      sku: '',
      price_adjustment: 0,
      stock_quantity: 0,
      min_stock_level: 0,
      retail_price: 0,
      wholesale_price: 0,
      cost_price: 0,
      is_active: true,
    };
    setVariants([...variants, newVariant]);
  };

  // Remove variant
  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Update variant
  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setVariants(updatedVariants);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header - Cancel button removed from top right */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {product ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-muted-foreground">
            {STEPS[currentStep].description}
          </p>
        </div>
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
              <ArrowRight className="w-4 w-4 mx-2 text-muted-foreground" />
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

              {/* Product Search Bar */}
              <div className="space-y-2">
                <Label>Search Existing Products</Label>
                <p className="text-xs text-muted-foreground">
                  Search for existing products to copy their details or check for duplicates
                </p>
                <div className="relative" ref={searchRef}>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, SKU, or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowProductSearch(true)}
                        className="pl-10 pr-8"
                      />
                      {searchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                          onClick={() => setSearchQuery('')}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowProductSearch(!showProductSearch)}
                      title="Toggle product search"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showProductSearch && (searchQuery.trim() || selectedLocationFilter) && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {/* Location Filter */}
                      <div className="p-3 border-b">
                        <Label className="text-sm font-medium">Filter by Location</Label>
                        <Select
                          value={selectedLocationFilter}
                          onValueChange={setSelectedLocationFilter}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="All locations" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All locations</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Search Results */}
                      {searchLoading ? (
                        <div className="p-3 text-center text-muted-foreground">
                          <div className="text-sm">Loading products...</div>
                        </div>
                      ) : filteredProducts.length > 0 ? (
                        <div className="p-2">
                          {filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              className="p-2 hover:bg-muted rounded cursor-pointer border-b last:border-b-0"
                              onClick={() => handleProductSelect(p)}
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-sm text-muted-foreground">
                                SKU: {p.sku} • Stock: {p.stock_quantity || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : searchQuery.trim() || selectedLocationFilter ? (
                        <div className="p-3 text-center text-muted-foreground">
                          <div className="text-sm">No products found</div>
                          <div className="text-xs mt-1">Try adjusting your search or location filter</div>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-muted-foreground">
                          <div className="text-sm">Start typing to search products</div>
                          <div className="text-xs mt-1">Or use location filter to browse by location</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_id">Location *</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.watch('location_id')}
                    onValueChange={(value) => form.setValue('location_id', value)}
                  >
                    <SelectTrigger className="flex-1">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQuickCreateUnit(true)}
                    title="Quick create location"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
                  <div className="flex gap-2">
                    <Select
                      value={form.watch('category_id')}
                      onValueChange={(value) => {
                        form.setValue('category_id', value);
                        form.setValue('subcategory_id', '');
                      }}
                    >
                      <SelectTrigger className="flex-1">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowQuickCreateCategory(true)}
                      title="Quick create category"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {form.formState.errors.category_id && (
                    <p className="text-sm text-red-500">{form.formState.errors.category_id.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Brand</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.watch('brand_id')}
                      onValueChange={(value) => form.setValue('brand_id', value)}
                    >
                      <SelectTrigger className="flex-1">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowQuickCreateBrand(true)}
                      title="Quick create brand"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {productSettings.enableProductUnits && (
                <div className="space-y-2">
                  <Label htmlFor="unit_id">Unit</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.watch('unit_id')}
                      onValueChange={(value) => form.setValue('unit_id', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowQuickCreateUnit(true)}
                      title="Quick create unit"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Product Type & Variants */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Product Type</CardTitle>
              <CardDescription>Choose between simple or variable product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Type</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_variants"
                      checked={hasVariants}
                      onCheckedChange={setHasVariants}
                    />
                    <Label htmlFor="has_variants">Product has variants (size, color, etc.)</Label>
                  </div>
                </div>
              </div>

              {hasVariants && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Product Variants</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariant}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>

                  {variants.map((variant, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Variant Name</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariant(index, 'name', e.target.value)}
                            placeholder="e.g., Size, Color"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Variant Value</Label>
                          <Input
                            value={variant.value}
                            onChange={(e) => updateVariant(index, 'value', e.target.value)}
                            placeholder="e.g., Large, Red"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>SKU</Label>
                          <Input
                            value={variant.sku}
                            onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                            placeholder="Auto-generated"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Price Adjustment</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.price_adjustment}
                            onChange={(e) => updateVariant(index, 'price_adjustment', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Stock Quantity</Label>
                          <Input
                            type="number"
                            value={variant.stock_quantity}
                            onChange={(e) => updateVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Min Stock Level</Label>
                          <Input
                            type="number"
                            value={variant.min_stock_level}
                            onChange={(e) => updateVariant(index, 'min_stock_level', parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Retail Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.retail_price}
                            onChange={(e) => updateVariant(index, 'retail_price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Wholesale Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.wholesale_price}
                            onChange={(e) => updateVariant(index, 'wholesale_price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cost Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={variant.cost_price}
                            onChange={(e) => updateVariant(index, 'cost_price', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeVariant(index)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
                  <Label htmlFor="price">Price</Label>
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

              {/* Inventory - Only show for simple products */}
              {!hasVariants && (
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
              )}

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
                      <Upload className="w-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation with Cancel button at bottom */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onClose(false)}
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
              >
                <ArrowLeft className="w-4 w-4 mr-2" />
                Previous
              </Button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={loading}
              >
                Next
                <ArrowRight className="w-4 w-4 ml-2" />
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
