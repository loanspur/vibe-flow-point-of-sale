import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Truck, Plus, CheckCircle, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PaymentForm } from './PaymentForm';
import { createEnhancedPurchaseJournalEntry } from '@/lib/accounting-integration';

interface PurchaseFormProps {
  onPurchaseCompleted?: () => void;
}

interface PurchaseItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export function PurchaseForm({ onPurchaseCompleted }: PurchaseFormProps) {
  const { tenantId } = useAuth();
  const { formatLocalCurrency } = useApp();
  const { toast } = useToast();
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [remainingBalance, setRemainingBalance] = useState(0);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchSuppliers();
      fetchProducts();
    }
  }, [tenantId]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'supplier')
        .eq('is_active', true);
      
      if (error) throw error;
      console.log('🔍 Raw suppliers data:', data);
      
      // Filter out any invalid suppliers before setting state
      const validSuppliers = (data || []).filter(supplier => {
        const isValid = supplier && 
          supplier.id && 
          typeof supplier.id === 'string' && 
          supplier.id.trim() !== '' &&
          supplier.name;
        
        if (!isValid) {
          console.warn('❌ Invalid supplier filtered out:', supplier);
        }
        return isValid;
      });
      
      console.log('✅ Valid suppliers after filtering:', validSuppliers);
      setSuppliers(validSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('🔍 Fetching products for tenant:', tenantId);
      
      if (!tenantId) {
        console.warn('❌ No tenant ID available for products fetch');
        setProducts([]);
        return;
      }

      // Use explicit tenant_id filter instead of relying on RLS context
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, cost_price')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        console.error('❌ Database error fetching products:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('🔍 Raw products data:', data);
      console.log('🔢 Products count:', data?.length || 0);
      
      // Filter out any invalid products before setting state
      const validProducts = (data || []).filter(product => {
        const isValid = product && 
          product.id && 
          typeof product.id === 'string' && 
          product.id.trim() !== '' &&
          product.name && 
          product.name.trim() !== '';
        
        if (!isValid) {
          console.warn('❌ Invalid product filtered out:', product);
        }
        return isValid;
      });
      
      console.log('✅ Valid products after filtering:', validProducts);
      console.log('🔢 Number of valid products:', validProducts.length);
      
      if (validProducts.length === 0) {
        console.warn('⚠️ No valid products found for tenant', tenantId);
      }
      
      setProducts(validProducts);
    } catch (error) {
      console.error('💥 Error fetching products:', error);
      setProducts([]); // Set empty array on error
      toast({
        title: "Error Loading Products",
        description: "Failed to load products. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  };

  const addItemToPurchase = () => {
    try {
      console.log("🛒 Adding item to purchase:", { 
        selectedProduct, 
        quantity, 
        unitCost, 
        productsLength: products.length,
        selectedProductType: typeof selectedProduct,
        quantityType: typeof quantity,
        unitCostType: typeof unitCost
      });
      
      // Validate selectedProduct
      if (!selectedProduct || selectedProduct.trim() === '') {
        console.warn("❌ No product selected!");
        toast({
          title: "Error",
          description: "Please select a product.",
          variant: "destructive",
        });
        return;
      }
      
      const product = products.find(p => p.id === selectedProduct);
      console.log("🔍 Found product:", product);
      
      if (!product) {
        console.warn("❌ Product not found for ID:", selectedProduct);
        toast({
          title: "Error", 
          description: "Product not found. Please try selecting again.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate quantity
      const validQuantity = Number(quantity);
      if (isNaN(validQuantity) || validQuantity <= 0) {
        console.warn("❌ Invalid quantity:", quantity, "converted:", validQuantity);
        toast({
          title: "Error",
          description: "Please enter a valid quantity greater than 0.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate unit cost
      const validUnitCost = Number(unitCost);
      if (isNaN(validUnitCost) || validUnitCost <= 0) {
        console.warn("❌ Invalid unit cost:", unitCost, "converted:", validUnitCost);
        toast({
          title: "Error",
          description: "Please enter a valid unit cost greater than 0.",
          variant: "destructive",
        });
        return;
      }

      const newItem: PurchaseItem = {
        product_id: selectedProduct,
        product_name: product.name,
        quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
      };

      console.log("✅ New item created:", newItem);
      
      setPurchaseItems(prevItems => {
        const updatedItems = [...prevItems, newItem];
        console.log("📦 Updated purchase items:", updatedItems);
        return updatedItems;
      });
      
      // Reset form fields
      setSelectedProduct('');
      setQuantity(1);
      setUnitCost(0);
      
      toast({
        title: "Item Added",
        description: `${product.name} added to purchase`,
      });
      
      console.log("🎉 Item successfully added to purchase");
      
    } catch (error) {
      console.error("💥 Error in addItemToPurchase:", error);
      toast({
        title: "Error",
        description: "Failed to add item to purchase. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + shippingAmount;
  };

  const handlePaymentsChange = (newPayments: any[], newRemainingBalance: number) => {
    setPayments(newPayments);
    setRemainingBalance(newRemainingBalance);
  };

  const completePurchase = async () => {
    if (purchaseItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the purchase",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSupplier) {
      toast({
        title: "Error",
        description: "Please select a supplier",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const totalAmount = calculateTotal();
      const purchaseNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          purchase_number: purchaseNumber,
          supplier_id: selectedSupplier,
          total_amount: totalAmount,
          shipping_amount: shippingAmount,
          status: 'completed',
          order_date: new Date().toISOString().split('T')[0],
          received_date: new Date().toISOString().split('T')[0],
          notes,
          created_by: user.id,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create purchase items
      const purchaseItemsData = purchaseItems.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity_ordered: item.quantity,
        quantity_received: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(purchaseItemsData);

      if (itemsError) throw itemsError;

      // Create purchase payments if any (using ar_ap_payments table)
      if (payments.length > 0) {
        const paymentData = payments.map(payment => ({
          tenant_id: tenantId,
          reference_id: purchase.id,
          payment_type: 'payable' as const,
          payment_method: payment.method,
          amount: payment.amount,
          reference_number: payment.reference || null,
          payment_date: new Date().toISOString().split('T')[0],
        }));

        const { error: paymentsError } = await supabase
          .from('ar_ap_payments')
          .insert(paymentData);

        if (paymentsError) {
          console.error('Purchase payments error:', paymentsError);
          // Continue with purchase completion even if payments fail
        }

        // Update cash drawer for cash payments
        const cashPayments = payments.filter(p => p.method === 'cash');
        for (const cashPayment of cashPayments) {
          try {
            // Get current user's active cash drawer
            const { data: drawer } = await supabase
              .from("cash_drawers")
              .select("*")
              .eq("tenant_id", tenantId)
              .eq("user_id", user.id)
              .eq("status", "open")
              .eq("is_active", true)
              .maybeSingle();

            if (drawer) {
              // Update drawer balance (subtract for purchase payment)
              await supabase
                .from("cash_drawers")
                .update({ 
                  current_balance: drawer.current_balance - cashPayment.amount 
                })
                .eq("id", drawer.id);

              // Record cash transaction
              await supabase
                .from("cash_transactions")
                .insert({
                  tenant_id: tenantId,
                  cash_drawer_id: drawer.id,
                  transaction_type: "purchase_payment",
                  amount: -cashPayment.amount, // Negative for outgoing cash
                  balance_after: drawer.current_balance - cashPayment.amount,
                  description: `Purchase payment - PO: ${purchaseNumber}`,
                  reference_id: purchase.id,
                  reference_type: "purchase",
                  performed_by: user.id,
                });
            }
          } catch (drawerError) {
            console.error('Error updating cash drawer:', drawerError);
            // Don't fail the purchase if cash drawer update fails
          }
        }
      }

      // Update product stock levels
      for (const item of purchaseItems) {
        // Get current stock first
        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .eq('tenant_id', tenantId)
          .single();

        if (!fetchError && currentProduct) {
          const newStock = (currentProduct.stock_quantity || 0) + item.quantity;
          
          await supabase
            .from('products')
            .update({
              stock_quantity: newStock,
              cost_price: item.unit_cost, // Update product cost
            })
            .eq('id', item.product_id)
            .eq('tenant_id', tenantId);
        }
      }

      // Create accounting entries
      const itemsWithCost = purchaseItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitCost: item.unit_cost,
      }));

      try {
        await createEnhancedPurchaseJournalEntry(tenantId, {
          purchaseId: purchase.id,
          supplierId: selectedSupplier,
          totalAmount: totalAmount,
          shippingAmount: shippingAmount,
          isReceived: true,
          payments: payments,
          createdBy: user.id,
          items: itemsWithCost,
        });
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        toast({
          title: "Warning",
          description: "Purchase completed but accounting entry failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Purchase Completed",
        description: `Purchase Order #${purchaseNumber} - Total: ${formatLocalCurrency(totalAmount)}`,
      });

      // Reset form
      setPurchaseItems([]);
      setPayments([]);
      setRemainingBalance(0);
      setSelectedSupplier('');
      setSelectedProduct('');
      setQuantity(1);
      setUnitCost(0);
      setShippingAmount(0);
      setNotes('');
      onPurchaseCompleted?.();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete purchase",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Product Selection (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Add Items to Purchase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Addition Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="space-y-2">
                   <Label>Product</Label>
                   <Select value={selectedProduct} onValueChange={(value) => {
                     setSelectedProduct(value);
                      // Auto-populate unit cost when product is selected
                      const product = products.find(p => p.id === value);
                      if (product && product.cost_price > 0) {
                        setUnitCost(product.cost_price);
                      }
                   }}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select product" />
                     </SelectTrigger>
                      <SelectContent>
                        {products.length > 0 ? (
                          products.map((product) => {
                            console.log('🎯 Rendering product SelectItem:', { id: product.id, name: product.name });
                            return (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {product.sku || 'No SKU'}
                              </SelectItem>
                            );
                           })
                         ) : (
                           <SelectItem key="no-products" value="disabled-no-products" disabled>
                             No products available
                           </SelectItem>
                         )}
                      </SelectContent>
                   </Select>
                 </div>

                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    onClick={addItemToPurchase}
                    disabled={!selectedProduct || quantity <= 0 || unitCost <= 0}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Items List */}
              {purchaseItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Purchase Items ({purchaseItems.length})</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {purchaseItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × {formatLocalCurrency(item.unit_cost)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{formatLocalCurrency(item.total_cost)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="h-8 w-8 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side - Purchase Summary (1/3 width) */}
        <div className="lg:col-span-1">
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length > 0 ? (
                      suppliers.map((supplier) => {
                        console.log('🎯 Rendering supplier SelectItem:', { id: supplier.id, name: supplier.name });
                        return (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                          </SelectItem>
                        );
                       })
                     ) : (
                       <SelectItem key="no-suppliers" value="disabled-no-suppliers" disabled>
                         No suppliers available
                       </SelectItem>
                     )}
                  </SelectContent>
                </Select>
              </div>

              {/* Shipping Charges */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Shipping Charges
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={shippingAmount || ''}
                  onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Totals */}
              <Card className="bg-muted/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatLocalCurrency(calculateSubtotal())}</span>
                  </div>
                  {shippingAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span className="font-medium">{formatLocalCurrency(shippingAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-3xl">{formatLocalCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              {purchaseItems.length > 0 && (
                <PaymentForm
                  totalAmount={calculateTotal()}
                  remainingAmount={remainingBalance}
                  payments={payments}
                  onAddPayment={(payment) => {
                    const newPayments = [...payments, { ...payment, id: Date.now().toString() }];
                    const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
                    const remaining = Math.max(0, calculateTotal() - totalPaid);
                    handlePaymentsChange(newPayments, remaining);
                  }}
                  onRemovePayment={(paymentId) => {
                    const newPayments = payments.filter(p => p.id !== paymentId);
                    const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
                    const remaining = Math.max(0, calculateTotal() - totalPaid);
                    handlePaymentsChange(newPayments, remaining);
                  }}
                />
              )}

              {/* Submit Button */}
              <Button
                onClick={completePurchase}
                disabled={isSubmitting || purchaseItems.length === 0 || !selectedSupplier}
                className="w-full h-12 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Purchase
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}