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

import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useProductCRUD } from '@/features/products/crud/useProductCRUD';
import { productSchema, ProductFormData } from '@/lib/validation-schemas';
import { generateUniqueSku, makeVariantSku } from '@/lib/sku';
import { generateUniqueBarcode, generateBarcodeFromProduct, formatBarcode } from '@/lib/barcode';

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
  cost_price: number;
  wholesale_price: number;
  retail_price: number;
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
  const { createItem: createProduct, updateItem: updateProduct, isLoading: isCreating, queryClient } = productCRUD;
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
      wholesale_price: 0,
      retail_price: 0,
      cost_price: 0,
      purchase_price: 0,
      default_profit_margin: 0,
      barcode: '',
      category_id: '',
      subcategory_id: '',
      brand_id: '',
      unit_id: '',
      stock_quantity: 0,
      min_stock_level: 0,
      has_expiry_date: false,
      is_active: true,
      location_id: '', // Will be set after locations are loaded
      image_url: '',
    },
    mode: 'onSubmit', // Only validate on submit to prevent premature validation
  });

  // Load initial data if editing
  useEffect(() => {
    if (product) {
      console.log('Loading product data for editing:', product);
      console.log('All available product fields:', Object.keys(product));
      console.log('Product data values:', {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        wholesale_price: product.wholesale_price,
        retail_price: product.retail_price,
        cost_price: product.cost_price,
        purchase_price: product.purchase_price,
        default_profit_margin: product.default_profit_margin,
        barcode: product.barcode,
        category_id: product.category_id,
        subcategory_id: product.subcategory_id,
        brand_id: product.brand_id,
        unit_id: product.unit_id,
        stock_quantity: product.stock_quantity,
        min_stock_level: product.min_stock_level,
        has_expiry_date: product.has_expiry_date,
        is_active: product.is_active,
        location_id: product.location_id,
        image_url: product.image_url,
        // Additional fields that might exist in database
        is_combo_product: product.is_combo_product,
        allow_negative_stock: product.allow_negative_stock,
        revenue_account_id: product.revenue_account_id,
        expiry_date: product.expiry_date,
        created_at: product.created_at,
        updated_at: product.updated_at,
        tenant_id: product.tenant_id,
        price: product.price, // This is auto-calculated by database trigger
      });
      
      // Reset form with ALL available product data
      form.reset({
        id: product.id,
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        wholesale_price: product.wholesale_price || 0,
        retail_price: product.retail_price || 0,
        cost_price: product.cost_price || 0,
        purchase_price: product.purchase_price || 0,
        default_profit_margin: product.default_profit_margin || 0,
        barcode: product.barcode || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        brand_id: product.brand_id || '',
        unit_id: product.unit_id || '',
        stock_quantity: product.stock_quantity || 0,
        min_stock_level: product.min_stock_level || 0,
        has_expiry_date: product.has_expiry_date || false,
        is_active: product.is_active ?? true,
        location_id: product.location_id || localStorage.getItem('selected_location') || '',
        image_url: product.image_url || '',
      });
      
      // Set additional state variables
      setHasExpiryDate(product.has_expiry_date || false);
      setImagePreview(product.image_url || '');
      
      // Set variant-related state if available
      if (product.is_combo_product !== undefined) {
        // This would need to be added to the form schema if we want to persist it
        console.log('Product combo status:', product.is_combo_product);
      }
      
      if (product.allow_negative_stock !== undefined) {
        // This would need to be added to the form schema if we want to persist it
        console.log('Product negative stock setting:', product.allow_negative_stock);
      }
      
      if (product.revenue_account_id) {
        console.log('Product revenue account:', product.revenue_account_id);
      }
      
      if (product.expiry_date) {
        console.log('Product expiry date:', product.expiry_date);
      }
      
      // Load variants from database for editing
      loadProductVariants(product.id);
      
      // Reset to first step when editing
      setCurrentStep(0);
      
      console.log('Form reset complete with product data');
    }
  }, [product, form]);

  // Debug form state changes (only log, don't trigger validation)
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name === 'category_id') {
        console.log('Category field changed:', { value: value.category_id, type });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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

        // Load subcategories - table doesn't exist yet, using empty array
        setSubcategories([]);

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

        // Load locations with enhanced error handling and logging
        const { data: locationsData, error: locationsError } = await supabase
          .from('store_locations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');
        
        if (locationsError) {
          console.error('Error loading locations:', locationsError);
          toast({
            title: 'Warning',
            description: 'Failed to load store locations. Some features may be limited.',
            variant: 'destructive',
          });
        }
        
        setLocations(locationsData || []);
        console.log('Loaded locations:', locationsData);

        // Set default location if none is currently selected
        if (locationsData && locationsData.length > 0) {
          const currentLocationId = form.getValues('location_id');
          const defaultLocationId = getDefaultLocationId(locationsData, currentLocationId);
          
          if (defaultLocationId && defaultLocationId !== currentLocationId) {
            form.setValue('location_id', defaultLocationId);
            console.log('Setting default location:', defaultLocationId);
          }
        } else {
          console.warn('No locations available for tenant:', tenantId);
        }

        // Load revenue accounts - table doesn't exist yet, using empty array
        setRevenueAccounts([]);

        // Load existing inventory asset data for reference
        const inventoryData = await getInventoryAssetData();
        console.log('Loaded inventory asset data:', inventoryData);

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
    const name: string = form.watch('name') || '';
    if (!name) return;

    const currentSku = form.watch('sku');
    // Only set if sku empty or matches our previous pattern
    if (!currentSku || /^[A-Z0-9-]{3,}$/.test(currentSku)) {
      const base = slugify(name);
      // Small random suffix to avoid immediate collisions; true uniqueness is validated on submit
      form.setValue('sku', `${base}-${Math.floor(1000 + Math.random()*9000)}`);
    }
  }, [form.watch('name')]);

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

  // TODO: Re-enable when inventory_journal table is available
  // Auto-map product to inventory journal
  /*
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
  */

  // Helper function to get existing inventory asset journal data
  const getInventoryAssetData = async () => {
    try {
      // Query for existing inventory-related data from available tables
      const { data: inventoryData, error } = await supabase
        .from('products')
        .select('id, name, sku, stock_quantity, cost_price')
        .eq('tenant_id', tenantId)
        .not('stock_quantity', 'is', null)
        .gt('stock_quantity', 0)
        .limit(10);

      if (error) {
        console.warn('Error loading inventory data:', error);
        return [];
      }

      return inventoryData || [];
    } catch (error) {
      console.warn('Error getting inventory asset data:', error);
      return [];
    }
  };

  // Helper function to get the best default location
  const getDefaultLocationId = (locations: any[], currentLocationId?: string): string => {
    // Priority: 1. Current selection, 2. localStorage, 3. First available location
    if (currentLocationId && currentLocationId !== '') {
      return currentLocationId;
    }
    
    const storedLocation = localStorage.getItem('selected_location');
    if (storedLocation && locations.some(loc => loc.id === storedLocation)) {
      return storedLocation;
    }
    
    // Fallback to first available location
    return locations.length > 0 ? locations[0].id : '';
  };
  
  // Function to refresh location data
  const refreshLocationData = async () => {
    if (!tenantId) return;
    
    try {
      const { data: locationsData, error: locationsError } = await supabase
        .from('store_locations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (locationsError) {
        console.error('Error refreshing locations:', locationsError);
        return;
      }
      
      setLocations(locationsData || []);
      console.log('Locations refreshed:', locationsData);
      
      // Update form if current location is no longer valid
      const currentLocationId = form.getValues('location_id');
      if (currentLocationId && !locationsData?.some(loc => loc.id === currentLocationId)) {
        const defaultLocationId = getDefaultLocationId(locationsData || [], '');
        if (defaultLocationId) {
          form.setValue('location_id', defaultLocationId);
          console.log('Updated to default location:', defaultLocationId);
        }
      }
    } catch (error) {
      console.error('Error refreshing location data:', error);
    }
  };

  // Helper function to load product variants from database
  const loadProductVariants = async (productId: string) => {
    try {
      const { data: variantsData, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('name');
      
      if (error) {
        console.error('Error loading product variants:', error);
        return;
      }
      
      if (variantsData && variantsData.length > 0) {
        // Transform database variants to match our interface
        const transformedVariants: ProductVariant[] = variantsData.map(variant => ({
          id: variant.id,
          name: variant.name,
          value: variant.value,
          sku: variant.sku,
          price_adjustment: variant.price_adjustment || 0,
          stock_quantity: variant.stock_quantity || 0,
          cost_price: variant.cost_price || 0,
          wholesale_price: variant.wholesale_price || 0,
          retail_price: variant.retail_price || 0,
          image_url: variant.image_url || '',
          is_active: variant.is_active ?? true,
        }));
        
        setVariants(transformedVariants);
        setHasVariants(true);
        console.log('Loaded variants for editing:', transformedVariants);
      } else {
        setVariants([]);
        setHasVariants(false);
      }
    } catch (error) {
      console.error('Error loading product variants:', error);
      setVariants([]);
      setHasVariants(false);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    try {
      setLoading(true);
      
      // Validate required fields before proceeding
      if (!data.name?.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Product name is required',
          variant: 'destructive',
        });
        return;
      }
      
      if (!data.category_id?.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Category is required',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Ensure location is set
      if (!data.location_id?.trim()) {
        // Try to get default location
        const defaultLocationId = getDefaultLocationId(locations, '');
        if (defaultLocationId) {
          data.location_id = defaultLocationId;
          form.setValue('location_id', defaultLocationId);
          console.log('Auto-setting default location for product:', defaultLocationId);
        } else {
          toast({
            title: 'Validation Error',
            description: 'No location available. Please create a store location first.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
      }

      // CRITICAL: Validate that at least one price field has a valid value
      // This ensures the database can properly calculate the main price field
      const retailPrice = Number(data.retail_price) || 0;
      const wholesalePrice = Number(data.wholesale_price) || 0;
      const costPrice = Number(data.cost_price) || 0;
      
      if (retailPrice <= 0 && wholesalePrice <= 0 && costPrice <= 0) {
        toast({
          title: 'Pricing Required',
          description: 'At least one price field (Retail, Wholesale, or Cost) must be greater than 0. Products cannot have zero pricing.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Generate SKU if not provided
      let sku = data.sku?.trim();
      if (!sku) {
        sku = await generateUniqueSku(data.name, tenantId);
      }
      
      // Ensure SKU uniqueness
      const baseSku = slugify(sku || data.name || 'SKU');
      sku = await ensureUniqueSku(baseSku);
      
      // Generate barcode if not provided
      let barcode = data.barcode?.trim();
      if (!barcode) {
        if (sku && data.name) {
          barcode = await generateBarcodeFromProduct(data.name, sku, tenantId);
        } else {
          barcode = await generateUniqueBarcode(tenantId);
        }
        console.log('Auto-generated barcode:', barcode);
      }

      // Clean the payload to handle empty fields properly
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          // Exclude ID field for updates to avoid UUID parsing errors
          if (product && key === 'id') {
            return [key, undefined];
          }
          
          // Handle empty strings for different field types
          if (value === '') {
            // Required fields should never be empty
            if (key === 'name' || key === 'sku' || key === 'category_id') {
              return [key, value]; // Keep as empty string for validation
            }
            
            // Optional string fields should be empty strings, not null
            if (key === 'barcode' || key === 'description' || key === 'image_url') {
              return [key, ''];
            }
            
            // Optional ID fields can be null
            if (key.includes('_id')) {
              return [key, null];
            }
            
            // Other optional fields
            return [key, ''];
          }
          
          return [key, value];
        }).filter(([_, value]) => value !== undefined)
      );
      
      console.log('Cleaned form data:', cleanData);

      // Prepare payload with generated SKU, barcode and tenant_id
      // Only include fields that exist in the database table
      const payload = { 
        ...cleanData, 
        sku,
        barcode,
        tenant_id: tenantId,
        // Ensure the individual price fields are properly set
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        cost_price: costPrice,
        // Note: has_variants, is_combo_product, allow_negative_stock columns 
        // don't exist in the database, so we track them in component state only
        // The database will handle the 'price' field automatically based on these values
      };
      
      // If editing, preserve any additional fields that exist in the original product
      if (product && product.id) {
        const additionalFields = {
          // Preserve fields that might not be in the form but exist in database
          is_combo_product: product.is_combo_product,
          allow_negative_stock: product.allow_negative_stock,
          revenue_account_id: product.revenue_account_id,
          expiry_date: product.expiry_date,
          // Don't override these as they're managed by the system
          // created_at: product.created_at,
          // updated_at: product.updated_at,
          // tenant_id: product.tenant_id, // We set this explicitly
        };
        
        // Only include fields that have actual values
        Object.entries(additionalFields).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            (payload as any)[key] = value;
          }
        });
        
        console.log('Preserved additional fields from original product:', additionalFields);
      }

      // Debug: Log the payload being sent
      console.log('=== DEBUG: PRODUCT FORM SUBMISSION ===');
      console.log('Form data before cleaning:', data);
      console.log('Category ID from form:', data.category_id);
      console.log('Category ID type:', typeof data.category_id);
      console.log('Category ID length:', data.category_id?.length);
      console.log('Barcode from form:', data.barcode);
      console.log('Generated barcode:', barcode);
      console.log('Validated price values:', { retailPrice, wholesalePrice, costPrice });
      console.log('Cleaned data:', cleanData);
      console.log('Final payload:', payload);
      console.log('Retail price in payload:', payload.retail_price);
      console.log('Wholesale price in payload:', payload.wholesale_price);
      console.log('Cost price in payload:', payload.cost_price);
      console.log('Barcode in payload:', payload.barcode);
      console.log('Validation schema expects:', Object.keys(productSchema.shape));
      console.log('Location ID in payload:', payload.location_id);
      console.log('Available locations:', locations);
      console.log('Selected location name:', locations.find(loc => loc.id === payload.location_id)?.name || 'Unknown');
      console.log('Category ID in payload:', payload.category_id);
      console.log('Unit ID in payload:', payload.unit_id);
      console.log('Form values:', form.getValues());
      console.log('=== END DEBUG ===');
      
      // Validate location data before submission
      if (!payload.location_id) {
        toast({
          title: 'Location Required',
          description: 'Please select a location for this product.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      // Verify location exists in available locations
      const locationExists = locations.some(loc => loc.id === payload.location_id);
      if (!locationExists) {
        toast({
          title: 'Invalid Location',
          description: 'Selected location is not available. Please choose a valid location.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      let savedProduct;
      if (product) {
        // Update existing product
        savedProduct = await updateProduct(product.id, payload);
        // TODO: Re-enable when inventory_journal table is available
        // await createInventoryJournalEntry(savedProduct, false);
      } else {
        // Create new product
        savedProduct = await createProduct(payload);
        // TODO: Re-enable when inventory_journal table is available
        // await createInventoryJournalEntry(savedProduct, true);
      }

      // Handle variants if product has variants
      if (hasVariants && variants.length > 0) {
        // Validate variant pricing before processing
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          const variantRetailPrice = Number(variant.retail_price) || 0;
          const variantWholesalePrice = Number(variant.wholesale_price) || 0;
          const variantCostPrice = Number(variant.cost_price) || 0;
          
          if (variantRetailPrice <= 0 && variantWholesalePrice <= 0 && variantCostPrice <= 0) {
            toast({
              title: 'Variant Pricing Required',
              description: `Variant "${variant.name}: ${variant.value}" must have at least one price field greater than 0.`,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }

        try {
          for (const variant of variants) {
            const variantPayload = {
              name: variant.name,
              value: variant.value,
              sku: variant.sku || makeVariantSku(savedProduct.sku, variant.name),
              price_adjustment: variant.price_adjustment,
              stock_quantity: variant.stock_quantity,
              cost_price: variant.cost_price,
              wholesale_price: variant.wholesale_price,
              retail_price: variant.retail_price,
              image_url: variant.image_url,
              is_active: variant.is_active,
              product_id: savedProduct.id,
            };

            if (variant.id) {
              // Update existing variant
              const { error: updateError } = await supabase
                .from('product_variants')
                .update(variantPayload)
                .eq('id', variant.id);
              
              if (updateError) {
                console.error('Error updating variant:', updateError);
                throw new Error(`Failed to update variant: ${updateError.message}`);
              }
            } else {
              // Create new variant
              const { error: insertError } = await supabase
                .from('product_variants')
                .insert(variantPayload);
              
              if (insertError) {
                console.error('Error creating variant:', insertError);
                throw new Error(`Failed to create variant: ${insertError.message}`);
              }
            }
          }
        } catch (variantError) {
          console.error('Error handling variants:', variantError);
          // Don't fail the entire product save, just log the variant error
          toast({
            title: 'Warning',
            description: 'Product saved but there was an issue with variants. Check console for details.',
            variant: 'destructive',
          });
        }
      }
      
      // Invalidate queries to refresh product table
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['products', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['product_variants'] });
        console.log('Product queries invalidated for real-time update');
      }
      
      onClose(true);
      toast({
        title: 'Success',
        description: product ? 'Product updated successfully' : 'Product created successfully',
      });
    } catch (error) {
      console.error('Error saving product:', error);
      
      // Enhanced error logging for debugging
      if (error && typeof error === 'object') {
        console.error('Error details:', {
          code: (error as any).code,
          message: (error as any).message,
          details: (error as any).details,
          hint: (error as any).hint
        });
      }
      
      // Handle specific constraint violations with user-friendly messages
      let userMessage = 'Failed to save product';
      if (error && typeof error === 'object') {
        const errorCode = (error as any).code;
        const errorMsg = (error as any).message;
        
        switch (errorCode) {
          case '23505': // Unique constraint violation
            if (errorMsg.includes('barcode')) {
              userMessage = 'A product with this barcode already exists. Please use a different barcode or leave it empty.';
            } else if (errorMsg.includes('sku')) {
              userMessage = 'A product with this SKU already exists. Please use a different SKU.';
            } else {
              userMessage = 'A product with these details already exists. Please check your input.';
            }
            break;
          case '23502': // Not null constraint violation
            userMessage = 'Required fields are missing. Please fill in all required fields.';
            break;
          case '23503': // Foreign key constraint violation
            userMessage = 'Invalid reference selected. Please check your category, location, or other selections.';
            break;
          default:
            userMessage = errorMsg || 'Unknown error occurred';
        }
      }
      
      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
      });
      
      // Don't close the form on error - let user fix and retry
      // onClose(false); // Commented out to prevent form closure on error
    } finally {
      setLoading(false);
    }
  };

  // Handle step navigation
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      let nextStepIndex = currentStep + 1;
      
      // All products go through all steps to ensure pricing and stock are set
      console.log(`Moving from step ${currentStep} to step ${nextStepIndex}`, {
        currentStep,
        nextStepIndex,
        hasVariants,
        totalSteps: STEPS.length
      });
      
      setCurrentStep(nextStepIndex);
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
      cost_price: 0,
      wholesale_price: 0,
      retail_price: 0,
      image_url: '',
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
    
    // Auto-generate SKU when variant name or value changes
    if ((field === 'name' || field === 'value') && value) {
      const variant = updatedVariants[index];
      const parentSku = form.getValues('sku') || '';
      
      if (parentSku && variant.name && variant.value) {
        const autoSku = makeVariantSku(parentSku, `${variant.name}-${variant.value}`);
        updatedVariants[index] = { ...variant, sku: autoSku };
      }
    }
    
    setVariants(updatedVariants);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header removed - now handled by overlay wrapper */}

      {/* Progress Steps - Mobile responsive */}
      <div className="mb-6">
        {/* Desktop Steps */}
        <div className="hidden md:flex items-center space-x-4">
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
        
        {/* Mobile Steps */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-sm font-medium">
              {STEPS[currentStep]?.title || 'Product Setup'}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
        console.error('Form validation errors:', errors);
        console.log('Form values at validation failure:', form.getValues());
        
        // Show specific validation errors
        if (errors && Object.keys(errors).length > 0) {
          const firstError = Object.values(errors)[0];
          const errorMessage = firstError?.message || 'Please check the form fields and try again.';
          
          toast({
            title: 'Validation Error',
            description: errorMessage,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Validation Error',
            description: 'Please check the form fields and try again.',
            variant: 'destructive',
          });
        }
      })} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the essential product details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter product name"
                    className="w-full"
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
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    SKU must be unique. Leave empty to auto-generate.
                  </p>
                  {form.formState.errors.sku && (
                    <p className="text-sm text-red-500">{form.formState.errors.sku.message}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <div className="flex gap-2">
                    <Input
                      {...form.register('barcode')}
                      placeholder="Enter barcode (optional)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const generatedBarcode = await generateUniqueBarcode(tenantId!);
                          form.setValue('barcode', generatedBarcode);
                          toast({
                            title: 'Barcode Generated',
                            description: `Generated: ${formatBarcode(generatedBarcode)}`,
                            variant: 'default',
                          });
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to generate barcode',
                            variant: 'destructive',
                          });
                        }
                      }}
                      disabled={!tenantId}
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate, or click Generate for a new one. Each barcode must be unique.
                  </p>
                  {form.watch('barcode') && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800">
                        <strong>Barcode:</strong> {formatBarcode(form.watch('barcode') || '')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Brand</Label>
                  <Select
                    value={form.watch('brand_id') || ''}
                    onValueChange={(value) => form.setValue('brand_id', value)}
                  >
                    <SelectTrigger className="w-full">
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
                <div className="flex gap-2">
                  <Select
                    value={form.watch('location_id') || ''}
                    onValueChange={(value) => {
                      console.log('Setting location_id to:', value);
                      form.setValue('location_id', value);
                      
                      // Store selected location in localStorage for future use
                      if (value) {
                        localStorage.setItem('selected_location', value);
                        console.log('Location saved to localStorage:', value);
                      }
                    }}
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
                    size="sm"
                    onClick={refreshLocationData}
                    disabled={loading}
                    title="Refresh locations"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                
                {locations.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>No Locations Available:</strong> Please create store locations first before adding products.
                    </p>
                  </div>
                )}
                
                {form.formState.errors.location_id && (
                  <p className="text-sm text-red-500">{form.formState.errors.location_id.message}</p>
                )}
                
                {/* Show current location info */}
                {form.watch('location_id') && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-800">
                      <strong>Selected Location:</strong> {
                        locations.find(loc => loc.id === form.watch('location_id'))?.name || 'Unknown'
                      }
                    </p>
                  </div>
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
              {categories.length === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>No Categories Available:</strong> Please create product categories first before adding products.
                  </p>
                </div>
              )}
                              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category *</Label>
                    {categories.length > 0 ? (
                      <Select
                        value={form.watch('category_id') || ''}
                                            onValueChange={(value) => {
                      console.log('Setting category_id to:', value);
                      form.setValue('category_id', value);
                      form.setValue('subcategory_id', '');
                    }}
                      >
                        <SelectTrigger className="w-full">
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
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <strong>No Categories Available:</strong> Please create product categories first.
                        </p>
                      </div>
                    )}
                    {form.formState.errors.category_id && (
                      <p className="text-sm text-red-500">{form.formState.errors.category_id.message}</p>
                    )}
                  </div>

              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Brand</Label>
                  <Select
                    value={form.watch('brand_id')}
                    onValueChange={(value) => form.setValue('brand_id', value)}
                  >
                    <SelectTrigger className="w-full">
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
                    <SelectTrigger className="w-full">
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

              <div className="space-y-2">
                <Label>Product Expiry</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="has_expiry_date"
                      checked={hasExpiryDate}
                      onCheckedChange={setHasExpiryDate}
                    />
                    <Label htmlFor="has_expiry_date">Product has expiry date</Label>
                  </div>
                </div>
              </div>

              {hasVariants && (
                <div className="space-y-4">
                  {/* Variant Pricing Requirements Hint */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      <strong>Variant Pricing Required:</strong> Each variant must have at least one price field greater than 0. 
                      This ensures all product variants have valid selling prices.
                    </p>
                  </div>
                  
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
                          <Label>Stock Quantity</Label>
                          <Input
                            type="number"
                            value={variant.stock_quantity}
                            onChange={(e) => updateVariant(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                            placeholder="0"
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
                          <Label>Variant Image</Label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Handle file upload logic here
                                  console.log('Variant image file selected:', file.name);
                                  updateVariant(index, 'image_url', file.name); // Store filename for now
                                }
                              }}
                              className="hidden"
                              id={`variant-image-${index}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById(`variant-image-${index}`)?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Image
                            </Button>
                            {variant.image_url && (
                              <span className="text-sm text-muted-foreground">
                                {variant.image_url}
                              </span>
                            )}
                          </div>
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
              {/* Pricing - Only show for simple products */}
              {!hasVariants && (
                <div className="space-y-4">
                  {/* Pricing Requirements Hint */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Pricing Required:</strong> At least one price field must be greater than 0. 
                      This ensures your product has a valid selling price in the system.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                </div>
               )}

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

        {/* Navigation with Cancel button at bottom - Mobile responsive */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onClose(false)}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>

          <div className="flex gap-2 order-1 sm:order-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                className="flex-1 sm:flex-none"
              >
                <ArrowLeft className="w-4 w-4 mr-2" />
                Previous
              </Button>
            )}

            {(currentStep < STEPS.length - 1 && !(currentStep === 2 && hasVariants)) ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextStep();
                }}
                disabled={loading}
                className="flex-1 sm:flex-none"
              >
                Next
                <ArrowRight className="w-4 w-4 ml-2" />
              </Button>
            ) : (currentStep === STEPS.length - 1 || (currentStep === 2 && hasVariants)) ? (
              <Button
                type="submit"
                disabled={loading || isCreating || isUpdating || categories.length === 0 || locations.length === 0}
                className="flex-1 sm:flex-none"
              >
                {loading || isCreating || isUpdating ? 'Saving...' : (product ? 'Update Product' : 'Create Product')}
              </Button>
            ) : null}
          </div>
        </div>
      </form>




    </div>
  );
}
