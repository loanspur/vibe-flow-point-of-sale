import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { createEnhancedPurchaseJournalEntry, createPaymentJournalEntry, getPaymentMethodAccount } from '@/lib/accounting-integration';
import { processPurchaseReceipt } from '@/lib/inventory-integration';
import { useToast } from '@/hooks/use-toast';
import { useDeletionControl } from '@/hooks/useDeletionControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import QuickCreateSupplierDialog from './QuickCreateSupplierDialog';
import { 
  ShoppingCart, 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  DollarSign,
  FileText,
  RotateCcw,
  CreditCard
} from 'lucide-react';
import { PaymentForm } from './PaymentForm';
import PurchaseReturns from './PurchaseReturns';

interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name?: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  received_date?: string | null;
  total_amount: number;
  notes?: string | null;
  created_by: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  variant_id?: string;
  product_name?: string;
  variant_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  expiry_date?: string;
  notes?: string;
}

interface PurchasePayment {
  id: string;
  purchase_id: string;
  method: string;
  amount: number;
  reference?: string;
  date: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed';
}

interface Product {
  id: string;
  name: string;
  sku: string;
  default_profit_margin?: number;
  price: number;
  stock_quantity: number;
  has_expiry_date?: boolean;
  product_variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  value: string;
  sku: string;
  default_profit_margin?: number;
  sale_price: number;
  stock_quantity: number;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

const PURCHASE_STATUSES = [
  { value: 'draft', label: 'Draft', icon: Clock, color: 'bg-gray-500' },
  { value: 'ordered', label: 'Ordered', icon: ShoppingCart, color: 'bg-blue-500' },
  { value: 'received', label: 'Received', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelled', icon: AlertCircle, color: 'bg-red-500' }
];

const PurchaseManagement = () => {
  const { tenantId, user } = useAuth();
  const { formatCurrency } = useApp();
  const { toast } = useToast();
  const { canDelete, logDeletionAttempt } = useDeletionControl();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [receivingPurchase, setReceivingPurchase] = useState<Purchase | null>(null);
  const [paymentPurchase, setPaymentPurchase] = useState<Purchase | null>(null);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchasePayments, setPurchasePayments] = useState<PurchasePayment[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([{ product_id: null, variant_id: null, quantity: 1, unit_cost: 0 }]);

  // Form states
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [] as any[]
  });

