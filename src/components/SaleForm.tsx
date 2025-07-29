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
import { Trash2, Plus, ShoppingCart, User, CreditCard, Banknote, Search, Package, FileText, Calendar, CheckCircle, Truck } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import QuickCreateCustomerDialog from './QuickCreateCustomerDialog';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaymentProcessor } from "./PaymentProcessor";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { getInventoryLevels } from "@/lib/inventory-integration";
import { useCurrencySettings } from "@/lib/currency";

const saleSchema = z.object({
  customer_id: z.string().optional(),
  sale_type: z.enum(["in_store", "online"]),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  shipping_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
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
}

export function SaleForm({ onSaleCompleted }: SaleFormProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { formatAmount } = useCurrencySettings();
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [actualInventory, setActualInventory] = useState<Record<string, { stock: number; variants: Record<string, number> }>>({});
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"sale" | "quote">("sale");
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    } else {
      setProducts([]);
      setFilteredProducts([]);
      setCustomers([]);
      setActualInventory({});
    }
  }, [tenantId]);

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
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId);
      
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
        productName = `${product.name} - ${variant.name}: ${variant.value}`;
      }
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
    const discount = form.getValues("discount_amount");
    const tax = form.getValues("tax_amount");
    const shipping = form.getValues("shipping_amount");
    return subtotal - discount + tax + shipping;
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
          notes: values.notes,
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
          cashier_id: user.id,
          customer_id: values.customer_id === "walk-in" ? null : values.customer_id,
          payment_method: hasCreditPayment ? "credit" : (payments.length > 1 ? "multiple" : payments[0]?.method || "cash"),
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          discount_amount: values.discount_amount,
          tax_amount: values.tax_amount,
          shipping_amount: values.shipping_amount,
          status: "completed",
          tenant_id: tenantData,
        })
        .select()
        .single();

      if (saleError) throw saleError;

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

      const paymentData = payments.map(payment => ({
        sale_id: sale.id,
        payment_method: payment.method,
        amount: payment.amount,
        reference_number: payment.reference || null,
        tenant_id: tenantData,
      }));

      if (paymentData.length > 0) {
        const { error: paymentsError } = await supabase
          .from("payments")
          .insert(paymentData);

        if (paymentsError) throw paymentsError;
      }

      const inventoryItems = saleItems.map(item => ({
        productId: item.product_id,
        variantId: item.variant_id && item.variant_id !== "no-variant" && item.variant_id !== "" ? item.variant_id : undefined,
        quantity: item.quantity
      }));

      if (inventoryItems.length > 0) {
        try {
          await processSaleInventory(tenantData, sale.id, inventoryItems);
        } catch (inventoryError) {
          console.error('Inventory update error:', inventoryError);
          toast({
            title: "Warning",
            description: "Sale completed but inventory update failed",
            variant: "destructive",
          });
        }
      }

      const itemsWithCost = saleItems.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          productId: item.product_id,
          quantity: item.quantity,
          unitCost: product?.cost || 0
        };
      });

      try {
        await createEnhancedSalesJournalEntry(tenantData, {
          saleId: sale.id,
          customerId: values.customer_id && values.customer_id !== "walk-in" ? values.customer_id : undefined,
          totalAmount: totalAmount,
          discountAmount: values.discount_amount,
          taxAmount: values.tax_amount,
          shippingAmount: values.shipping_amount,
          payments: payments,
          cashierId: user.id,
          items: itemsWithCost
        });
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        toast({
          title: "Warning",
          description: "Sale completed but accounting entry failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Sale Completed",
        description: `Receipt #${receiptNumber} - Total: ${formatAmount(totalAmount)}`,
      });

      form.reset();
      setSaleItems([]);
      setPayments([]);
      setRemainingBalance(0);
      setSearchTerm("");
      setSelectedProduct("");
      setSelectedVariant("");
      setMode("sale");
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

  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      {/* Mode Selection - Full Width */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "sale" ? "default" : "outline"}
              onClick={() => setMode("sale")}
              className="flex-1"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Sale
            </Button>
            <Button
              type="button"
              variant={mode === "quote" ? "default" : "outline"}
              onClick={() => setMode("quote")}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Quote
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Product Selection (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Products */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name, SKU, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Product Addition Form */}
              {selectedProduct && (
                <Card className="border-dashed border-primary bg-primary/5">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Add to Sale</h4>
                    <div className="space-y-3">
                      {(() => {
                        const product = products.find(p => p.id === selectedProduct);
                        return (
                          <>
                            <p className="text-sm text-muted-foreground">{product?.name}</p>
                            
                            {/* Variant Selection */}
                            {product?.product_variants && product.product_variants.length > 0 && (
                              <div>
                                <label className="text-sm font-medium">Variant</label>
                                <Select 
                                  value={selectedVariant} 
                                  onValueChange={setSelectedVariant}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select variant" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="no-variant">No Variant</SelectItem>
                                    {product.product_variants.map((variant: any) => {
                                      const variantStock = getActualStock(product.id, variant.id);
                                      return (
                                        <SelectItem 
                                          key={variant.id} 
                                          value={variant.id}
                                          disabled={variantStock <= 0}
                                        >
                                          {variant.name}: {variant.value} - {formatAmount(variant.sale_price || product.price)} (Stock: {variantStock})
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Quantity */}
                            <div>
                              <label className="text-sm font-medium">Quantity</label>
                              <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                              />
                            </div>

                            <Button 
                              type="button" 
                              onClick={addItemToSale}
                              className="w-full"
                              disabled={!selectedProduct || quantity <= 0}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Item
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Product Grid */}
              <ScrollArea className="h-80">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {isLoadingProducts ? (
                    <div className="col-span-full text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      const actualStock = getActualStock(product.id);
                      const isLowStock = actualStock <= (product.min_stock_level || 0);
                      const isOutOfStock = actualStock <= 0;

                      return (
                        <Card 
                          key={product.id} 
                          className={cn(
                            "cursor-pointer transition-colors border hover:border-primary",
                            selectedProduct === product.id && "border-primary bg-muted/50"
                          )}
                          onClick={() => handleProductSelect(product.id)}
                        >
                          <CardContent className="p-3">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-20 object-cover rounded mb-2"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-20 bg-muted rounded flex items-center justify-center mb-2">
                                <Package className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <h4 className="font-medium text-sm truncate">{product.name}</h4>
                            <p className="text-xs text-muted-foreground mb-1">SKU: {product.sku}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-primary">{formatAmount(product.price)}</span>
                              <Badge 
                                variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}
                                className="text-xs"
                              >
                                {actualStock}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      {searchTerm ? "No products found matching your search" : "No products available"}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right side - Sale Summary (1/3 width) */}
        <div className="lg:col-span-1">
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sale Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(validateAndPrepareSubmit)} className="space-y-4">
                  {/* Sale Type and Customer */}
                  <FormField
                    control={form.control}
                    name="sale_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
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
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl className="flex-1">
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

                  {/* Items List */}
                  {saleItems.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Items ({saleItems.length})</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {saleItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded text-xs">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.product_name}</p>
                              <p className="text-muted-foreground">
                                {item.quantity} × {formatAmount(item.unit_price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-lg">{formatAmount(item.total_price)}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shipping Charges */}
                  <FormField
                    control={form.control}
                    name="shipping_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Shipping Charges
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quote Valid Until Date */}
                  {mode === "quote" && (
                    <FormField
                      control={form.control}
                      name="valid_until"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Valid Until</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
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
                                disabled={(date) =>
                                  date < new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Discount and Tax */}
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="discount_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
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
                          <FormLabel>Tax</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Optional notes..."
                            {...field}
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Totals */}
                  <Card className="bg-muted/20">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatAmount(calculateSubtotal())}</span>
                      </div>
                      {form.watch("discount_amount") > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Discount:</span>
                          <span className="font-medium">-{formatAmount(form.watch("discount_amount"))}</span>
                        </div>
                      )}
                      {form.watch("tax_amount") > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Tax:</span>
                          <span className="font-medium">{formatAmount(form.watch("tax_amount"))}</span>
                        </div>
                      )}
                      {form.watch("shipping_amount") > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Shipping:</span>
                          <span className="font-medium">{formatAmount(form.watch("shipping_amount"))}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-3xl">{formatAmount(calculateTotal())}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Methods - Only for Sales */}
                  {mode === "sale" && saleItems.length > 0 && (
                    <PaymentProcessor
                      totalAmount={calculateTotal()}
                      onPaymentsChange={handlePaymentsChange}
                    />
                  )}

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold" 
                    disabled={isSubmitting || saleItems.length === 0}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </div>
                    ) : mode === "quote" ? (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Create Quote
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
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
              Complete Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}