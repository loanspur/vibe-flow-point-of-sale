import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createPurchaseJournalEntry, createPaymentJournalEntry } from '@/lib/accounting-integration';
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
import { toast } from 'sonner';
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
  Calendar,
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
  product_name?: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
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
  cost: number;
  price: number;
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
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [selectedItems, setSelectedItems] = useState<any[]>([{ product_id: '', quantity: 1, unit_cost: 0 }]);

  // Form states
  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_date: '',
    notes: '',
    items: [] as any[]
  });

  useEffect(() => {
    if (tenantId) {
      fetchPurchases();
      fetchProducts();
      fetchSuppliers();
    }
  }, [tenantId]);

  const fetchPurchases = async () => {
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
      
      setPurchases(purchasesWithSupplier);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to load purchases');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, cost, price, stock_quantity')
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
    } finally {
      setLoading(false);
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
      
      const itemsWithProduct = (data || []).map(item => ({
        ...item,
        product_name: item.product?.name || 'Unknown Product'
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
      toast.error('Please select a supplier and add at least one item');
      return;
    }

    // Validate all items have product selected and valid quantities
    const invalidItems = selectedItems.filter(item => 
      !item.product_id || item.quantity <= 0 || item.unit_cost < 0
    );
    
    if (invalidItems.length > 0) {
      toast.error('Please ensure all items have a product selected with valid quantity and cost');
      return;
    }

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
          expected_date: formData.expected_date,
          total_amount: totalAmount,
          notes: formData.notes,
          created_by: user?.id,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Create purchase items
      const items = selectedItems.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity_ordered: item.quantity,
        quantity_received: 0,
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Create accounting journal entry for the purchase
      try {
        await createPurchaseJournalEntry(tenantId, {
          purchaseId: purchase.id,
          supplierId: formData.supplier_id,
          totalAmount: totalAmount,
          isReceived: false,
          createdBy: user?.id || ''
        });
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        // Don't fail the purchase if accounting fails
        toast.error('Purchase created but accounting entry failed');
      }

      toast.success('Purchase order created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchPurchases();
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast.error('Failed to create purchase order');
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

      toast.success(`Purchase ${status} successfully`);
      fetchPurchases();
    } catch (error) {
      console.error('Error updating purchase status:', error);
      toast.error('Failed to update purchase status');
    }
  };

  const receivePurchase = async () => {
    if (!receivingPurchase) return;

    try {
      // Update purchase status to received
      await updatePurchaseStatus(receivingPurchase.id, 'received');

      // Update product stock quantities based on received quantities
      for (const item of purchaseItems) {
        if (item.quantity_received > 0) {
          // Get current stock quantity first
          const { data: product, error: getError } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (getError) throw getError;

          // Update with new stock quantity
          const { error } = await supabase
            .from('products')
            .update({
              stock_quantity: (product.stock_quantity || 0) + item.quantity_received
            })
            .eq('id', item.product_id);

          if (error) throw error;
        }
      }

      toast.success('Purchase received and inventory updated');
      setIsReceiveOpen(false);
      setReceivingPurchase(null);
      fetchPurchases();
    } catch (error) {
      console.error('Error receiving purchase:', error);
      toast.error('Failed to receive purchase');
    }
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { product_id: '', quantity: 1, unit_cost: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill unit cost when product is selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].unit_cost = product.cost || 0;
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
    setSelectedItems([{ product_id: '', quantity: 1, unit_cost: 0 }]);
  };

  const openReceiveDialog = async (purchase: Purchase) => {
    setReceivingPurchase(purchase);
    await fetchPurchaseItems(purchase.id);
    setIsReceiveOpen(true);
  };

  const openPaymentDialog = async (purchase: Purchase) => {
    setPaymentPurchase(purchase);
    await fetchPurchasePayments(purchase.id);
    setIsPaymentOpen(true);
  };

  const fetchPurchasePayments = async (purchaseId: string) => {
    try {
      // Fetch payments from accounts payable payments table
      const { data, error } = await supabase
        .from('ar_ap_payments')
        .select('*')
        .eq('reference_id', purchaseId)
        .eq('payment_type', 'payable')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      
      // Transform to match PurchasePayment interface
      const payments = (data || []).map(payment => ({
        id: payment.id,
        purchase_id: purchaseId,
        method: payment.payment_method,
        amount: payment.amount,
        reference: payment.reference_number,
        date: payment.payment_date,
        notes: payment.notes,
        status: 'completed' as const
      }));
      
      setPurchasePayments(payments);
    } catch (error) {
      console.error('Error fetching purchase payments:', error);
    }
  };

  const addPayment = (payment: Omit<PurchasePayment, 'id' | 'purchase_id'>) => {
    const newPayment: PurchasePayment = {
      id: `payment-${Date.now()}`,
      purchase_id: paymentPurchase?.id || '',
      ...payment
    };
    setPurchasePayments(prev => [...prev, newPayment]);
  };

  const removePayment = (paymentId: string) => {
    setPurchasePayments(prev => prev.filter(p => p.id !== paymentId));
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

  const filteredPurchases = purchases.filter(purchase => {
    const matchesSearch = purchase.purchase_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPurchases = purchases.length;
  const draftPurchases = purchases.filter(p => p.status === 'draft').length;
  const orderedPurchases = purchases.filter(p => p.status === 'ordered').length;
  const receivedPurchases = purchases.filter(p => p.status === 'received').length;

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
          <p className="text-muted-foreground">Manage purchase orders, receiving, and supplier relationships</p>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPurchases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Draft Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{draftPurchases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orderedPurchases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Received Orders</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{receivedPurchases}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Purchase Orders</CardTitle>
              <CardDescription>Latest purchase orders and their status</CardDescription>
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
                  {purchases.slice(0, 5).map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.supplier_name}</TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell>${purchase.total_amount.toFixed(2)}</TableCell>
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Orders
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
                          <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name} {supplier.company && `(${supplier.company})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="expectedDate">Expected Date</Label>
                          <Input
                            id="expectedDate"
                            type="date"
                            value={formData.expected_date}
                            onChange={(e) => setFormData({...formData, expected_date: e.target.value})}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Items *</Label>
                        <div className="space-y-3 border rounded-lg p-4">
                          {selectedItems.map((item, index) => (
                            <div key={index} className="grid grid-cols-5 gap-2 items-end">
                              <div>
                                <Select 
                                  value={item.product_id} 
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
                              <div>
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                  min="1"
                                />
                              </div>
                              <div>
                                <Input
                                  type="number"
                                  placeholder="Unit Cost"
                                  value={item.unit_cost}
                                  onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                                  step="0.01"
                                />
                              </div>
                              <div>
                                <Input
                                  value={`$${(item.quantity * item.unit_cost).toFixed(2)}`}
                                  disabled
                                />
                              </div>
                              <div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  disabled={selectedItems.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button variant="outline" onClick={addItem} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                          <div className="flex justify-end">
                            <div className="text-lg font-semibold">
                              Total: ${selectedItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0).toFixed(2)}
                            </div>
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
                      <TableCell>${purchase.total_amount.toFixed(2)}</TableCell>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReceiveDialog(purchase)}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Receive
                            </Button>
                          )}
                          {(purchase.status === 'ordered' || purchase.status === 'received') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentDialog(purchase)}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Payment
                            </Button>
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
              <CardDescription>Orders waiting to be received</CardDescription>
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
                  {purchases.filter(p => p.status === 'ordered').map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>{purchase.supplier_name}</TableCell>
                      <TableCell>{new Date(purchase.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(purchase.expected_date).toLocaleDateString()}</TableCell>
                      <TableCell>${purchase.total_amount.toFixed(2)}</TableCell>
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
                <CardDescription>Overview of purchase activities</CardDescription>
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
                      ${purchases.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Order Value:</span>
                    <span className="font-semibold">
                      ${totalPurchases > 0 ? (purchases.reduce((sum, p) => sum + p.total_amount, 0) / totalPurchases).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Suppliers</CardTitle>
                <CardDescription>Suppliers by order volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suppliers.slice(0, 5).map((supplier, index) => (
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
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
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