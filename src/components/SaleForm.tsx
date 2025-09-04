import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useStableCallback, useStableValue } from "@/hooks/useStableCallback";
import { createEnhancedSalesJournalEntry } from "@/lib/accounting-integration";
import { processSaleInventory } from "@/lib/inventory-integration";
import { useUnifiedStock } from "@/hooks/useUnifiedStock";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, ShoppingCart, User, CreditCard, Banknote, Search, Package, FileText, Calendar, CheckCircle, Truck, Smartphone } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import QuickCreateCustomerDialog from './QuickCreateCustomerDialog';
import { CashChangeModal } from './CashChangeModal';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnsureBaseUnitPcs } from "@/hooks/useEnsureBaseUnitPcs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaymentProcessor } from "./PaymentProcessor";
import { EnhancedPaymentProcessor } from "./EnhancedPaymentProcessor";
import { ShippingSection } from "./ShippingSection";
import { InvoiceGenerator } from "./InvoiceGenerator";
import { MpesaPaymentModal } from "./MpesaPaymentModal";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";

import { sendCommunicationWithSettings } from '@/lib/communicationSettingsIntegration';
import { fetchCustomersFromContacts } from '@/lib/customerUtils';
import { getInventoryLevels } from "@/lib/inventory-integration";

import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useSoftWarnings } from "@/hooks/useSoftWarnings";
import { useCommonData } from "@/hooks/useCommonData";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, WARNING_MESSAGES } from '@/utils/errorMessages';
import { generateReceiptNumber, calculateSaleTotal, validateSaleData, prepareSaleItemsData, updateCashDrawer } from '@/utils/saleHelpers';
import type { SaleItem as SaleItemType, PaymentRecord } from '@/utils/saleHelpers';
import { 
  validateQuantity, 
  validateLocation, 
  validateProduct, 
  calculateTotalPrice, 
  calculateSubtotal, 
  calculateTotal,
  validateStockAvailability,
  validateCustomerCredit,
  generateUniqueId
} from '@/utils/commonUtils';

// Enhanced StockBadge component with stable state management
const StockBadge = ({ productId, variantId, locationId, getLocationSpecificStock, locationName }: {
  productId: string;
  variantId?: string;
  locationId?: string;
  locationName?: string;
  getLocationSpecificStock: (productId: string, variantId?: string, locationId?: string) => Promise<number>;
}) => {
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Stable cache key to prevent unnecessary refetches
  const cacheKey = useStableValue(`${productId}_${variantId || 'main'}_${locationId || 'default'}`, [productId, variantId, locationId]);

  const stableFetchStock = useStableCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      let stockAmount = await getLocationSpecificStock(productId, variantId, locationId);
      setStock(stockAmount);
    } catch (error) {
      console.error('Error fetching stock:', error);
      // Set to 0 on error to show unavailable
      setStock(0);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (cacheKey) {
      stableFetchStock();
    }
  }, [cacheKey, stableFetchStock]);

  if (loading && stock === null) {
    return <Badge variant="outline" className="text-xs">Loading...</Badge>;
  }

  const stockAmount = stock ?? 0;
  const displayText = locationId && locationName 
    ? `Stock at ${locationName}: ${stockAmount}`
    : `Stock: ${stockAmount}`;

  return (
    <Badge 
      variant={stockAmount > 0 ? "default" : "destructive"}
      className="text-xs"
      title={displayText}
    >
      {displayText}
    </Badge>
  );
};


const saleSchema = z.object({
  customer_id: z.string().optional(),
  sale_type: z.enum(["in_store", "online"]),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  shipping_amount: z.number().min(0).default(0),
  valid_until: z.date().optional(),
});

interface SaleItem {
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleFormProps {
  onSaleCompleted?: () => void;
  initialMode?: "sale" | "quote";
}

export function SaleForm({ onSaleCompleted, initialMode = "sale" }: SaleFormProps) {
  const { tenantId } = useAuth();
  useEnsureBaseUnitPcs();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  
  const { pos: posSettings, tax: taxSettings, inventory: inventorySettings, documents: docSettings } = useBusinessSettings();
  
  // Unified stock hook for cache management
  const { clearCache: clearStockCache } = useUnifiedStock();
  
  // Centralized warning system
  const {
    showLowStockWarning,
    showNegativeStockWarning,
    showOutOfStockWarning,
    showWholesalePricingWarning,
    showCreditLimitWarning,
    showCreditLimitAlert,
    showOversellingWarning,
    showInsufficientStockError,
    showCustomerCreditInfo,
    showOversellingConfirmation,
    showWholesalePricingInfo,
  } = useSoftWarnings();
  
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>(localStorage.getItem('selected_location') || '');
  
  // Centralized data management
  const { products, customers, locations, loading: dataLoading, error: dataError, refreshData } = useCommonData();
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  
  // Location handler with persistence
  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    localStorage.setItem('selected_location', value);
  };
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1.0);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"sale" | "quote">(initialMode);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCashChangeModal, setShowCashChangeModal] = useState(false);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [cashAmountPaid, setCashAmountPaid] = useState(0);
  
  // Enhanced payment and shipping state
  const [enhancedPayments, setEnhancedPayments] = useState<any[]>([]);
  const [shippingAgentId, setShippingAgentId] = useState<string | null>(null);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingIncludedInTotal, setShippingIncludedInTotal] = useState(true);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>({ id: 'walk-in', name: 'Walk-in Customer' });

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sale_type: "in_store",
      customer_id: "walk-in",
      discount_amount: 0,
      tax_amount: 0,
      shipping_amount: 0,
    },
  });

  const saleType = form.watch("sale_type");

  

  useEffect(() => {
    if (tenantId) {
      // Parallel data fetching for better performance
      Promise.all([
        checkMpesaConfig(),
        fetchBusinessSettings()
      ]).catch(error => {
        console.error('Error during data fetching:', error);
      });
    } else {
      setFilteredProducts([]);
      setMpesaEnabled(false);
      setBusinessSettings(null);
    }
  }, [tenantId]);

  // Remove unnecessary product refetch when location changes - products don't change by location
  // Instead, we filter products by location-specific stock in the UI

  const fetchBusinessSettings = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('tax_inclusive, default_tax_rate, enable_overselling, enable_negative_stock')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!error && data) {
        setBusinessSettings(data);
      }
    } catch (error) {
      console.error('Error fetching business settings:', error);
    }
  };

  // Stable product filtering with reduced debounce time to minimize flicker
  const filteredProductsStable = useMemo(() => {
    if (!searchTerm.trim()) {
      return products;
    }
    
    try {
      return products.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error filtering products:', error);
      return [];
    }
  }, [products, searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilteredProducts(filteredProductsStable);
    }, 150); // Reduced from 300ms to minimize flicker

    return () => clearTimeout(timeoutId);
  }, [filteredProductsStable]);



// Remove redundant inventory fetching - now using direct stock calculation

  const checkMpesaConfig = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('mpesa_configurations' as any)
        .select('is_enabled')
        .eq('tenant_id', tenantId)
        .eq('is_enabled', true)
        .maybeSingle();

      setMpesaEnabled(!!(data as any)?.is_enabled);
    } catch (error) {
      console.error('Error checking Mpesa config:', error);
      setMpesaEnabled(false);
    }
  };

  // Optimized location-specific stock with caching to prevent flickering
  const locationStockCache = useMemo(() => new Map<string, number>(), []);
  
  const getLocationSpecificStock = useStableCallback(async (productId: string, variantId?: string, locationId?: string) => {
    if (!locationId || !tenantId) {
      // For non-location specific requests, get basic stock from products
      const product = products.find(p => p.id === productId);
      if (variantId && product?.product_variants) {
        const variant = product.product_variants.find((v: any) => v.id === variantId);
        return variant?.stock_quantity || 0;
      }
      return product?.stock_quantity || 0;
    }

    const cacheKey = `${productId}_${variantId || 'main'}_${locationId}`;
    
    // Return cached value if available and fresh (less than 30 seconds old)
    if (locationStockCache.has(cacheKey)) {
      return locationStockCache.get(cacheKey)!;
    }

    try {
      // Get base product stock for the specific location
      const { data: product } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .eq('location_id', locationId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      let baseStock = product?.stock_quantity ?? 0;
      
      // Calculate stock adjustments for this product at this location
      const { data: adjustments } = await supabase
        .from('stock_adjustment_items')
        .select(`
          adjustment_quantity,
          stock_adjustments!inner(tenant_id, status)
        `)
        .eq('product_id', productId)
        .eq('location_id', locationId)
        .eq('stock_adjustments.tenant_id', tenantId)
        .eq('stock_adjustments.status', 'approved');
      
      let adjustmentTotal = 0;
      if (adjustments) {
        adjustmentTotal = adjustments.reduce((total, adj) => {
          return total + adj.adjustment_quantity;
        }, 0);
      }
      
      // Calculate recent sales that might not be reflected in base stock
      const { data: recentSales } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          sales!inner(tenant_id, location_id, created_at)
        `)
        .eq('product_id', productId)
        .eq('sales.tenant_id', tenantId)
        .eq('sales.location_id', locationId)
        .gte('sales.created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours
      
      let recentSalesTotal = 0;
      if (recentSales) {
        recentSalesTotal = recentSales.reduce((total, sale) => total + sale.quantity, 0);
      }

      let locationStock = baseStock + adjustmentTotal - recentSalesTotal;
      
      console.log(`Stock calculation for product ${productId} at location ${locationId}:`, {
        baseStock,
        adjustmentTotal,
        recentSalesTotal,
        finalLocationStock: locationStock
      });
      
      // Apply minimum stock threshold
      locationStock = Math.max(0, locationStock);

      // Cache the result
      locationStockCache.set(cacheKey, locationStock);
      
      // Clear cache after 30 seconds
      setTimeout(() => {
        locationStockCache.delete(cacheKey);
      }, 30000);

      return locationStock;
    } catch (error) {
      console.error('Error calculating location-specific stock:', error);
      // Fallback to basic product stock on error
      const product = products.find(p => p.id === productId);
      if (variantId && product?.product_variants) {
        const variant = product.product_variants.find((v: any) => v.id === variantId);
        return variant?.stock_quantity || 0;
      }
      return product?.stock_quantity || 0;
    }
  });

// Remove redundant getActualStock function - using unified stock calculation

  const addItemToSale = async () => {
    console.log('addItemToSale called with:', {
      selectedProduct,
      selectedVariant,
      selectedLocation,
      quantity,
      customPrice,
      saleItemsLength: saleItems.length
    });

    // Centralized validation
    const productValidation = validateProduct(selectedProduct);
    if (!productValidation.isValid) {
      toast({
        title: "Error",
        description: productValidation.error,
        variant: "destructive",
      });
      return;
    }

    const quantityValidation = validateQuantity(quantity);
    if (!quantityValidation.isValid) {
      toast({
        title: "Invalid Quantity",
        description: quantityValidation.error,
        variant: "destructive",
      });
      return;
    }

    const locationValidation = validateLocation(selectedLocation);
    if (!locationValidation.isValid) {
      toast({
        title: "Location Required",
        description: locationValidation.error,
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id === selectedProduct);

    // Check if product has variants but no variant is selected
    if (product.product_variants && product.product_variants.length > 0 && (!selectedVariant || selectedVariant === "")) {
      toast({
        title: "Variant Required",
        description: "This product has variants. Please select a variant before adding to sale.",
        variant: "destructive",
      });
      return;
    }

    // Check location-specific stock availability
    let currentStock;
    try {
      currentStock = await getLocationSpecificStock(
        selectedProduct, 
        selectedVariant !== "no-variant" ? selectedVariant : undefined,
        selectedLocation
      );
      console.log('Stock check result:', { currentStock, quantity, selectedLocation });
    } catch (error) {
      console.error('Error getting stock:', error);
      // Fallback to basic product stock on error
      const product = products.find(p => p.id === selectedProduct);
      if (selectedVariant !== "no-variant" && product?.product_variants) {
        const variant = product.product_variants.find((v: any) => v.id === selectedVariant);
        currentStock = variant?.stock_quantity || 0;
      } else {
        currentStock = product?.stock_quantity || 0;
      }
    }
    
    // Centralized stock validation and warnings
    const allowNegativeStock = inventorySettings.enableNegativeStock || false;
    const allowOverselling = businessSettings?.enable_overselling || false;
    const locationName = locations.find(loc => loc.id === selectedLocation)?.name;
    
    console.log('Stock settings:', { allowNegativeStock, allowOverselling, currentStock, quantity });
    
    // Show low stock warning
    showLowStockWarning(product.name, currentStock, locationName);
    
    // Validate stock availability
    const stockValidation = validateStockAvailability(currentStock, quantity, allowNegativeStock, allowOverselling);
    if (!stockValidation.isValid) {
      showInsufficientStockError(product.name, quantity, currentStock, locationName);
      return;
    }
    
    // Show enhanced overselling warning if applicable
    if (stockValidation.warning) {
      if (allowOverselling) {
        // Show confirmation dialog for overselling when enabled
        showOversellingConfirmation(
          product.name, 
          quantity, 
          currentStock, 
          () => {
            // Continue with adding item
            console.log('Overselling confirmed, continuing...');
          },
          () => {
            // Cancel adding item
            console.log('Overselling cancelled');
            return;
          }
        );
      } else {
        // Show regular overselling warning
        showOversellingWarning(product.name, quantity, currentStock, locationName);
      }
    }

    let variant = null;
    let unitPrice = getCustomerAppropriatePrice(product);
    let productName = product.name;

    // Log pricing information for debugging
    console.log('💰 PRICING LOGIC:', {
      customerName: selectedCustomer?.name,
      isReseller: selectedCustomer?.is_reseller,
      productName: product.name,
      retailPrice: product.retail_price || product.price,
      wholesalePrice: product.wholesale_price || product.price,
      selectedPrice: unitPrice,
      pricingType: selectedCustomer?.is_reseller ? 'WHOLESALE' : 'RETAIL'
    });

    if (selectedVariant && selectedVariant !== "no-variant") {
      variant = product.product_variants.find((v: any) => v.id === selectedVariant);
      if (variant) {
        unitPrice = getCustomerAppropriatePrice(product, variant);
        productName = `${productName} - ${variant.name}: ${variant.value}`;
        
        console.log('💰 VARIANT PRICING LOGIC:', {
          variantName: `${variant.name}: ${variant.value}`,
          variantRetailPrice: variant.retail_price || product.retail_price || product.price,
          variantWholesalePrice: variant.wholesale_price || product.wholesale_price || product.price,
          selectedPrice: unitPrice,
          pricingType: selectedCustomer?.is_reseller ? 'WHOLESALE' : 'RETAIL'
        });
      }
    }

    // Use custom price if set
    if (customPrice !== null && customPrice > 0) {
      unitPrice = customPrice;
    }

    // Check if item already exists in sale (including proper variant handling)
    const currentVariantId = selectedVariant && selectedVariant !== "no-variant" ? selectedVariant : undefined;
    const existingItemIndex = saleItems.findIndex(item => 
      item.product_id === selectedProduct && 
      (item.variant_id === currentVariantId || (!item.variant_id && !currentVariantId))
    );

    console.log('Adding item with details:', {
      productName,
      unitPrice,
      quantity,
      currentVariantId,
      existingItemIndex
    });

    if (existingItemIndex !== -1) {
      // Check if the new total quantity would exceed stock
      const newTotalQuantity = saleItems[existingItemIndex].quantity + quantity;
      
      // Centralized validation for existing item updates
      const stockValidation = validateStockAvailability(currentStock, newTotalQuantity, allowNegativeStock, allowOverselling);
      if (!stockValidation.isValid) {
        showInsufficientStockError(product.name, newTotalQuantity, currentStock, locationName);
        return;
      }
      
      // Show enhanced overselling warning if applicable
      if (stockValidation.warning) {
        if (allowOverselling) {
          // Show confirmation dialog for overselling when enabled
          showOversellingConfirmation(
            product.name, 
            newTotalQuantity, 
            currentStock, 
            () => {
              // Continue with updating item
              console.log('Overselling confirmed for existing item, continuing...');
            },
            () => {
              // Cancel updating item
              console.log('Overselling cancelled for existing item');
              return;
            }
          );
        } else {
          // Show regular overselling warning
          showOversellingWarning(product.name, newTotalQuantity, currentStock, locationName);
        }
      }
      
      // Show low stock warning for existing items
      showLowStockWarning(product.name, currentStock, locationName);
      
      // Update existing item quantity
      const updatedItems = [...saleItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].total_price = updatedItems[existingItemIndex].unit_price * updatedItems[existingItemIndex].quantity;
      setSaleItems(updatedItems);
      
      console.log('Updated existing item:', updatedItems[existingItemIndex]);
      
      toast({
        title: "Item Updated",
        description: `Increased quantity of ${productName} to ${updatedItems[existingItemIndex].quantity}`,
      });
    } else {
      // Add new item
      const totalPrice = unitPrice * quantity;
      const newItem: SaleItem = {
        product_id: selectedProduct,
        product_name: productName,
        variant_id: currentVariantId,
        variant_name: variant?.name,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
      
      console.log('Adding new item:', newItem);
      
      const newSaleItems = [...saleItems, newItem];
      setSaleItems(newSaleItems);
      
      console.log('New sale items array:', newSaleItems);
      
      // Show out of stock warning if adding item with zero stock
      if (currentStock === 0 && allowOverselling) {
        showOutOfStockWarning(productName, locationName, true);
      } else {
        toast({
          title: "Item Added",
          description: `Added ${productName} to sale`,
        });
      }
      
      // Show wholesale pricing information for reseller customers
      if (selectedCustomer?.is_reseller) {
        const retailPrice = product.retail_price || product.price;
        const wholesalePrice = product.wholesale_price || product.price;
        if (retailPrice !== wholesalePrice && unitPrice === wholesalePrice) {
          showWholesalePricingInfo(selectedCustomer.name, productName, retailPrice, wholesalePrice);
        }
      }
      
      // Check credit limit warnings for customers with credit limits
      const newTotal = calculateSubtotal() + (form.getValues("tax_amount") || 0) + (form.getValues("shipping_amount") || 0) - (form.getValues("discount_amount") || 0);
      if (selectedCustomer && selectedCustomer.id !== 'walk-in' && selectedCustomer.credit_limit) {
        showCreditLimitAlert(selectedCustomer.name, selectedCustomer.current_credit_balance || 0, selectedCustomer.credit_limit, newTotal);
      }
    }

    setSelectedProduct("");
    setSelectedVariant("");
    setSearchTerm("");
    setQuantity(1);
    setCustomPrice(null);
    
    console.log('addItemToSale completed, final saleItems length:', saleItems.length + 1);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleProductSelect = useStableCallback((productId: string) => {
    try {
      setSelectedProduct(productId);
      setSelectedVariant("");
      setCustomPrice(null);
      // Don't clear search term immediately to maintain UI stability
    } catch (error) {
      console.error('Error selecting product:', error);
      toast({
        title: "Error",
        description: "Failed to select product",
        variant: "destructive",
      });
    }
  });

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = form.getValues("discount_amount") || 0;
    const shipping = form.getValues("shipping_amount") || 0;
    
    // Calculate tax based on business settings
    let tax = form.getValues("tax_amount") || 0;
    const defaultTaxRate = businessSettings?.default_tax_rate || 0;
    const isTaxInclusive = businessSettings?.tax_inclusive || false;
    
    // Auto-calculate tax if not manually set and tax rate exists
    if (tax === 0 && defaultTaxRate > 0) {
      if (isTaxInclusive) {
        // Tax is included in the price, calculate separately for display
        tax = (subtotal - discount + shipping) * (defaultTaxRate / (100 + defaultTaxRate));
      } else {
        // Tax is added to the price
        tax = (subtotal - discount + shipping) * (defaultTaxRate / 100);
      }
      form.setValue("tax_amount", Number(tax.toFixed(2)));
    }
    
    if (isTaxInclusive) {
      // For tax-inclusive pricing, total is subtotal - discount + shipping (tax already included)
      return subtotal - discount + shipping;
    } else {
      // For tax-exclusive pricing, add tax to the total
      return subtotal - discount + tax + shipping;
    }
  };

  const generateReceiptNumber = () => {
    if (docSettings.invoiceAutoNumber) {
      return `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }
    return `MANUAL-${Date.now()}`;
  };

  const generateQuoteNumber = () => {
    if (docSettings.quoteAutoNumber) {
      return `QUO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }
    return `MANUAL-QUO-${Date.now()}`;
  };

  const handlePaymentsChange = (newPayments: any[], newRemainingBalance: number) => {
    setPayments(newPayments);
    setRemainingBalance(newRemainingBalance);
  };

  const handleCashPayment = (amount: number) => {
    const totalAmount = calculateTotal();
    if (amount > totalAmount) {
      setCashAmountPaid(amount);
      setShowCashChangeModal(true);
      return false; // Don't add payment yet
    }
    return true; // Proceed with normal payment
  };

  // Enhanced payment and shipping handlers
  const handleEnhancedPaymentsChange = (newPayments: any[], newRemainingBalance: number) => {
    setEnhancedPayments(newPayments);
    setRemainingBalance(newRemainingBalance);
  };

  const handleShippingChange = (data: {
    agentId: string | null;
    fee: number;
    address: string;
    includedInTotal: boolean;
  }) => {
    setShippingAgentId(data.agentId);
    setShippingFee(data.fee);
    setShippingAddress(data.address);
    setShippingIncludedInTotal(data.includedInTotal);
    
    // Update form shipping amount if included in total
    if (data.includedInTotal) {
      form.setValue('shipping_amount', data.fee);
    } else {
      form.setValue('shipping_amount', 0);
    }
  };

  const handleInvoiceGenerated = (invoiceId: string) => {
    setGeneratedInvoiceId(invoiceId);
    setShowInvoiceGenerator(false);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    const newCustomer = customer || { id: 'walk-in', name: 'Walk-in Customer' };
    setSelectedCustomer(newCustomer);
    
    // Update prices for existing items in cart based on new customer type
    if (saleItems.length > 0) {
      setIsUpdatingPrices(true);
      console.log('🔄 UPDATING CART PRICES FOR CUSTOMER CHANGE:', {
        customerName: newCustomer.name,
        isReseller: newCustomer.is_reseller,
        itemsCount: saleItems.length
      });
      
      const updatedItems = saleItems.map(item => {
        // Find the product for this item
        const product = products.find(p => p.id === item.product_id);
        if (!product) return item;
        
        // Find variant if applicable
        let variant = null;
        if (item.variant_id) {
          variant = product.product_variants?.find((v: any) => v.id === item.variant_id);
        }
        
        // Get the appropriate price for the new customer type
        const newUnitPrice = getCustomerAppropriatePrice(product, variant, newCustomer);
        
        // Only update if price actually changed
        if (newUnitPrice !== item.unit_price) {
          const newTotalPrice = newUnitPrice * item.quantity;
          
          console.log('💰 PRICE UPDATE:', {
            productName: item.product_name,
            variantName: item.variant_name || 'N/A',
            oldPrice: item.unit_price,
            newPrice: newUnitPrice,
            quantity: item.quantity,
            oldTotal: item.total_price,
            newTotal: newTotalPrice,
            pricingType: newCustomer.is_reseller ? 'WHOLESALE' : 'RETAIL'
          });
          
          return {
            ...item,
            unit_price: newUnitPrice,
            total_price: newTotalPrice
          };
        }
        
        return item;
      });
      
      // Update the sale items with new prices
      setSaleItems(updatedItems);
      
      // Show notification about price changes
      const priceChanges = updatedItems.filter((item, index) => 
        item.unit_price !== saleItems[index].unit_price
      );
      
      if (priceChanges.length > 0) {
        toast({
          title: 'Prices Updated',
          description: `Updated prices for ${priceChanges.length} item${priceChanges.length !== 1 ? 's' : ''} based on ${newCustomer.is_reseller ? 'wholesale' : 'retail'} pricing.`,
          variant: 'default',
        });
      }
      
      // Reset loading state after a brief delay to show the update
      setTimeout(() => {
        setIsUpdatingPrices(false);
      }, 1000);
    }
    
    // Show enhanced wholesale pricing warning for reseller customers
    if (customer?.is_reseller) {
      showWholesalePricingWarning(customer.name);
      
      // Show detailed pricing info for the first product if available
      if (products.length > 0) {
        const firstProduct = products[0];
        const retailPrice = firstProduct.retail_price || firstProduct.price;
        const wholesalePrice = firstProduct.wholesale_price || firstProduct.price;
        if (retailPrice !== wholesalePrice) {
          showWholesalePricingInfo(customer.name, firstProduct.name, retailPrice, wholesalePrice);
        }
      }
    }
    
    // Show credit limit information for customers with credit limits
    if (customer && customer.credit_limit && customer.credit_limit > 0) {
      showCustomerCreditInfo(customer.name, customer.current_credit_balance || 0, customer.credit_limit);
    }
  };

  const getCustomerAppropriatePrice = (product: any, variant?: any, customer?: any) => {
    const currentCustomer = customer || selectedCustomer;
    
    if (currentCustomer?.is_reseller) {
      // Return wholesale price for resellers
      if (variant) {
        return variant.wholesale_price || variant.sale_price || product.wholesale_price || product.price;
      }
      return product.wholesale_price || product.price;
    }
    // Return retail price for regular customers
    if (variant) {
      return variant.retail_price || variant.sale_price || product.retail_price || product.price;
    }
    return product.retail_price || product.price;
  };



  const confirmCashPayment = () => {
    const totalAmount = calculateTotal();
    const changeAmount = cashAmountPaid - totalAmount;
    
    // Add the cash payment for the exact total amount (not overpayment)
    const cashPayment = {
      id: Date.now().toString(),
      method: 'cash',
      amount: totalAmount, // Only record the exact amount needed
      reference: `Cash received: ${formatCurrency(cashAmountPaid)} - Change: ${formatCurrency(changeAmount)}`
    };
    
    setPayments([cashPayment]);
    setRemainingBalance(0); // This will be 0 since we're paying the exact amount
    setShowCashChangeModal(false);
  };

  const handleMpesaPayment = () => {
    if (calculateTotal() <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please add items to the sale before processing payment",
        variant: "destructive",
      });
      return;
    }
    setShowMpesaModal(true);
  };

  const handleMpesaSuccess = (transactionId: string) => {
    const totalAmount = calculateTotal();
    const mpesaPayment = {
      id: transactionId,
      method: 'mpesa',
      amount: totalAmount,
      reference: `M-Pesa Payment - Transaction: ${transactionId}`
    };
    
    setPayments([mpesaPayment]);
    setRemainingBalance(0);
    setShowMpesaModal(false);
    
    toast({
      title: "Payment Successful",
      description: "M-Pesa payment completed successfully",
    });
  };

  const handleMpesaError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive",
    });
  };

  const saveAsQuote = async (values: z.infer<typeof saleSchema>) => {
    if (saleItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the quote",
        variant: "destructive",
      });
      return;
    }

    if (!selectedLocation) {
      toast({
        title: "Location Required",
        description: "Please select a location for this quote",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      const quoteNumber = generateQuoteNumber();
      const totalAmount = calculateTotal();

      // Validate that customer is not walk-in
      if (values.customer_id === "walk-in") {
        toast({
          title: "Error",
          description: "Quotes can only be created for existing customer accounts, not walk-in customers",
          variant: "destructive",
        });
        return;
      }

      // Fetch customer name for persistence
      let customerName = null;
      if (values.customer_id) {
        const { data: customerData } = await supabase
          .from("contacts")
          .select("name")
          .eq("id", values.customer_id)
          .single();
        customerName = customerData?.name;
      }

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          customer_id: values.customer_id,
          customer_name: customerName,
          cashier_id: user.id,
          tenant_id: tenantData,
          total_amount: totalAmount,
          discount_amount: values.discount_amount,
          tax_amount: values.tax_amount,
          shipping_amount: values.shipping_amount,
          status: "draft",
          valid_until: values.valid_until?.toISOString(),
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteItemsData = saleItems.map(item => ({
        quote_id: quote.id,
        product_id: item.product_id,
        variant_id: item.variant_id && item.variant_id !== "no-variant" && item.variant_id !== "" ? item.variant_id : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        tenant_id: tenantId,
      }));

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(quoteItemsData);

      if (itemsError) throw itemsError;

        // Send quote notification using direct service import to avoid hook context issues
        try {
          const customer = customers.find(c => c.id === values.customer_id);
          if (customer?.phone || customer?.email) {
            const { UnifiedCommunicationService } = await import('@/lib/unifiedCommunicationService');
            const service = new UnifiedCommunicationService(tenantId || '', 'user', false);
            
            await service.sendQuoteNotification(
              {
                id: quote.id,
                quote_number: quoteNumber,
                customer_id: values.customer_id,
                customer_name: customer?.name || 'Customer',
                total_amount: totalAmount,
                created_at: new Date().toISOString(),
                valid_until: values.valid_until?.toISOString(),
                items: saleItems.map(item => ({
                  product_name: item.product_name,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  subtotal: item.quantity * item.unit_price
                }))
              },
              customer?.phone || undefined,
              customer?.email || undefined
            );
          }
        } catch (error) {
          console.error('Quote notification failed:', error);
          // Don't fail the quote creation if notification fails
        }

        toast({
          title: "Quote Created",
          description: `Quote #${quoteNumber} created successfully`,
        });

      form.reset();
      setSaleItems([]);
      setSearchTerm("");
      setSelectedProduct("");
      setSelectedVariant("");
      onSaleCompleted?.();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create quote",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndPrepareSubmit = (values: z.infer<typeof saleSchema>) => {
    if (mode === "quote") {
      return saveAsQuote(values);
    }

    if (saleItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the sale",
        variant: "destructive",
      });
      return;
    }

    // Validate discount against business settings
    if (values.discount_amount > 0 && !posSettings.enableDiscounts) {
      toast({
        title: "Discounts Disabled",
        description: "Discounts are disabled in your business settings",
        variant: "destructive",
      });
      return;
    }

    // Validate discount percentage limit
    if (values.discount_amount > 0 && posSettings.enableDiscounts) {
      const subtotal = calculateSubtotal();
      const discountPercent = (values.discount_amount / subtotal) * 100;
      if (discountPercent > posSettings.maxDiscountPercent) {
        toast({
          title: "Discount Limit Exceeded", 
          description: `Maximum discount allowed is ${posSettings.maxDiscountPercent}%`,
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedLocation) {
      toast({
        title: "Location Required",
        description: "Please select a location for this sale",
        variant: "destructive",
      });
      return;
    }

    const hasCreditPayment = payments.some(p => p.method.toLowerCase().includes('credit'));
    
    // Auto-fetch first customer (non-walk-in) for credit sales
    if (hasCreditPayment && (!values.customer_id || values.customer_id === "walk-in")) {
      const firstCustomer = customers.find(c => c.id !== "walk-in");
      if (firstCustomer) {
        form.setValue("customer_id", firstCustomer.id);
        // Trigger field update to reflect in UI immediately
        form.trigger("customer_id");
        toast({
          title: "Customer Auto-Selected",
          description: `Selected ${firstCustomer.name} for credit sale. Please submit again.`,
        });
        // Don't recursively call - let user resubmit with auto-selected customer
        return;
      } else {
        toast({
          title: "Customer Required",
          description: "Please add a customer first for credit sales",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (remainingBalance > 0 && !hasCreditPayment) {
      toast({
        title: "Payment Required",
        description: "Please complete payment before finalizing sale",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmation(true);
  };

  const completeSale = async () => {
    console.log('completeSale function called');
    const values = form.getValues();
    const hasCreditPayment = payments.some(p => p.method.toLowerCase().includes('credit'));

    setIsSubmitting(true);
    setShowConfirmation(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_AUTHENTICATED);
      if (!tenantId) throw new Error(ERROR_MESSAGES.NO_TENANT_ASSIGNED);

      const receiptNumber = generateReceiptNumber();
      const totalAmount = calculateTotal();
      
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          receipt_number: receiptNumber,
          customer_id: values.customer_id === "walk-in" ? null : values.customer_id,
          cashier_id: user.id,
          tenant_id: tenantId,
          location_id: selectedLocation || null,
          total_amount: totalAmount,
          discount_amount: values.discount_amount,
          tax_amount: values.tax_amount,
          shipping_amount: values.shipping_amount,
          status: hasCreditPayment ? "pending" : "completed",
          sale_type: values.sale_type,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Add sale items using centralized helper
      const saleItemsData = prepareSaleItemsData(sale.id, saleItems, products);

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Process payments and update cash drawer for cash payments
      if (!hasCreditPayment && payments.length > 0) {
        const paymentData = payments.map(payment => ({
          sale_id: sale.id,
          amount: payment.amount,
          payment_method: payment.method,
          reference_number: payment.reference || '',
          tenant_id: tenantId,
        }));

        const { error: paymentError } = await supabase
          .from("payments")
          .insert(paymentData);

        if (paymentError) throw paymentError;

        // Update cash drawer for cash payments using helper
        const cashPayments = payments.filter(p => p.method.toLowerCase().includes('cash'));
        await updateCashDrawer(tenantId, user.id, cashPayments, receiptNumber, sale.id);
      }

      // Process inventory adjustments
      const inventoryItems = saleItems.map(item => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
        unitCost: item.unit_price
      }));
      await processSaleInventory(sale.id, tenantId, inventoryItems);

      // Clear stock cache to ensure real-time updates across all components
      clearStockCache();

      // Process all post-sale operations in parallel for better performance
      const postSaleOperations = [];

      // Create AR entry for credit sales
      if (hasCreditPayment && values.customer_id && values.customer_id !== "walk-in") {
        postSaleOperations.push(
          (async () => {
            try {
              await supabase.rpc('create_accounts_receivable_record', {
                tenant_id_param: tenantId,
                sale_id_param: sale.id,
                customer_id_param: values.customer_id,
                total_amount_param: totalAmount,
                due_date_param: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              });
              console.log('AR entry created successfully');
            } catch (error) {
              console.error('AR creation error:', error);
              // Don't call toast here to avoid React context issues
            }
          })()
        );
      }

      // Create accounting entries
      postSaleOperations.push(
        (async () => {
          try {
            await createEnhancedSalesJournalEntry(tenantId, {
              saleId: sale.id,
              cashierId: user.id,
              customerId: values.customer_id === "walk-in" ? null : values.customer_id,
              totalAmount,
              discountAmount: values.discount_amount,
              taxAmount: values.tax_amount,
              shippingAmount: values.shipping_amount,
              payments: hasCreditPayment ? [] : payments,
            });
            console.log('Accounting entry created successfully');
          } catch (error) {
            console.error('Accounting entry error:', error);
            // Don't call toast here to avoid React context issues
          }
        })()
      );

      // Enhanced receipt notification with proper error boundaries
      const customer = customers.find(c => c.id === values.customer_id);
      if (customer?.phone || customer?.email) {
        postSaleOperations.push(
          (async () => {
            try {
              console.log('Sending receipt notification:', { 
                saleId: sale.id, 
                tenantId, 
                customerPhone: customer?.phone,
                customerEmail: customer?.email 
              });
              
              // Call receipt notification directly with context data to avoid hook context issues
              const { UnifiedCommunicationService } = await import('@/lib/unifiedCommunicationService');
              const service = new UnifiedCommunicationService(tenantId || '', 'user', false);
              
              await service.sendReceiptNotification(
                {
                  id: sale.id,
                  receipt_number: receiptNumber,
                  customer_id: values.customer_id,
                  customer_name: customer?.name || 'Customer',
                  total_amount: totalAmount,
                  created_at: new Date().toISOString(),
                  payment_method: payments.length > 0 ? payments[0].method : 'Cash',
                  items: saleItems.map(item => ({
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    subtotal: item.quantity * item.unit_price
                  }))
                },
                customer?.phone || undefined,
                customer?.email || undefined
              );
              console.log('Receipt notification sent successfully');
            } catch (error) {
              console.error('Receipt notification failed:', error);
              // Don't show toast here as it might be a settings issue
            }
          })()
        );
      }

      // Execute all post-sale operations in parallel
      await Promise.allSettled(postSaleOperations);

      toast({
        title: "Sale Completed", 
        description: `${SUCCESS_MESSAGES.SALE_COMPLETED} Receipt #${receiptNumber}`,
      });

      form.reset();
      setSaleItems([]);
      setPayments([]);
      setSearchTerm("");
      setSelectedProduct("");
      setSelectedVariant("");
      onSaleCompleted?.();

    } catch (error: any) {
      console.error('Sale completion error:', error);
      toast({
        title: "Error",
        description: error.message || ERROR_MESSAGES.SALE_COMPLETION_FAILED,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-none mx-2 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New {mode === "sale" ? "Sale" : "Quote"}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "sale" ? "default" : "outline"}
            onClick={() => setMode("sale")}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Sale
          </Button>
          <Button
            variant={mode === "quote" ? "default" : "outline"}
            onClick={() => setMode("quote")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Quote
          </Button>
        </div>
      </div>

      {/* Reseller Customer Alert Badge */}
      {selectedCustomer?.is_reseller && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-orange-600 text-sm font-bold">W</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-orange-800 font-semibold text-sm">
                Wholesale Pricing Active
              </h3>
              <p className="text-orange-700 text-xs mt-1">
                All items in this {mode === "sale" ? "sale" : "quote"} are using wholesale pricing for <strong>{selectedCustomer.name}</strong>
              </p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                Reseller Customer
              </span>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(validateAndPrepareSubmit)} className="space-y-6">
          {/* 50/50 Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection Section - 1/2 width */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Product Selection
                  </CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Select value={selectedLocation} onValueChange={handleLocationChange}>
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
                   </div>
                   <div className="relative">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input
                       placeholder="Search by name, SKU, or barcode..."
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="pl-9"
                     />
                    </div>

                    {!selectedLocation && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Notice:</strong> Please select a location to view available products and their stock levels.
                        </p>
                      </div>
                    )}

                    {selectedLocation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                        <p className="text-xs text-blue-800">
                          Showing products available at {locations.find(loc => loc.id === selectedLocation)?.name || 'selected location'}
                        </p>
                      </div>
                    )}

                   {searchTerm && (
                    <div className="grid grid-cols-1 gap-4 max-h-60 overflow-y-auto">
                      {filteredProducts.map((product) => (
                       <Card 
                         key={product.id} 
                         className="cursor-pointer hover:bg-muted/50 transition-colors"
                         onClick={() => handleProductSelect(product.id)}
                       >
                         <CardContent className="p-4">
                           <div className="flex items-start gap-3">
                             {product.image_url && (
                               <img 
                                 src={product.image_url} 
                                 alt={product.name}
                                 className="w-12 h-12 object-cover rounded border"
                               />
                             )}
                             <div className="flex-1 flex items-start justify-between">
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
                                  {product.brands && (
                                    <p className="text-xs text-muted-foreground">Brand: {product.brands.name}</p>
                                  )}
                                  {product.product_units && (
                                    <p className="text-xs text-muted-foreground">Unit: {product.product_units.name} ({product.product_units.abbreviation})</p>
                                  )}
                                  <p className="text-sm font-semibold text-green-600">
                                    {formatCurrency(product.price)}
                                  </p>
                                </div>
                                 <div className="text-right">
                                   <p className="text-xs text-muted-foreground">
                                     Stock {selectedLocation && locations.find(loc => loc.id === selectedLocation)?.name ? 
                                       `at ${locations.find(loc => loc.id === selectedLocation)?.name}` : ''}
                                   </p>
                                    <StockBadge 
                                      productId={product.id} 
                                      variantId={undefined}
                                      locationId={selectedLocation}
                                      locationName={locations.find(loc => loc.id === selectedLocation)?.name}
                                        getLocationSpecificStock={getLocationSpecificStock}
                                    />
                                 </div>
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                      ))}
                    </div>
                  )}

                  {selectedProduct && (
                    <Card className="border-primary">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <h4 className="font-medium">Add to Sale</h4>
                          {(() => {
                            const product = products.find(p => p.id === selectedProduct);
                            if (!product) return null;
                            
                            return (
                              <div className="space-y-4">
                                 <div className="flex items-center gap-2">
                                   <Package className="h-4 w-4" />
                                   <span className="font-medium">{product.name}</span>
                                    <Badge variant="secondary">{formatCurrency(product.price)}</Badge>
                                     {selectedLocation && (
                                       <StockBadge 
                                         productId={product.id}
                                         variantId={selectedVariant && selectedVariant !== "no-variant" ? selectedVariant : undefined}
                                         locationId={selectedLocation}
                                         locationName={locations.find(loc => loc.id === selectedLocation)?.name}
                                          getLocationSpecificStock={getLocationSpecificStock}
                                       />
                                      )}
                                      {!selectedLocation && (
                                        <Badge variant={
                                          (() => {
                                            const product = products.find(p => p.id === product.id);
                                            const stock = product?.stock_quantity || 0;
                                            return stock > 0 ? "outline" : "destructive";
                                          })()
                                        } className="text-xs">
                                          Stock: {(() => {
                                            const foundProduct = products.find(p => p.id === product.id);
                                            return foundProduct?.stock_quantity || 0;
                                          })()}
                                        </Badge>
                                      )}
                                 </div>

                                 {product.product_variants && product.product_variants.length > 0 && (
                                   <div>
                                     <label className="text-sm font-medium">Variant</label>
                                     <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                                       <SelectTrigger>
                                         <SelectValue placeholder="Select variant" />
                                       </SelectTrigger>
                                       <SelectContent>
                                         <SelectItem value="no-variant">No variant</SelectItem>
                                         {product.product_variants.map((variant: any) => (
                                           <SelectItem key={variant.id} value={variant.id}>
                                             {variant.name}: {variant.value} - {formatCurrency(variant.sale_price || product.price)}
                                           </SelectItem>
                                         ))}
                                       </SelectContent>
                                     </Select>
                                   </div>
                                 )}

                                 <div>
                                   <label className="text-sm font-medium">Custom Price (Optional)</label>
                                   <Input
                                     type="number"
                                     min="0"
                                     step="0.01"
                                     placeholder={(() => {
                                       const defaultPrice = getCustomerAppropriatePrice(product, selectedVariant && selectedVariant !== "no-variant" ? product.product_variants.find((v: any) => v.id === selectedVariant) : undefined);
                                       const pricingType = selectedCustomer?.is_reseller ? 'Wholesale' : 'Retail';
                                       return `${pricingType}: ${formatCurrency(defaultPrice)}`;
                                     })()}
                                     value={customPrice || ""}
                                     onChange={(e) => setCustomPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                   />
                                 </div>

                                 <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <label className="text-sm font-medium">
                                        Quantity {product.product_units ? `(${product.product_units.abbreviation})` : '(pcs)'}
                                      </label>
                                       <Input
                                         type="number"
                                         min="0"
                                         step="0.01"
                                         value={quantity}
                                         onChange={(e) => {
                                           const value = e.target.value;
                                           if (value === '') {
                                             setQuantity(0);
                                           } else {
                                             const num = parseFloat(value);
                                             setQuantity(isNaN(num) || num < 0 ? 0 : num);
                                           }
                                         }}
                                         onBlur={(e) => {
                                           if (quantity === 0) {
                                             setQuantity(1.0);
                                           }
                                         }}
                                         placeholder="Enter quantity (e.g., 1.5, 2.25)"
                                       />
                                    </div>
                                                                         <Button 
                                       onClick={async () => await addItemToSale()} 
                                       className="mt-6"
                                       disabled={
                                         !selectedProduct || 
                                         !selectedLocation || 
                                         (product.product_variants && 
                                          product.product_variants.length > 0 && 
                                          (!selectedVariant || selectedVariant === ""))
                                       }
                                     >
                                       <Plus className="h-4 w-4 mr-2" />
                                       Add
                                     </Button>
                                 </div>
                              </div>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {saleItems.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Items in {mode === "sale" ? "Sale" : "Quote"}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48">
                          <div className="space-y-2">
                            {saleItems.map((item, index) => (
                              <div key={index} className={`flex items-center justify-between p-2 bg-muted/50 rounded transition-all duration-300 ${isUpdatingPrices ? 'animate-pulse bg-blue-50' : ''}`}>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.product_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} × {formatCurrency(item.unit_price)}
                                    {isUpdatingPrices && (
                                      <span className="ml-2 text-blue-600 text-xs">Updating...</span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold transition-colors duration-300 ${isUpdatingPrices ? 'text-blue-600' : ''}`}>
                                    {formatCurrency(item.total_price)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(index)}
                                    disabled={isUpdatingPrices}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sale Summary Section - 1/2 width */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    {mode === "sale" ? "Sale" : "Quote"} Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Two column layout for form fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sale_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in_store">In Store</SelectItem>
                              <SelectItem value="online">Online</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Customer
                            {selectedCustomer?.is_reseller && (
                              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                Wholesale Pricing
                              </span>
                            )}
                            {isUpdatingPrices && (
                              <span className="text-xs text-blue-600 animate-pulse">Updating prices...</span>
                            )}
                          </FormLabel>
                          <div className="flex gap-1">
                            <Select onValueChange={(value) => {
                              field.onChange(value);
                              handleCustomerChange(value);
                            }} value={field.value} disabled={isUpdatingPrices}>
                              <FormControl>
                                <SelectTrigger className={isUpdatingPrices ? 'animate-pulse' : ''}>
                                  <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                                {customers.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                                                         <QuickCreateCustomerDialog onCustomerCreated={refreshData} />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                   {mode === "quote" && (
                     <div className="grid grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="valid_until"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Valid Until</FormLabel>
                             <Popover>
                               <PopoverTrigger asChild>
                                 <FormControl>
                                   <Button
                                     variant="outline"
                                     className={cn(
                                       "w-full pl-3 text-left font-normal",
                                       !field.value && "text-muted-foreground"
                                     )}
                                   >
                                     {field.value ? (
                                       format(field.value, "PPP")
                                     ) : (
                                       <span>Pick a date</span>
                                     )}
                                     <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                   </Button>
                                 </FormControl>
                               </PopoverTrigger>
                               <PopoverContent className="w-auto p-0" align="start">
                                 <CalendarComponent
                                   mode="single"
                                   selected={field.value}
                                   onSelect={field.onChange}
                                   disabled={(date) => date < new Date()}
                                   initialFocus
                                   className="p-3 pointer-events-auto"
                                 />
                               </PopoverContent>
                             </Popover>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     </div>
                   )}

                  <Separator />

                  {/* Subtotal */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg">
                      <span>Subtotal</span>
                      <span className="font-bold">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                     {posSettings.enableDiscounts && form.watch("discount_amount") > 0 && (
                       <div className="flex justify-between text-red-600">
                         <span>Discount</span>
                         <span className="font-semibold">-{formatCurrency(form.watch("discount_amount"))}</span>
                       </div>
                     )}
                  </div>

                   {/* Discount, Tax and Shipping - two columns before payment */}
                   <div className="grid grid-cols-2 gap-4 pt-2">
                     {posSettings.enableDiscounts && (
                       <FormField
                         control={form.control}
                         name="discount_amount"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel className="flex items-center gap-1 text-sm">
                               <Banknote className="h-3 w-3" />
                               Discount (max {posSettings.maxDiscountPercent}%)
                             </FormLabel>
                             <FormControl>
                               <Input
                                 type="number"
                                 min="0"
                                 step="0.01"
                                 {...field}
                                 onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                     )}

                     <FormField
                       control={form.control}
                       name="tax_amount"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel className="flex items-center gap-1 text-sm">
                             <Banknote className="h-3 w-3" />
                             Tax
                           </FormLabel>
                           <FormControl>
                             <Input
                               type="number"
                               min="0"
                               step="0.01"
                               {...field}
                               onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                             />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>

                   

                  {/* Tax and Shipping amounts display */}
                  {(form.watch("tax_amount") > 0 || form.watch("shipping_amount") > 0) && (
                    <div className="space-y-1">
                      {form.watch("tax_amount") > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Tax</span>
                          <span className="font-semibold">+{formatCurrency(form.watch("tax_amount"))}</span>
                        </div>
                      )}
                      {form.watch("shipping_amount") > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Shipping</span>
                          <span className="font-semibold">+{formatCurrency(form.watch("shipping_amount"))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Final Total - before payment selection */}
                  <div className="flex justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>

                                     {/* Payment Section - after total */}
                   {mode === "sale" && (
                     <div className="space-y-4">
                       <Separator />
                       <div>
                         <h4 className="font-medium mb-3 flex items-center gap-2">
                           <CreditCard className="h-4 w-4" />
                           Payment
                         </h4>
                          <EnhancedPaymentProcessor
                            totalAmount={calculateTotal()}
                            payments={enhancedPayments}
                            onPaymentsChange={handleEnhancedPaymentsChange}
                            selectedCustomer={selectedCustomer}
                            onCashPayment={handleCashPayment}
                            onMpesaPayment={handleMpesaPayment}
                            mpesaEnabled={mpesaEnabled}
                          />
                       </div>
                     </div>
                   )}

                   {/* Shipping Section */}
                   <div className="space-y-4">
                     <Separator />
                     <div>
                       <h4 className="font-medium mb-3 flex items-center gap-2">
                         <Truck className="h-4 w-4" />
                         Shipping
                       </h4>
                       <ShippingSection
                         shippingAgentId={shippingAgentId}
                         shippingFee={shippingFee}
                         shippingAddress={shippingAddress}
                         shippingIncludedInTotal={shippingIncludedInTotal}
                         onShippingChange={handleShippingChange}
                       />
                     </div>
                   </div>

                  <div className="flex gap-2 pt-4">
                    {mode === "sale" ? (
                      <Button type="submit" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? "Processing..." : "Complete Sale"}
                      </Button>
                    ) : (
                      <Button type="submit" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Quote"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to complete this sale? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={completeSale}>
              {isSubmitting ? "Processing..." : "Confirm Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CashChangeModal
        isOpen={showCashChangeModal}
        onClose={() => setShowCashChangeModal(false)}
        onConfirm={confirmCashPayment}
        amountPaid={cashAmountPaid}
        totalAmount={calculateTotal()}
      />

      <MpesaPaymentModal
        isOpen={showMpesaModal}
        onClose={() => setShowMpesaModal(false)}
        amount={calculateTotal()}
        reference={`SALE-${Date.now()}`}
        description="Sale Payment"
        onSuccess={handleMpesaSuccess}
        onError={handleMpesaError}
      />
    </div>
  );
}
