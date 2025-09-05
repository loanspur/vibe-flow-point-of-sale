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
import { useEnsureBaseUnitPcs } from '@/hooks/useEnsureBaseUnitPcs';
import { supabase } from '@/integrations/supabase/client';
import { PaymentForm } from './PaymentForm';
import { createEnhancedPurchaseJournalEntry } from '@/lib/accounting-integration';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useProductSettingsValidation } from '@/hooks/useProductSettingsValidation';
import { useCashDrawer } from '@/hooks/useCashDrawer';
import { useUnifiedStock } from '@/hooks/useUnifiedStock';
import { processPurchaseInventory } from '@/lib/inventory-integration';
import { fallbackCurrencyFormatter } from '@/constants/currency';
import { useCommonData } from '@/hooks/useCommonData';

interface PurchaseFormProps {
  onPurchaseCompleted?: () => void;
  mode?: 'standalone' | 'modal';
  onClose?: () => void;
}

interface PurchaseItem {
  product_id: string;
  product_name: string;
  unit_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export function PurchaseForm({ onPurchaseCompleted, mode = 'standalone', onClose }: PurchaseFormProps) {
  const { tenantId } = useAuth();
  useEnsureBaseUnitPcs();
  
  // Safety check for AppContext
  let formatCurrency: (amount: number) => string;
  try {
    const appContext = useApp();
    formatCurrency = appContext.formatCurrency;
  } catch (error) {
    // Fallback if AppContext is not available
    formatCurrency = fallbackCurrencyFormatter;
  }
  const { toast } = useToast();
  const { purchase: purchaseSettings, tax: taxSettings } = useBusinessSettings();
  const { validatePurchase, showValidationErrors } = useProductSettingsValidation();
  const { currentDrawer, recordCashTransaction } = useCashDrawer();
  const { clearCache: clearStockCache, calculateStock } = useUnifiedStock();
  
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [productStocks, setProductStocks] = useState<Record<string, number>>({});
  
  // Use centralized data management (same as sales form)
  const { products, locations, loading: dataLoading, error: dataError, refreshData } = useCommonData();
  
  // Location state management (same as sales form)
  const [selectedLocation, setSelectedLocation] = useState<string>(localStorage.getItem('selected_location') || '');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  
  // Location handler with persistence (same as sales form)
  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    localStorage.setItem('selected_location', value);
    
    // Update location name
    const location = locations.find(loc => loc.id === value);
    setSelectedLocationName(location?.name || '');
  };
  
  // Update location name when locations change
  useEffect(() => {
    if (selectedLocation && locations.length > 0) {
      const location = locations.find(loc => loc.id === selectedLocation);
      setSelectedLocationName(location?.name || '');
    } else if (!selectedLocation && locations.length > 0) {
      // Set first location as default if no location is selected
      const firstLocation = locations[0];
      setSelectedLocation(firstLocation.id);
      setSelectedLocationName(firstLocation.name);
      localStorage.setItem('selected_location', firstLocation.id);
    }
  }, [selectedLocation, locations]);
  
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [remainingBalance, setRemainingBalance] = useState(0);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchSuppliers();
    }
  }, [tenantId]);

  useEffect(() => {
    if (products.length > 0 && selectedLocation) {
      loadProductStocks();
    }
  }, [products, selectedLocation]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'supplier')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const validSuppliers = (data || []).filter(supplier => 
        supplier && supplier.id && supplier.name
      );
      
      setSuppliers(validSuppliers);
    } catch (error) {
    }
  };

  const loadProductStocks = async () => {
    if (!products.length || !selectedLocation) return;
    
    const stockPromises = products.map(async (product) => {
      try {
        const stockResult = await calculateStock(product.id, selectedLocation);
        return { productId: product.id, stock: stockResult.stock };
      } catch (error) {
        return { productId: product.id, stock: 0 };
      }
    });
    
    const stockResults = await Promise.all(stockPromises);
    const stockMap = stockResults.reduce((acc, { productId, stock }) => {
      acc[productId] = stock;
      return acc;
    }, {} as Record<string, number>);
    
    setProductStocks(stockMap);
  };



  const addItemToPurchase = () => {
    if (!selectedProduct || selectedProduct.trim() === '') {
      toast({
        title: "Error",
        description: "Please select a product.",
        variant: "destructive",
      });
      return;
    }
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) {
      toast({
        title: "Error", 
        description: "Product not found. Please try selecting again.",
        variant: "destructive",
      });
      return;
    }
    
    const validQuantity = Number(quantity);
    if (isNaN(validQuantity) || validQuantity <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity greater than 0.",
        variant: "destructive",
      });
      return;
    }
    
    const validUnitCost = Number(unitCost);
    if (isNaN(validUnitCost) || validUnitCost <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid unit cost greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Check if product already exists in the list
    const existingItemIndex = purchaseItems.findIndex(item => item.product_id === selectedProduct);
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      setPurchaseItems(prevItems => {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        const newQuantity = existingItem.quantity + validQuantity;
        const newTotalCost = newQuantity * validUnitCost;
        
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
          unit_cost: validUnitCost, // Update unit cost to latest
          total_cost: newTotalCost,
        };
        
        return updatedItems;
      });
      
      toast({
        title: "Item Updated",
        description: `${product.name} quantity increased to ${purchaseItems[existingItemIndex].quantity + validQuantity}`,
      });
    } else {
      // Add new item
      const newItem: PurchaseItem = {
        product_id: selectedProduct,
        product_name: product.name,
        unit_id: product.unit_id,
        quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
      };
      
      setPurchaseItems(prevItems => [...prevItems, newItem]);
      
      toast({
        title: "Item Added",
        description: `${product.name} added to purchase`,
      });
    }
    
    // Reset form fields
    setSelectedProduct('');
    setQuantity(1);
    setUnitCost(0);
  };

  const removeItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return purchaseItems.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal() + shippingAmount;
    // Auto-calculate tax if not manually set and purchase default tax rate exists
    const autoTax = purchaseSettings.defaultTaxRate > 0 && taxAmount === 0 
      ? subtotal * (purchaseSettings.defaultTaxRate / 100) 
      : taxAmount;
    return subtotal + autoTax;
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

    // Validate purchase based on product settings
    const validation = validatePurchase(purchaseItems);
    if (!validation.isValid) {
      showValidationErrors(validation.errors);
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

    if (!selectedLocation) {
      toast({
        title: "Error",
        description: "Please select a location for this purchase",
        variant: "destructive",
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: "Error",
        description: "Tenant ID not found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if cash drawer is open for cash payments
    const hasCashPayments = payments.some(p => p.method === 'cash');
    if (hasCashPayments && (!currentDrawer || currentDrawer.status !== 'open')) {
      toast({
        title: "Cash Drawer Closed",
        description: "Please open the cash drawer before processing cash payments",
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

      // Prepare purchase data with proper validation
      const purchaseData = {
        purchase_number: purchaseNumber,
        supplier_id: selectedSupplier,
        location_id: selectedLocation || null,
        total_amount: Number(totalAmount.toFixed(2)),
        shipping_amount: Number((shippingAmount || 0).toFixed(2)),
        tax_amount: Number((taxAmount || (purchaseSettings?.defaultTaxRate > 0 ? (calculateSubtotal() + shippingAmount) * (purchaseSettings.defaultTaxRate / 100) : 0) || 0).toFixed(2)),
        discount_amount: 0, // Add missing discount_amount field
        status: purchaseSettings?.autoReceive ? 'received' : 'ordered',
        order_date: new Date().toISOString().split('T')[0],
        expected_date: new Date().toISOString().split('T')[0], // Add missing expected_date field
        received_date: (purchaseSettings?.autoReceive ? new Date().toISOString().split('T')[0] : null) || null,
        notes: notes || null,
        created_by: user.id,
        tenant_id: tenantId,
      };


      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (purchaseError) {
        throw purchaseError;
      }

      // Create purchase items with proper validation
      const purchaseItemsData = purchaseItems.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        unit_id: item.unit_id || null,
        quantity_ordered: Number(item.quantity),
        quantity_received: Number(item.quantity),
        unit_cost: Number(item.unit_cost.toFixed(2)),
        total_cost: Number(item.total_cost.toFixed(2)),
      }));


      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(purchaseItemsData);

      if (itemsError) {
        throw itemsError;
      }

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
          // Continue with purchase completion even if payments fail
        }

        // Update cash drawer for cash payments using hook
        const cashPayments = payments.filter(p => p.method === 'cash');
        for (const cashPayment of cashPayments) {
          await recordCashTransaction(
            'purchase_payment',
            -cashPayment.amount, // Negative for outgoing cash
            `Purchase payment - PO: ${purchaseNumber}`,
            'purchase',
            purchase.id
          );
        }
      }

      // Update product stock levels using existing inventory integration
      const inventoryItems = purchaseItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        locationId: selectedLocation
      }));
      
      try {
        await processPurchaseInventory(tenantId, purchase.id, inventoryItems, selectedLocation);
      } catch (inventoryError) {
        toast({
          title: "Warning",
          description: "Purchase completed but inventory update failed",
          variant: "destructive",
        });
      }

      // Clear stock cache to ensure real-time updates across all components
      clearStockCache();

      // Create accounting entries with location context
      const itemsWithCost = purchaseItems.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitCost: item.unit_cost,
        locationId: selectedLocation
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
          items: itemsWithCost
        });
      } catch (accountingError) {
        toast({
          title: "Warning",
          description: "Purchase completed but accounting entry failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Purchase Completed",
        description: `Purchase Order #${purchaseNumber} - Total: ${formatCurrency(totalAmount)}${selectedLocationName ? ` at ${selectedLocationName}` : ''}`,
      });

      // Reset form but preserve location selection
      setPurchaseItems([]);
      setPayments([]);
      setRemainingBalance(0);
      setSelectedSupplier('');
      setSelectedProduct('');
      setQuantity(1);
      setUnitCost(0);
      setShippingAmount(0);
      setTaxAmount(0);
      setNotes('');
      // Keep selectedLocation and selectedLocationName for persistence
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

  const renderContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Left side - Product Selection (2/3 width) */}
        <div className="xl:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Add Items to Purchase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Addition Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                            const currentStock = productStocks[product.id] || 0;
                            const isLowStock = currentStock <= (product.low_stock_threshold || 10);
                            return (
                              <SelectItem key={product.id} value={product.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>
                                    {product.name} - {product.sku || 'No SKU'} {product.brands && `[${product.brands.name}]`} {product.product_units && `(${product.product_units.abbreviation})`}
                                  </span>
                                  <Badge 
                                    variant={isLowStock ? "destructive" : "secondary"} 
                                    className="ml-2 text-xs"
                                  >
                                    Stock: {currentStock} {product.product_units?.abbreviation || ''}
                                  </Badge>
                                </div>
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
                   <Label>Quantity {selectedProduct && products.find(p => p.id === selectedProduct)?.product_units && `(${products.find(p => p.id === selectedProduct)?.product_units?.abbreviation})`}</Label>
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
                             {item.quantity} {(() => {
                               const product = products.find(p => p.id === item.product_id);
                               return product?.product_units ? `${product.product_units.abbreviation}` : 'pcs';
                             })()} × {formatCurrency(item.unit_cost)}
                             {(() => {
                               const product = products.find(p => p.id === item.product_id);
                               return product?.brands ? ` • ${product.brands.name}` : '';
                             })()}
                           </p>
                         </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-right break-all min-w-[80px]">{formatCurrency(item.total_cost)}</span>
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
        <div className="xl:col-span-1">
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Location Display */}
              {selectedLocationName && (
                <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Purchase Location:</span>
                    <Badge variant="outline">{selectedLocationName}</Badge>
                  </div>
                </div>
              )}

              {/* Supplier and Location Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length > 0 ? (
                        suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                            </SelectItem>
                        ))
                       ) : (
                         <SelectItem key="no-suppliers" value="disabled-no-suppliers" disabled>
                           No suppliers available
                         </SelectItem>
                       )}
                    </SelectContent>
                  </Select>
                </div>
                
                 <div className="space-y-2">
                   <Label>Location *</Label>
                  <Select value={selectedLocation} onValueChange={handleLocationChange} disabled={dataLoading}>
                     <SelectTrigger>
                      <SelectValue placeholder={
                        dataLoading 
                          ? "Loading locations..." 
                          : dataError 
                            ? "Error loading locations" 
                            : "Select location"
                      } />
                     </SelectTrigger>
                     <SelectContent>
                      {dataLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading locations...
                        </SelectItem>
                      ) : dataError ? (
                        <SelectItem value="error" disabled>
                          Error: {dataError}
                        </SelectItem>
                      ) : locations.length > 0 ? (
                        locations.map((location) => (
                         <SelectItem key={location.id} value={location.id}>
                            {location.name} {location.is_primary && "(Primary)"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-locations" disabled>
                          No locations available
                         </SelectItem>
                      )}
                     </SelectContent>
                   </Select>
                  {selectedLocationName && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {selectedLocationName}
                    </p>
                  )}
                  {dataError && (
                    <p className="text-xs text-red-500">
                      Error loading locations: {dataError}
                    </p>
                  )}
                 </div>
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

              {/* Tax */}
              <div className="space-y-2">
                <Label>Tax {purchaseSettings.defaultTaxRate > 0 && `(Default: ${purchaseSettings.defaultTaxRate}%)`}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={purchaseSettings.defaultTaxRate > 0 ? "Auto-calculated" : "0.00"}
                  value={taxAmount || ''}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
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
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex-1">Subtotal:</span>
                    <span className="font-medium text-right min-w-[100px]">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                   {shippingAmount > 0 && (
                     <div className="flex justify-between items-center text-sm">
                       <span className="flex-1">Shipping:</span>
                       <span className="font-medium text-right min-w-[100px]">{formatCurrency(shippingAmount)}</span>
                     </div>
                   )}
                   {(taxAmount > 0 || purchaseSettings.defaultTaxRate > 0) && (
                     <div className="flex justify-between items-center text-sm">
                       <span className="flex-1">Tax:</span>
                       <span className="font-medium text-right min-w-[100px]">{formatCurrency(taxAmount || (purchaseSettings.defaultTaxRate > 0 ? (calculateSubtotal() + shippingAmount) * (purchaseSettings.defaultTaxRate / 100) : 0))}</span>
                     </div>
                   )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold flex-1">Total:</span>
                      <span className="text-lg font-bold text-right min-w-[120px]">{formatCurrency(calculateTotal())}</span>
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

  // Render based on mode
  if (mode === 'modal') {
    return (
      <div className="space-y-4">
        {renderContent()}
      </div>
    );
  }

  return renderContent();
}