  // Optimized purchase data fetching with caching - auto-loads when component mounts
  const { data: purchases = [], loading, refetch: refetchPurchases } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: [], error: null };
      
      console.log('Auto-loading purchases list for tenant:', tenantId);
      
      try {
        const { data, error } = await supabase
          .from('purchases')
          .select(`
            *,
            supplier:contacts(name)
          `)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const purchasesWithSupplier = (data || []).map(purchase => ({
          ...purchase,
          supplier_name: purchase.supplier?.name || 'Unknown Supplier'
        }));
        
        console.log('Purchases loaded successfully:', purchasesWithSupplier.length, 'items');
        
        return { data: purchasesWithSupplier, error: null };
      } catch (error) {
        console.error('Error fetching purchases:', error);
        throw error;
      }
    },
    [tenantId],
    {
      enabled: !!tenantId,
      staleTime: 30 * 1000, // 30 seconds cache for immediate loading
      cacheKey: `purchases-${tenantId}`
    }
  );

  useEffect(() => {
    if (tenantId) {
      fetchProducts();
      fetchSuppliers();
    }
  }, [tenantId]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          sku, 
          default_profit_margin, 
          price, 
          stock_quantity,
          has_expiry_date,
          unit_id,
          product_variants (
            id,
            name,
            value,
            sku,
            default_profit_margin,
            sale_price,
            stock_quantity
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company')
        .eq('tenant_id', tenantId)
        .eq('type', 'supplier')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchPurchaseItems = async (purchaseId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_items')
        .select(`
          *,
          product:products(name, sku)
        `)
        .eq('purchase_id', purchaseId);

      if (error) throw error;
      
      // Fetch variant information separately if variant_id exists
      const itemsWithProduct = await Promise.all((data || []).map(async (item) => {
        let variantName = null;
        
        if (item.variant_id) {
          const { data: variant } = await supabase
            .from('product_variants')
            .select('name, value')
            .eq('id', item.variant_id)
            .single();
          
          if (variant) {
            variantName = `${variant.name}: ${variant.value}`;
          }
        }
        
        return {
          ...item,
          product_name: item.product?.name || 'Unknown Product',
          variant_name: variantName
        };
      }));
      
      setPurchaseItems(itemsWithProduct);
    } catch (error) {
      console.error('Error fetching purchase items:', error);
    }
  };

  const generatePurchaseNumber = () => {
    const timestamp = Date.now();
    return `PO-${timestamp.toString().slice(-8)}`;
  };

  const createPurchase = async () => {
    if (!formData.supplier_id || selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select a supplier and add at least one item",
        variant: "destructive",
      });
      return;
    }

    // Validate all items have product selected and valid quantities
    const invalidItems = (selectedItems || []).filter(item => 
      !item.product_id || item.quantity <= 0 || item.unit_cost < 0
    );
    
    if (invalidItems.length > 0) {
      toast({
        title: "Error",
        description: "Please ensure all items have a product selected with valid quantity and cost",
        variant: "destructive",
      });
      return;
    }

    console.log('Creating purchase with items:', selectedItems);
    console.log('Form data:', formData);

    try {
      const purchaseNumber = generatePurchaseNumber();
      const totalAmount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          purchase_number: purchaseNumber,
          supplier_id: formData.supplier_id,
          status: 'draft',
          order_date: new Date().toISOString().split('T')[0],
          expected_date: formData.expected_date || new Date().toISOString().split('T')[0],
          total_amount: totalAmount,
          notes: formData.notes,
          created_by: user?.id,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create purchase items
      const items = selectedItems.map(item => {
        const prod = products.find(p => p.id === item.product_id) as any;
        return {
          purchase_id: purchase.id,
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity_ordered: item.quantity,
          quantity_received: 0,
          unit_cost: item.unit_cost,
          total_cost: item.quantity * item.unit_cost,
          expiry_date: item.expiry_date || null,
          unit_id: prod?.unit_id || null,
         };
      });

      console.log('Inserting purchase items:', items);

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(items);

      if (itemsError) {
        console.error('Error inserting purchase items:', itemsError);
        throw itemsError;
      }

      // Note: Accounting entry will be created when purchase is received, not at creation
      // This prevents double-counting inventory and payables

      toast({
        title: "Success",
        description: "Purchase order created successfully"
      });
      setIsCreateOpen(false);
      resetForm();
      refetchPurchases();
    } catch (error: any) {
      console.error('Error creating purchase:', error);
      toast({
        title: "Error",
        description: `Failed to create purchase order: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const updatePurchaseStatus = async (purchaseId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'ordered') {
        updateData.order_date = new Date().toISOString().split('T')[0];
      } else if (status === 'received') {
        updateData.received_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', purchaseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Purchase ${status} successfully`
      });
      refetchPurchases();
    } catch (error) {
      console.error('Error updating purchase status:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase status",
        variant: "destructive",
      });
    }
  };

  const receivePurchase = async () => {
    if (!receivingPurchase) return;

    try {
      // Update purchase status to received
      await updatePurchaseStatus(receivingPurchase.id, 'received');

      // Update the quantity_received in purchase_items table
      for (const item of purchaseItems) {
        if (item.quantity_received > 0) {
          const { error } = await supabase
            .from('purchase_items')
            .update({ quantity_received: item.quantity_received })
            .eq('id', item.id);

          if (error) {
            console.error('Error updating purchase item:', error);
            throw error;
          }
        }
      }

      // Prepare inventory transactions for items with received quantities
      const receivedItems = (purchaseItems || [])
        .filter(item => item.quantity_received > 0)
        .map(item => ({
          productId: item.product_id,
          variantId: item.variant_id || undefined,
          quantityReceived: item.quantity_received,
          unitCost: item.unit_cost
        }));

      if (receivedItems.length > 0) {
        // Process inventory updates using the new integration
        await processPurchaseReceipt(tenantId, receivingPurchase.id, receivedItems);
        toast({
          title: "Success",
          description: `Purchase received and inventory updated for ${receivedItems.length} items`
        });
      } else {
        toast({
          title: "Success",
          description: "Purchase received (no inventory updates - no quantities received)"
        });
      }

      // Create accounting journal entry for received purchase with any payments
      try {
        const paymentData = purchasePayments.map(p => ({ method: p.method, amount: p.amount }));
        await createEnhancedPurchaseJournalEntry(tenantId, {
          purchaseId: receivingPurchase.id,
          supplierId: receivingPurchase.supplier_id,
          totalAmount: receivingPurchase.total_amount,
          isReceived: true,
          payments: paymentData.length > 0 ? paymentData : undefined,
          createdBy: user?.id || '',
          items: receivedItems.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantityReceived,
            unitCost: item.unitCost
          }))
        });
      } catch (accountingError) {
        console.error('Accounting entry error during receive:', accountingError);
        // Don't fail the entire operation if accounting fails
      }

      setIsReceiveOpen(false);
      setReceivingPurchase(null);
      refetchPurchases();
      fetchProducts(); // Refresh products to show updated inventory
    } catch (error) {
      console.error('Error receiving purchase:', error);
      toast({
        title: "Error",
        description: "Failed to receive purchase",
        variant: "destructive",
      });
    }
  };

  const autoReceivePurchase = async (purchase: Purchase) => {
    try {
      // Fetch purchase items for this purchase
      const { data: items, error } = await supabase
        .from('purchase_items')
        .select(`
          *,
          product:products(name, sku)
        `)
        .eq('purchase_id', purchase.id);

      if (error) throw error;

      // Update all items to be fully received (quantity_received = quantity_ordered)
      for (const item of items || []) {
        const { error: updateError } = await supabase
          .from('purchase_items')
          .update({ quantity_received: item.quantity_ordered })
          .eq('id', item.id);

        if (updateError) {
          console.error('Error updating purchase item:', updateError);
          throw updateError;
        }
      }

      // Update purchase status to received
      await updatePurchaseStatus(purchase.id, 'received');

      // Prepare inventory transactions for all items (fully received)
      const receivedItems = (items || []).map(item => ({
        productId: item.product_id,
        variantId: item.variant_id || undefined,
        quantityReceived: item.quantity_ordered, // Auto-receive full quantity
        unitCost: item.unit_cost
      }));

      if (receivedItems.length > 0) {
        // Process inventory updates using the integration
        await processPurchaseReceipt(tenantId, purchase.id, receivedItems);
        toast({
          title: "Success",
          description: `Purchase auto-received and inventory updated for ${receivedItems.length} items`
        });
      }

      // Create accounting journal entry for received purchase
      try {
        await createEnhancedPurchaseJournalEntry(tenantId, {
          purchaseId: purchase.id,
          supplierId: purchase.supplier_id,
          totalAmount: purchase.total_amount,
          isReceived: true,
          createdBy: user?.id || ''
        });
      } catch (accountingError) {
        console.error('Accounting entry error during auto-receive:', accountingError);
        // Don't fail the entire operation if accounting fails
      }

      refetchPurchases();
      fetchProducts(); // Refresh products to show updated inventory
    } catch (error) {
      console.error('Error auto-receiving purchase:', error);
      toast({
        title: "Error",
        description: "Failed to auto-receive purchase",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { product_id: null, variant_id: null, quantity: 1, unit_cost: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = (selectedItems || []).filter((_, i) => i !== index);
    setSelectedItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill unit cost when product or variant is selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].unit_cost = product.default_profit_margin || 0;
        // Clear variant when product changes
        newItems[index].variant_id = '';
      }
    }
    
    if (field === 'variant_id' && value) {
      const product = products.find(p => p.id === newItems[index].product_id);
      const variant = product?.product_variants?.find(v => v.id === value);
      if (variant) {
        newItems[index].unit_cost = variant.default_profit_margin || 0;
      }
    }
    
    setSelectedItems(newItems);
  };

  const updateReceiveQuantity = (index: number, quantity: number) => {
    const newItems = [...purchaseItems];
    newItems[index] = { ...newItems[index], quantity_received: quantity };
    setPurchaseItems(newItems);
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      expected_date: '',
      notes: '',
      items: []
    });
    setSelectedItems([{ product_id: null, variant_id: null, quantity: 1, unit_cost: 0 }]);
  };

  const openReceiveDialog = async (purchase: Purchase) => {
    setReceivingPurchase(purchase);
    await fetchPurchaseItems(purchase.id);
    
    // Auto-set received quantities to ordered quantities for convenience
    const updatedItems = await Promise.all(purchaseItems.map(async (item) => {
      return {
        ...item,
        quantity_received: item.quantity_ordered // Auto-fill with ordered quantity
      };
    }));
    
    // Wait a moment for the purchase items to be set, then update with auto-filled quantities
    setTimeout(() => {
      setPurchaseItems(prev => prev.map(item => ({
        ...item,
        quantity_received: item.quantity_ordered
      })));
    }, 100);
    
    setIsReceiveOpen(true);
  };

  const openPaymentDialog = async (purchase: Purchase) => {
    setPaymentPurchase(purchase);
    await fetchPurchasePayments(purchase.id);
    setIsPaymentOpen(true);
  };

  const fetchPurchasePayments = async (purchaseId: string) => {
    try {
      console.log('Fetching payments for purchase:', purchaseId);
      
      // First get AP record for this purchase
      const { data: apData, error: apError } = await supabase
        .from('accounts_payable')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('reference_id', purchaseId)
        .eq('reference_type', 'purchase')
        .single();

      if (apError && apError.code !== 'PGRST116') {
        console.error('Error fetching AP record:', apError);
        setPurchasePayments([]);
        return;
      }

      if (!apData) {
        console.log('No AP record found for purchase');
        setPurchasePayments([]);
        return;
      }

      // Fetch payments from ar_ap_payments table using AP record ID
      const { data, error } = await supabase
        .from('ar_ap_payments')
        .select('*')
        .eq('reference_id', apData.id)
        .eq('payment_type', 'payable')
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }
      
      console.log('Fetched payments:', data);
      
      // Transform to match PurchasePayment interface
      const payments = (data || []).map(payment => ({
        id: payment.id,
        purchase_id: purchaseId,
        method: payment.payment_method,
        amount: payment.amount,
        reference: payment.reference_number || '',
        date: payment.payment_date,
        notes: payment.notes || '',
        status: 'completed' as const
      }));
      
      setPurchasePayments(payments);
    } catch (error) {
      console.error('Error fetching purchase payments:', error);
      setPurchasePayments([]);
    }
  };

  const addPayment = async (payment: Omit<PurchasePayment, 'id' | 'purchase_id'>) => {
    if (!paymentPurchase || !tenantId || !user) return;

    try {
      console.log('Adding payment for purchase:', paymentPurchase.id, payment);

      // Step 1: Check if AP record exists for this purchase
      let apRecordId = null;
      const { data: existingAP, error: apSearchError } = await supabase
        .from('accounts_payable')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('reference_id', paymentPurchase.id)
        .eq('reference_type', 'purchase')
        .single();

      if (apSearchError && apSearchError.code !== 'PGRST116') {
        console.error('Error checking existing AP:', apSearchError);
        throw new Error('Failed to check existing payable record');
      }

      // Step 2: Create AP record if it doesn't exist
      if (!existingAP) {
        console.log('Creating new AP record for purchase');
        const { data: newAP, error: apCreateError } = await supabase.rpc(
          'create_accounts_payable_record',
          {
            tenant_id_param: tenantId,
            purchase_id_param: paymentPurchase.id,
            supplier_id_param: paymentPurchase.supplier_id,
            total_amount_param: paymentPurchase.total_amount
          }
        );

        if (apCreateError) {
          console.error('Error creating AP record:', apCreateError);
          throw new Error('Failed to create payable record');
        }
        apRecordId = newAP;
        console.log('AP record created:', apRecordId);
      } else {
        apRecordId = existingAP.id;
        console.log('Using existing AP record:', apRecordId);
      }

      // Step 3: Record the payment
      const { data: savedPayment, error: paymentError } = await supabase
        .from('ar_ap_payments')
        .insert({
          tenant_id: tenantId,
          payment_type: 'payable',
          reference_id: apRecordId,
          payment_date: payment.date,
          amount: payment.amount,
          payment_method: payment.method,
          reference_number: payment.reference,
          notes: payment.notes
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error recording payment:', paymentError);
        throw new Error('Failed to record payment');
      }

      console.log('Payment recorded successfully:', savedPayment);

      // Step 4: Create accounting journal entry
      try {
        await createPaymentJournalEntry(tenantId, {
          paymentId: savedPayment.id,
          amount: payment.amount,
          paymentType: 'payable',
          paymentMethod: payment.method,
          referenceId: apRecordId,
          createdBy: user.id
        });
        console.log('Accounting entry created');
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        // Don't fail payment if accounting fails
        toast({
          title: "Warning", 
          description: "Payment recorded but accounting entry failed",
          variant: "destructive",
        });
      }

      // Step 5: Check if purchase should be marked as paid
      setTimeout(async () => {
        try {
          const { data: updatedAP, error: apCheckError } = await supabase
            .from('accounts_payable')
            .select('status')
            .eq('id', apRecordId)
            .single();

          if (!apCheckError && updatedAP?.status === 'paid') {
            console.log('Purchase fully paid, updating purchase status');
            await supabase
              .from('purchases')
              .update({ status: 'paid' })
              .eq('id', paymentPurchase.id);
          }
        } catch (statusError) {
          console.error('Error updating purchase status:', statusError);
        }
      }, 500);

      // Step 6: Refresh payments data
      await fetchPurchasePayments(paymentPurchase.id);
      
      toast({
        title: "Success", 
        description: `Payment of $${payment.amount.toFixed(2)} recorded successfully`
      });

    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add payment',
        variant: "destructive",
      });
    }
  };

  const removePayment = async (paymentId: string) => {
    if (!paymentId.includes('payment-')) {
      if (!canDelete('payment')) {
        logDeletionAttempt('payment', paymentId);
        toast({
          title: "Deletion Disabled",
          description: "Payment deletion has been disabled to maintain audit trail and data integrity.",
          variant: "destructive",
        });
        return;
      }
      // This is a real payment from database, don't allow removal for now
      toast({
        title: "Error", 
        description: "Cannot remove saved payments. Contact administrator if needed.",
        variant: "destructive",
      });
      return;
    }
    setPurchasePayments(prev => (prev || []).filter(p => p.id !== paymentId));
  };

  const getRemainingAmount = () => {
    if (!paymentPurchase) return 0;
    const totalPaid = purchasePayments.reduce((sum, payment) => sum + payment.amount, 0);
    return Math.max(0, paymentPurchase.total_amount - totalPaid);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = PURCHASE_STATUSES.find(s => s.value === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;
    return (
      <Badge className={`${statusConfig.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  // Memoized calculations for better performance
  const filteredPurchases = useMemo(() => {
    if (!purchases || !Array.isArray(purchases)) return [];
    
    return purchases.filter(purchase => {
      const matchesSearch = purchase.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, searchTerm, statusFilter]);

  const totalPurchases = purchases?.length || 0;
  const draftPurchases = purchases?.filter(p => p.status === 'draft').length || 0;
  const orderedPurchases = purchases?.filter(p => p.status === 'ordered').length || 0;
  const receivedPurchases = purchases?.filter(p => p.status === 'received').length || 0;
  const totalPurchaseValue = purchases?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Management</h1>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Create a new purchase order for your suppliers
              </DialogDescription>
            </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplier">Supplier *</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={formData.supplier_id}
                        onValueChange={(value) => setFormData({...formData, supplier_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name} ({supplier.company})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <QuickCreateSupplierDialog onSupplierCreated={() => fetchSuppliers()} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="expected_date">Expected Delivery Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.expected_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expected_date ? format(new Date(formData.expected_date), "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.expected_date ? new Date(formData.expected_date) : undefined}
                          onSelect={(date) => setFormData({...formData, expected_date: date ? format(date, 'yyyy-MM-dd') : ''})}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Purchase Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {selectedItems.map((item, index) => {
                    const selectedProduct = products.find(p => p.id === item.product_id);
                    const hasExpiry = selectedProduct?.has_expiry_date;
                    
                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
                        <div className="col-span-3">
                          <Label>Product *</Label>
                          <Select
                            value={item.product_id || ''}
                            onValueChange={(value) => updateItem(index, 'product_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedProduct?.product_variants && selectedProduct.product_variants.length > 0 && (
                          <div className="col-span-2">
                            <Label>Variant</Label>
                            <Select
                              value={item.variant_id || 'no-variant'}
                              onValueChange={(value) => updateItem(index, 'variant_id', value === 'no-variant' ? null : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select variant" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no-variant">No Variant</SelectItem>
                                {selectedProduct.product_variants.map((variant) => (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {variant.name}: {variant.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className={selectedProduct?.product_variants && selectedProduct.product_variants.length > 0 ? "col-span-2" : "col-span-4"}>
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div className="col-span-2">
                          <Label>Unit Cost *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_cost}
                            onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {hasExpiry && (
                          <div className="col-span-2">
                            <Label>Expiry Date *</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal text-sm",
                                    !item.expiry_date && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {item.expiry_date ? format(new Date(item.expiry_date), "PPP") : "Pick date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={item.expiry_date ? new Date(item.expiry_date) : undefined}
                                  onSelect={(date) => updateItem(index, 'expiry_date', date ? format(date, 'yyyy-MM-dd') : '')}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        <div className={hasExpiry ? "col-span-1" : "col-span-2"}>
                          <Label>Total</Label>
                          <div className="text-sm font-medium p-2 bg-muted rounded">
                            {formatCurrency(item.quantity * item.unit_cost)}
                          </div>
                        </div>

                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={selectedItems.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      Total: {formatCurrency(selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Additional notes or special instructions"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createPurchase}>Create Purchase Order</Button>
                </div>
              </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Orders</TabsTrigger>
          <TabsTrigger value="receiving">Receiving</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">

          <Card>
            <CardHeader>
              <CardTitle>Recent Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Order Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchases || []).slice(0, 5).map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.supplier_name}</TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>{formatCurrency(purchase.total_amount || 0)}</TableCell>
                      <TableCell>{new Date(purchase.order_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Purchase Orders
              </CardTitle>
              <CardDescription>Manage all your purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by order number or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PURCHASE_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.supplier_name}</TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>{new Date(purchase.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(purchase.expected_date).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(purchase.total_amount || 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {purchase.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updatePurchaseStatus(purchase.id, 'ordered')}
                            >
                              Send Order
                            </Button>
                          )}
                          {purchase.status === 'ordered' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReceiveDialog(purchase)}
                              >
                                <Package className="h-4 w-4 mr-1" />
                                Receive
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => autoReceivePurchase(purchase)}
                                className="ml-2"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Auto Receive
                              </Button>
                            </>
                          )}
                          {(purchase.status === 'ordered' || purchase.status === 'received') && (
                            <>
                              {(() => {
                                const totalPaid = (purchasePayments || [])
                                  .filter(p => p.purchase_id === purchase.id)
                                  .reduce((sum, payment) => sum + payment.amount, 0);
                                const isPaid = totalPaid >= purchase.total_amount;
                                const isPartiallyPaid = totalPaid > 0 && totalPaid < purchase.total_amount;
                                
                                if (isPaid) {
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled
                                      className="bg-green-50 text-green-700 border-green-200"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Fully Paid
                                    </Button>
                                  );
                                } else if (isPartiallyPaid) {
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openPaymentDialog(purchase)}
                                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                                    >
                                      <CreditCard className="h-4 w-4 mr-1" />
                                      Partially Paid
                                    </Button>
                                  );
                                } else {
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openPaymentDialog(purchase)}
                                    >
                                      <CreditCard className="h-4 w-4 mr-1" />
                                      Pay
                                    </Button>
                                  );
                                }
                              })()}
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updatePurchaseStatus(purchase.id, 'cancelled')}
                            disabled={purchase.status === 'received'}
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receiving" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchases || []).filter(p => p.status === 'ordered').map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.supplier_name}</TableCell>
                      <TableCell>{new Date(purchase.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(purchase.expected_date).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(purchase.total_amount || 0)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReceiveDialog(purchase)}
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Receive
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns">
          <PurchaseReturns />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Purchase Orders:</span>
                    <span className="font-semibold">{totalPurchases}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-semibold">
                      {formatCurrency(totalPurchaseValue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Order Value:</span>
                    <span className="font-semibold">
                      {totalPurchases > 0 ? formatCurrency(totalPurchaseValue / totalPurchases) : formatCurrency(0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(suppliers || []).slice(0, 5).map((supplier, index) => (
                    <div key={supplier.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">{supplier.company}</div>
                      </div>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Receive Purchase Dialog */}
      <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Purchase Order</DialogTitle>
            <DialogDescription>
              Update received quantities for {receivingPurchase?.purchase_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Product</TableHead>
                   <TableHead>Ordered</TableHead>
                   <TableHead>Received</TableHead>
                   <TableHead>Expiry Date</TableHead>
                   <TableHead>Unit Cost</TableHead>
                   <TableHead>Total</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                {purchaseItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        {item.variant_name && (
                          <div className="text-sm text-muted-foreground">{item.variant_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity_ordered}</TableCell>
                     <TableCell>
                       <Input
                         type="number"
                         value={item.quantity_received}
                         onChange={(e) => updateReceiveQuantity(index, parseInt(e.target.value) || 0)}
                         max={item.quantity_ordered}
                         min="0"
                         className="w-20"
                       />
                     </TableCell>
                     <TableCell>
                       {item.expiry_date ? (
                         <span className="text-sm">{new Date(item.expiry_date).toLocaleDateString()}</span>
                       ) : (
                         <span className="text-muted-foreground">-</span>
                       )}
                     </TableCell>
                     <TableCell>${item.unit_cost.toFixed(2)}</TableCell>
                     <TableCell>${(item.quantity_received * item.unit_cost).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={receivePurchase}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Receive Items
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Purchase Payments</DialogTitle>
            <DialogDescription>
              Record payments for purchase order {paymentPurchase?.purchase_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {paymentPurchase && (
              <PaymentForm
                totalAmount={paymentPurchase.total_amount}
                remainingAmount={getRemainingAmount()}
                payments={purchasePayments}
                onAddPayment={addPayment}
                onRemovePayment={removePayment}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseManagement;