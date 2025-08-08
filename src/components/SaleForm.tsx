import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { createEnhancedSalesJournalEntry } from "@/lib/accounting-integration";
import { processSaleInventory } from "@/lib/inventory-integration";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, ShoppingCart, User, CreditCard, Banknote, Search, Package, FileText, Calendar, CheckCircle, Truck, Smartphone } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import QuickCreateCustomerDialog from './QuickCreateCustomerDialog';
import { CashChangeModal } from './CashChangeModal';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaymentProcessor } from "./PaymentProcessor";
import { MpesaPaymentModal } from "./MpesaPaymentModal";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { getInventoryLevels } from "@/lib/inventory-integration";
import { useCurrencyUpdate } from "@/hooks/useCurrencyUpdate";


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
  const { toast } = useToast();
  const { formatAmount } = useCurrencyUpdate();
  
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [actualInventory, setActualInventory] = useState<Record<string, { stock: number; variants: Record<string, number> }>>({});
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"sale" | "quote">(initialMode);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCashChangeModal, setShowCashChangeModal] = useState(false);
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [cashAmountPaid, setCashAmountPaid] = useState(0);

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sale_type: "in_store",
      discount_amount: 0,
      tax_amount: 0,
      shipping_amount: 0,
    },
  });

  const saleType = form.watch("sale_type");

  

  useEffect(() => {
    if (tenantId) {
      fetchProducts();
      fetchCustomers();
      fetchActualInventory();
      checkMpesaConfig();
      fetchBusinessSettings();
    } else {
      setProducts([]);
      setFilteredProducts([]);
      setCustomers([]);
      setActualInventory({});
      setMpesaEnabled(false);
      setBusinessSettings(null);
    }
  }, [tenantId]);

  const fetchBusinessSettings = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('tax_inclusive, default_tax_rate')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (!error && data) {
        setBusinessSettings(data);
      }
    } catch (error) {
      console.error('Error fetching business settings:', error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        if (!searchTerm.trim()) {
          setFilteredProducts(products);
          return;
        }
        
        const filtered = products.filter(product =>
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProducts(filtered);
      } catch (error) {
        console.error('Error filtering products:', error);
        setFilteredProducts([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    if (!tenantId) {
      console.warn('No tenant ID available for fetching products');
      toast({
        title: "Authentication Issue",
        description: "Please refresh the page and log in again.",
        variant: "destructive",
      });
      setProducts([]);
      setFilteredProducts([]);
      setIsLoadingProducts(false);
      return;
    }
    
    setIsLoadingProducts(true);
    
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          barcode,
          price,
          stock_quantity,
          min_stock_level,
          image_url,
           is_active,
          product_variants (
            id,
            name,
            value,
            sku,
            sale_price,
            stock_quantity
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      
      console.log(`Loaded ${products?.length || 0} products`);
      
      if (products && Array.isArray(products)) {
        setProducts(products);
        setFilteredProducts(products);
      } else {
        console.warn('No products data received');
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      let errorMessage = "Failed to fetch products. Please try again.";
      if (error?.message?.includes('JWT')) {
        errorMessage = "Session expired. Please refresh the page and try again.";
      } else if (error?.message?.includes('permission')) {
        errorMessage = "You don't have permission to view products.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    if (!tenantId) {
      console.warn('No tenant ID available for fetching customers');
      setCustomers([]);
      return;
    }
    
    try {
      // Fetch from contacts table instead of customers, filtering for customers only
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("type", "customer")
        .eq("is_active", true)
        .order("name");
      
      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }
      
      if (data && Array.isArray(data)) {
        setCustomers(data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchActualInventory = async () => {
    if (!tenantId) {
      setActualInventory({});
      return;
    }
    
    try {
      const inventoryData = await getInventoryLevels(tenantId);
      
      const inventoryLookup: Record<string, { stock: number; variants: Record<string, number> }> = {};
      
      inventoryData.forEach((product) => {
        inventoryLookup[product.id] = {
          stock: product.calculated_stock || 0,
          variants: {}
        };
        
        if (product.product_variants) {
          product.product_variants.forEach((variant: any) => {
            inventoryLookup[product.id].variants[variant.id] = variant.stock_quantity || 0;
          });
        }
      });
      
      setActualInventory(inventoryLookup);
    } catch (error) {
      console.error('Error fetching actual inventory:', error);
      toast({
        title: "Warning",
        description: "Could not fetch current stock levels. Showing database values.",
        variant: "destructive",
      });
    }
  };

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

  const getActualStock = (productId: string, variantId?: string) => {
    const productInventory = actualInventory[productId];
    if (!productInventory) {
      const product = products.find(p => p.id === productId);
      if (variantId && product?.product_variants) {
        const variant = product.product_variants.find((v: any) => v.id === variantId);
        return variant?.stock_quantity || 0;
      }
      return product?.stock_quantity || 0;
    }
    
    if (variantId) {
      return productInventory.variants[variantId] || 0;
    }
    return productInventory.stock;
  };

  const addItemToSale = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    let variant = null;
    let unitPrice = product.price;
    let productName = product.name;


    if (selectedVariant && selectedVariant !== "no-variant") {
      variant = product.product_variants.find((v: any) => v.id === selectedVariant);
      if (variant) {
        unitPrice = variant.sale_price || product.price;
        productName = `${productName} - ${variant.name}: ${variant.value}`;
      }
    }

    // Use custom price if set
    if (customPrice !== null && customPrice > 0) {
      unitPrice = customPrice;
    }

    // Check if item already exists in sale
    const existingItemIndex = saleItems.findIndex(item => 
      item.product_id === selectedProduct && 
      item.variant_id === (selectedVariant !== "no-variant" ? selectedVariant : undefined)
    );

    if (existingItemIndex !== -1) {
      // Update existing item quantity
      const updatedItems = [...saleItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].total_price = updatedItems[existingItemIndex].unit_price * updatedItems[existingItemIndex].quantity;
      setSaleItems(updatedItems);
    } else {
      // Add new item
      const totalPrice = unitPrice * quantity;
      const newItem: SaleItem = {
        product_id: selectedProduct,
        product_name: productName,
        variant_id: selectedVariant !== "no-variant" ? selectedVariant : undefined,
        variant_name: variant?.name,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      };
      setSaleItems([...saleItems, newItem]);
    }

    setSelectedProduct("");
    setSelectedVariant("");
    setSearchTerm("");
    setQuantity(1);
    setCustomPrice(null);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleProductSelect = (productId: string) => {
    try {
      setSelectedProduct(productId);
      setSelectedVariant("");
      setSearchTerm("");
      setCustomPrice(null); // Reset custom price when selecting a new product
    } catch (error) {
      console.error('Error selecting product:', error);
      toast({
        title: "Error",
        description: "Failed to select product",
        variant: "destructive",
      });
    }
  };

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
    return `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  };

  const generateQuoteNumber = () => {
    return `QUO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  };

  const handlePaymentsChange = (newPayments: any[], newRemainingBalance: number) => {
    setPayments(newPayments);
    setRemainingBalance(newRemainingBalance);
  };

  const handleCashPayment = (paymentAmount: number, totalAmount: number) => {
    if (paymentAmount > totalAmount) {
      setCashAmountPaid(paymentAmount);
      setShowCashChangeModal(true);
      return false; // Don't add payment yet
    }
    return true; // Proceed with normal payment
  };

  const confirmCashPayment = () => {
    const totalAmount = calculateTotal();
    const changeAmount = cashAmountPaid - totalAmount;
    
    // Add the cash payment for the exact total amount (not overpayment)
    const cashPayment = {
      id: Date.now().toString(),
      method: 'cash',
      amount: totalAmount, // Only record the exact amount needed
      reference: `Cash received: ${formatAmount(cashAmountPaid)} - Change: ${formatAmount(changeAmount)}`
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

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      const quoteNumber = generateQuoteNumber();
      const totalAmount = calculateTotal();

      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          customer_id: values.customer_id === "walk-in" ? null : values.customer_id,
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
      }));

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(quoteItemsData);

      if (itemsError) throw itemsError;

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

    const hasCreditPayment = payments.some(p => p.method === 'credit');
    
    if (hasCreditPayment && (!values.customer_id || values.customer_id === "walk-in")) {
      toast({
        title: "Customer Required",
        description: "Please select a customer for credit sales",
        variant: "destructive",
      });
      return;
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
    const values = form.getValues();
    const hasCreditPayment = payments.some(p => p.method === 'credit');

    setIsSubmitting(true);
    setShowConfirmation(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      const receiptNumber = generateReceiptNumber();
      const totalAmount = calculateTotal();
      
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          receipt_number: receiptNumber,
          customer_id: values.customer_id === "walk-in" ? null : values.customer_id,
          cashier_id: user.id,
          tenant_id: tenantData,
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

      // Add sale items
      const saleItemsData = saleItems.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        variant_id: item.variant_id && item.variant_id !== "no-variant" && item.variant_id !== "" ? item.variant_id : null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

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
          tenant_id: tenantData,
        }));

        const { error: paymentError } = await supabase
          .from("payments")
          .insert(paymentData);

        if (paymentError) throw paymentError;

        // Update cash drawer for cash payments
        const cashPayments = payments.filter(p => p.method === 'cash');
        for (const cashPayment of cashPayments) {
          try {
            // Get current user's active cash drawer
            const { data: drawer } = await supabase
              .from("cash_drawers")
              .select("*")
              .eq("tenant_id", tenantData)
              .eq("user_id", user.id)
              .eq("status", "open")
              .eq("is_active", true)
              .maybeSingle();

            if (drawer) {
              // Update drawer balance
              await supabase
                .from("cash_drawers")
                .update({ 
                  current_balance: drawer.current_balance + cashPayment.amount 
                })
                .eq("id", drawer.id);

              // Record cash transaction
              await supabase
                .from("cash_transactions")
                .insert({
                  tenant_id: tenantData,
                  cash_drawer_id: drawer.id,
                  transaction_type: "sale_payment",
                  amount: cashPayment.amount,
                  balance_after: drawer.current_balance + cashPayment.amount,
                  description: `Sale payment - Receipt: ${receiptNumber}`,
                  reference_id: sale.id,
                  reference_type: "sale",
                  performed_by: user.id,
                });
            }
          } catch (drawerError) {
            console.error('Error updating cash drawer:', drawerError);
            // Don't fail the sale if cash drawer update fails
          }
        }
      }

      // Process inventory adjustments
      const inventoryItems = saleItems.map(item => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
        unitCost: item.unit_price
      }));
      await processSaleInventory(sale.id, tenantData, inventoryItems);

      // Create accounting entries
      await createEnhancedSalesJournalEntry(tenantData, {
        saleId: sale.id,
        cashierId: user.id,
        customerId: values.customer_id === "walk-in" ? null : values.customer_id,
        totalAmount,
        discountAmount: values.discount_amount,
        taxAmount: values.tax_amount,
        shippingAmount: values.shipping_amount,
        payments: hasCreditPayment ? [] : payments,
      });

      toast({
        title: "Sale Completed",
        description: `Sale #${receiptNumber} completed successfully`,
      });

      form.reset();
      setSaleItems([]);
      setPayments([]);
      setSearchTerm("");
      setSelectedProduct("");
      setSelectedVariant("");
      onSaleCompleted?.();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete sale",
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
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, SKU, or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

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
                                 <p className="text-sm font-semibold text-green-600">
                                   {formatAmount(product.price)}
                                 </p>
                               </div>
                               <div className="text-right">
                                 <p className="text-xs text-muted-foreground">Stock</p>
                                 <Badge variant={getActualStock(product.id) > 0 ? "default" : "destructive"}>
                                   {getActualStock(product.id)}
                                 </Badge>
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
                                  <Badge variant="secondary">{formatAmount(product.price)}</Badge>
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
                                             {variant.name}: {variant.value} - {formatAmount(variant.sale_price || product.price)}
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
                                       let defaultPrice = product.price;
                                       if (selectedVariant && selectedVariant !== "no-variant") {
                                         const variant = product.product_variants.find((v: any) => v.id === selectedVariant);
                                         if (variant) {
                                           defaultPrice = variant.sale_price || product.price;
                                         }
                                       }
                                       return `Default: ${formatAmount(defaultPrice)}`;
                                     })()}
                                     value={customPrice || ""}
                                     onChange={(e) => setCustomPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                   />
                                 </div>

                                 <div className="flex items-center gap-4">
                                   <div className="flex-1">
                                     <label className="text-sm font-medium">Quantity</label>
                                     <Input
                                       type="number"
                                       min="1"
                                       value={quantity}
                                       onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                     />
                                   </div>
                                   <Button onClick={addItemToSale} className="mt-6">
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
                              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.product_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} × {formatAmount(item.unit_price)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{formatAmount(item.total_price)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(index)}
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
                          <FormLabel>Customer</FormLabel>
                          <div className="flex gap-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
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
                            <QuickCreateCustomerDialog onCustomerCreated={fetchCustomers} />
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
                      <span className="font-bold">{formatAmount(calculateSubtotal())}</span>
                    </div>
                    {form.watch("discount_amount") > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount</span>
                        <span className="font-semibold">-{formatAmount(form.watch("discount_amount"))}</span>
                      </div>
                    )}
                  </div>

                   {/* Discount, Tax and Shipping - two columns before payment */}
                   <div className="grid grid-cols-2 gap-4 pt-2">
                     <FormField
                       control={form.control}
                       name="discount_amount"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel className="flex items-center gap-1 text-sm">
                             <Banknote className="h-3 w-3" />
                             Discount
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

                   <div className="grid grid-cols-2 gap-4">
                     <FormField
                       control={form.control}
                       name="shipping_amount"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel className="flex items-center gap-1 text-sm">
                             <Truck className="h-3 w-3" />
                             Shipping
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
                          <span className="font-semibold">+{formatAmount(form.watch("tax_amount"))}</span>
                        </div>
                      )}
                      {form.watch("shipping_amount") > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Shipping</span>
                          <span className="font-semibold">+{formatAmount(form.watch("shipping_amount"))}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Final Total - before payment selection */}
                  <div className="flex justify-between text-2xl font-bold">
                    <span>Total</span>
                    <span>{formatAmount(calculateTotal())}</span>
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
                         <PaymentProcessor
                           totalAmount={calculateTotal()}
                           onPaymentsChange={handlePaymentsChange}
                           onCashPayment={handleCashPayment}
                         />
                         
                         {mpesaEnabled && (
                           <div className="mt-4">
                             <Separator />
                             <div className="pt-4">
                               <Button
                                 type="button"
                                 onClick={handleMpesaPayment}
                                 className="w-full bg-green-600 hover:bg-green-700 text-white"
                                 disabled={calculateTotal() <= 0}
                               >
                                 <Smartphone className="h-4 w-4 mr-2" />
                                 Pay with M-Pesa
                               </Button>
                             </div>
                           </div>
                         )}
                      </div>
                    </div>
                  )}

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
        formatAmount={formatAmount}
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