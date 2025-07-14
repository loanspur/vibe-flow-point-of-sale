import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, ShoppingCart, User, CreditCard, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const saleSchema = z.object({
  customer_id: z.string().optional(),
  payment_method: z.enum(["cash", "card", "digital", "bank_transfer"]),
  sale_type: z.enum(["in_store", "online"]),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
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
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      payment_method: "cash",
      sale_type: "in_store",
      discount_amount: 0,
      tax_amount: 0,
    },
  });

  const saleType = form.watch("sale_type");

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select(`
        *,
        product_variants (*)
      `)
      .eq("is_active", true);
    
    if (data) setProducts(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("*");
    
    if (data) setCustomers(data);
  };

  const addItemToSale = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    let variant = null;
    let unitPrice = product.price;
    let productName = product.name;

    if (selectedVariant) {
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
      variant_id: selectedVariant || undefined,
      variant_name: variant?.name,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedProduct("");
    setSelectedVariant("");
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total_price, 0);
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

  const onSubmit = async (values: z.infer<typeof saleSchema>) => {
    if (saleItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the sale",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user profile to get cashier_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const receiptNumber = generateReceiptNumber();
      const totalAmount = calculateTotal();

      // Create the sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          cashier_id: user.id,
          customer_id: values.customer_id || null,
          payment_method: values.payment_method,
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          discount_amount: values.discount_amount,
          tax_amount: values.tax_amount,
          status: "completed",
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItemsData = saleItems.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItemsData);

      if (itemsError) throw itemsError;

      // Update product stock quantities
      for (const item of saleItems) {
        if (item.variant_id) {
          // Get current variant stock and update
          const { data: variant, error: fetchError } = await supabase
            .from('product_variants')
            .select('stock_quantity')
            .eq('id', item.variant_id)
            .single();
          
          if (fetchError) throw fetchError;
          
          const newStock = (variant.stock_quantity || 0) - item.quantity;
          const { error: variantError } = await supabase
            .from('product_variants')
            .update({ stock_quantity: Math.max(0, newStock) })
            .eq('id', item.variant_id);
          
          if (variantError) throw variantError;
        } else {
          // Get current product stock and update
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();
          
          if (fetchError) throw fetchError;
          
          const newStock = (product.stock_quantity || 0) - item.quantity;
          const { error: productError } = await supabase
            .from('products')
            .update({ stock_quantity: Math.max(0, newStock) })
            .eq('id', item.product_id);
          
          if (productError) throw productError;
        }
      }

      toast({
        title: "Sale Completed",
        description: `Receipt #${receiptNumber} - Total: $${totalAmount.toFixed(2)}`,
      });

      // Reset form
      form.reset();
      setSaleItems([]);
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
          <div>
            <label className="text-sm font-medium">Product</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} - ${product.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProductData?.product_variants?.length > 0 && (
            <div>
              <label className="text-sm font-medium">Variant</label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No variant</SelectItem>
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
                        <SelectItem value="">Walk-in Customer</SelectItem>
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

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <CreditCard className="h-4 w-4 mr-1 inline" />
                      Payment Method
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">
                          <Banknote className="h-4 w-4 mr-2 inline" />
                          Cash
                        </SelectItem>
                        <SelectItem value="card">
                          <CreditCard className="h-4 w-4 mr-2 inline" />
                          Card
                        </SelectItem>
                        <SelectItem value="digital">Digital Wallet</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                {saleItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
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

              <Button 
                type="submit" 
                className="w-full" 
                disabled={saleItems.length === 0 || isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Complete Sale"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}