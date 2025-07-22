import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { createSalesJournalEntry } from "@/lib/accounting-integration";
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
import { Trash2, Plus, ShoppingCart, User, CreditCard, Banknote, Search, Package, FileText, Calendar } from "lucide-react";
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

const saleSchema = z.object({
  customer_id: z.string().optional(),
  sale_type: z.enum(["in_store", "online"]),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
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
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
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

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sale_type: "in_store",
      discount_amount: 0,
      tax_amount: 0,
    },
  });

  const saleType = form.watch("sale_type");

  useEffect(() => {
    if (tenantId) {
      fetchProducts();
      fetchCustomers();
    }
  }, [tenantId]);

  useEffect(() => {
    // Filter products based on search term
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    if (!tenantId) return;
    
    setIsLoadingProducts(true);
    console.log('Fetching products for tenant:', tenantId);
    
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_variants (*)
        `)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      
      if (error) {
        console.error('Error fetching products:', error);
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
        return;
      }
      
      console.log(`Loaded ${data?.length || 0} products with stock:`, data?.map(p => ({ name: p.name, stock: p.stock_quantity })));
      
      if (data) {
        setProducts(data);
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("tenant_id", tenantId);
      
      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }
      
      if (data) setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
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
        unitPrice = product.price + (variant.price_adjustment || 0);
        productName = `${product.name} - ${variant.name}: ${variant.value}`;
      }
    }

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
    setSelectedProduct("");
    setSelectedVariant("");
    setSearchTerm("");
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    setSelectedVariant("");
    setSearchTerm("");
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = form.getValues("discount_amount");
    const tax = form.getValues("tax_amount");
    return subtotal - discount + tax;
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

      // Create the quote
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
          status: "draft",
          valid_until: values.valid_until?.toISOString(),
          notes: values.notes,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
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

      // Reset form
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

  const onSubmit = async (values: z.infer<typeof saleSchema>) => {
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

    // Check if this is a credit sale (has credit payment method)
    const hasCreditPayment = payments.some(p => p.method === 'credit');
    
    // For credit sales, require a customer to be selected
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

    setIsSubmitting(true);

    try {
      // Get current user profile to get cashier_id and tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get user's tenant ID
      const { data: tenantData } = await supabase.rpc('get_user_tenant_id');
      if (!tenantData) throw new Error("User not assigned to a tenant");

      const receiptNumber = generateReceiptNumber();
      const totalAmount = calculateTotal();

      // Create the sale
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
          status: "completed",
          tenant_id: tenantData,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
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

      // Create payment records
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

      // Process inventory updates using the integration
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

      // Prepare COGS data for accounting
      const itemsWithCost = saleItems.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          productId: item.product_id,
          quantity: item.quantity,
          unitCost: product?.cost || 0
        };
      });

      // Create accounting journal entry
      try {
        await createSalesJournalEntry(tenantData, {
          saleId: sale.id,
          customerId: values.customer_id && values.customer_id !== "walk-in" ? values.customer_id : undefined,
          totalAmount: totalAmount,
          discountAmount: values.discount_amount,
          taxAmount: values.tax_amount,
          payments: payments, // Pass the payments array instead of single payment method
          cashierId: user.id,
          items: itemsWithCost
        });
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        // Don't fail the sale if accounting fails
        toast({
          title: "Warning",
          description: "Sale completed but accounting entry failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Sale Completed",
        description: `Receipt #${receiptNumber} - Total: $${totalAmount.toFixed(2)}`,
      });

      // Reset form
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
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Add Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, SKU, or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Product Grid */}
          {searchTerm && (
            <div className="border rounded-lg">
              <ScrollArea className="h-64">
                <div className="p-2 space-y-2">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
                          selectedProduct === product.id ? 'bg-accent border-primary' : ''
                        }`}
                        onClick={() => handleProductSelect(product.id)}
                      >
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>${product.price}</span>
                            {product.sku && <span>SKU: {product.sku}</span>}
                            <Badge variant="outline" className="text-xs">
                              Stock: {product.stock_quantity || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No products found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Selected Product Details */}
          {selectedProduct && (
            <div className="border rounded-lg p-4 bg-accent/20">
              <h4 className="font-medium mb-2">Selected Product</h4>
              {(() => {
                const product = products.find(p => p.id === selectedProduct);
                return product ? (
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">${product.price}</p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {selectedProductData?.product_variants?.length > 0 && (
            <div>
              <label className="text-sm font-medium">Variant</label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-variant">No variant</SelectItem>
                  {selectedProductData.product_variants.map((variant: any) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.name}: {variant.value} 
                      {variant.price_adjustment !== 0 && (
                        <span className="text-muted-foreground">
                          {variant.price_adjustment > 0 ? '+' : ''}${variant.price_adjustment}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            onClick={addItemToSale} 
            disabled={!selectedProduct}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Sale
          </Button>
        </CardContent>
      </Card>

      {/* Sale Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sale Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <FormLabel>
                      <User className="h-4 w-4 mr-1 inline" />
                      Customer {saleType === "online" && "*"}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer (optional)" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quote Fields */}
              {mode === "quote" && (
                <>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add notes for this quote..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
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
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sale Items */}
              <div className="space-y-2">
                <h4 className="font-medium">Items ({saleItems.length})</h4>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {saleItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden">
                            {(() => {
                              const product = products.find(p => p.id === item.product_id);
                              return product?.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground" />
                              );
                            })()}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × ${item.unit_price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${item.total_price.toFixed(2)}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Discount:</span>
                  <span>-${form.watch("discount_amount").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax:</span>
                  <span>+${form.watch("tax_amount").toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Processing - Only for sales */}
              {mode === "sale" && saleItems.length > 0 && (
                <PaymentProcessor 
                  totalAmount={calculateTotal()}
                  onPaymentsChange={handlePaymentsChange}
                  isProcessing={isSubmitting}
                />
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setMode(mode === "sale" ? "quote" : "sale")}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {mode === "sale" ? "Switch to Quote" : "Switch to Sale"}
                </Button>
                
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={saleItems.length === 0 || isSubmitting || (mode === "sale" && remainingBalance > 0 && !payments.some(p => p.method === 'credit'))}
                >
                  {isSubmitting ? "Processing..." : mode === "sale" ? "Complete Sale" : "Save Quote"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}