import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { createPaymentJournalEntry } from '@/lib/accounting-integration';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign,
  Calendar,
  Users,
  Building2,
  FileText,
  Search,
  Filter,
  Download
} from 'lucide-react';

interface AccountsReceivable {
  id: string;
  customer_id: string;
  customer_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'outstanding' | 'paid' | 'overdue' | 'partial';
  reference_type: string;
  reference_id: string;
  notes: string;
  days_overdue: number;
}

interface AccountsPayable {
  id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'outstanding' | 'paid' | 'overdue' | 'partial';
  reference_type: string;
  reference_id: string;
  notes: string;
  days_overdue: number;
}

interface AgingAnalysis {
  current_amount: number;
  days_30_amount: number;
  days_60_amount: number;
  days_90_amount: number;
  days_over_90_amount: number;
  total_amount: number;
}

interface PaymentRecord {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  notes: string;
}

const AccountsReceivablePayable: React.FC = () => {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();

  // State management
  const [activeTab, setActiveTab] = useState('make-payments');
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [receivableAging, setReceivableAging] = useState<AgingAnalysis | null>(null);
  const [payableAging, setPayableAging] = useState<AgingAnalysis | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [isAddReceivableOpen, setIsAddReceivableOpen] = useState(false);
  const [isAddPayableOpen, setIsAddPayableOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [recordType, setRecordType] = useState<'receivable' | 'payable'>('receivable');

  // Form states
  const [newReceivable, setNewReceivable] = useState({
    customer_id: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    original_amount: 0,
    reference_type: 'sale',
    reference_id: '',
    notes: ''
  });

  const [newPayable, setNewPayable] = useState({
    supplier_id: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    original_amount: 0,
    reference_type: 'purchase',
    reference_id: '',
    notes: ''
  });

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  const [newPayment, setNewPayment] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  // Fetch data functions
  const fetchReceivables = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts_receivable')
        .select(`
          *,
          customers(name)
        `)
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        customer_name: item.customers?.name || 'Unknown Customer',
        days_overdue: Math.max(0, Math.floor((new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))),
        status: item.status as 'outstanding' | 'paid' | 'overdue' | 'partial',
        notes: item.notes || ''
      })) || [];

      setReceivables(formattedData);
    } catch (error) {
      console.error('Error fetching receivables:', error);
      toast({ title: "Error", description: "Failed to fetch receivables", variant: "destructive" });
    }
  };

  const fetchPayables = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts_payable')
        .select(`
          *,
          contacts(name)
        `)
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        supplier_name: item.contacts?.name || 'Unknown Supplier',
        days_overdue: Math.max(0, Math.floor((new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))),
        status: item.status as 'outstanding' | 'paid' | 'overdue' | 'partial',
        notes: item.notes || ''
      })) || [];

      setPayables(formattedData);
    } catch (error) {
      console.error('Error fetching payables:', error);
      toast({ title: "Error", description: "Failed to fetch payables", variant: "destructive" });
    }
  };

  const fetchAgingAnalysis = async () => {
    try {
      const [receivableResult, payableResult] = await Promise.all([
        supabase.rpc('calculate_aging_analysis', {
          tenant_id_param: tenantId,
          analysis_type: 'receivable'
        }),
        supabase.rpc('calculate_aging_analysis', {
          tenant_id_param: tenantId,
          analysis_type: 'payable'
        })
      ]);

      if (receivableResult.error) throw receivableResult.error;
      if (payableResult.error) throw payableResult.error;

      setReceivableAging(receivableResult.data?.[0] || null);
      setPayableAging(payableResult.data?.[0] || null);
    } catch (error) {
      console.error('Error fetching aging analysis:', error);
      toast({ title: "Error", description: "Failed to fetch aging analysis", variant: "destructive" });
    }
  };

  const fetchCustomersAndSuppliers = async () => {
    try {
      const [customersResult, suppliersResult] = await Promise.all([
        supabase.from('customers').select('id, name').eq('tenant_id', tenantId),
        supabase.from('contacts').select('id, name').eq('tenant_id', tenantId).eq('type', 'supplier')
      ]);

      if (customersResult.data) setCustomers(customersResult.data);
      if (suppliersResult.data) setSuppliers(suppliersResult.data);
    } catch (error) {
      console.error('Error fetching customers/suppliers:', error);
    }
  };

  const fetchSalesAndPurchases = async () => {
    try {
      const [salesResult, purchasesResult] = await Promise.all([
        supabase.from('sales').select(`
          id, 
          receipt_number, 
          total_amount, 
          created_at, 
          customer_id,
          customers(name)
        `).eq('tenant_id', tenantId).eq('status', 'completed'),
        supabase.from('purchases').select(`
          id, 
          purchase_number, 
          total_amount, 
          created_at, 
          supplier_id,
          contacts(name)
        `).eq('tenant_id', tenantId).eq('status', 'received')
      ]);

      if (salesResult.data) {
        setSales(salesResult.data.map(sale => ({
          ...sale,
          customer_name: sale.customers?.name || 'Walk-in Customer'
        })));
      }

      if (purchasesResult.data) {
        setPurchases(purchasesResult.data.map(purchase => ({
          ...purchase,
          supplier_name: purchase.contacts?.name || 'Unknown Supplier'
        })));
      }
    } catch (error) {
      console.error('Error fetching sales/purchases:', error);
    }
  };

  // CRUD operations
  const createReceivable = async () => {
    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .insert({
          ...newReceivable,
          tenant_id: tenantId,
          outstanding_amount: newReceivable.original_amount
        });

      if (error) throw error;

      toast({ title: "Success", description: "Receivable created successfully" });
      setIsAddReceivableOpen(false);
      resetReceivableForm();
      fetchReceivables();
    } catch (error) {
      console.error('Error creating receivable:', error);
      toast({ title: "Error", description: "Failed to create receivable", variant: "destructive" });
    }
  };

  const createPayable = async () => {
    try {
      const { error } = await supabase
        .from('accounts_payable')
        .insert({
          ...newPayable,
          tenant_id: tenantId,
          outstanding_amount: newPayable.original_amount
        });

      if (error) throw error;

      toast({ title: "Success", description: "Payable created successfully" });
      setIsAddPayableOpen(false);
      resetPayableForm();
      fetchPayables();
    } catch (error) {
      console.error('Error creating payable:', error);
      toast({ title: "Error", description: "Failed to create payable", variant: "destructive" });
    }
  };

  const recordPayment = async () => {
    try {
      const { data: payment, error } = await supabase
        .from('ar_ap_payments')
        .insert({
          tenant_id: tenantId,
          payment_type: recordType,
          reference_id: selectedRecord.id,
          payment_date: newPayment.payment_date,
          amount: newPayment.amount,
          payment_method: newPayment.payment_method,
          reference_number: newPayment.reference_number,
          notes: newPayment.notes
        })
        .select()
        .single();

      if (error) throw error;

      // Create accounting journal entry for the payment
      try {
        await createPaymentJournalEntry(tenantId, {
          paymentId: payment.id,
          amount: newPayment.amount,
          paymentType: recordType,
          paymentMethod: newPayment.payment_method,
          referenceId: selectedRecord.id,
          createdBy: user?.id || ''
        });
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        // Don't fail the payment if accounting fails
        toast({ title: "Warning", description: "Payment recorded but accounting entry failed", variant: "destructive" });
      }

      // Update credit sale status if this is a receivable payment
      if (recordType === 'receivable' && selectedRecord.reference_type === 'sale') {
        try {
          // Get updated AR record to check if fully paid
          const { data: updatedAR, error: arError } = await supabase
            .from('accounts_receivable')
            .select('status, reference_id')
            .eq('id', selectedRecord.id)
            .single();

          if (!arError && updatedAR && updatedAR.status === 'paid') {
            // Update sale status to paid
            const { error: saleUpdateError } = await supabase
              .from('sales')
              .update({ status: 'paid' })
              .eq('id', updatedAR.reference_id);

            if (saleUpdateError) {
              console.error('Error updating sale status:', saleUpdateError);
            }
          }
        } catch (statusUpdateError) {
          console.error('Error updating credit sale status:', statusUpdateError);
          // Don't fail the payment if status update fails
        }
      }

      toast({ title: "Success", description: "Payment recorded successfully" });
      setIsPaymentOpen(false);
      resetPaymentForm();
      fetchReceivables();
      fetchPayables();
      fetchAgingAnalysis();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
    }
  };

  // Helper functions
  const resetReceivableForm = () => {
    setNewReceivable({
      customer_id: '',
      invoice_number: '',
      invoice_date: '',
      due_date: '',
      original_amount: 0,
      reference_type: 'sale',
      reference_id: '',
      notes: ''
    });
    setSelectedSale(null);
  };

  const resetPayableForm = () => {
    setNewPayable({
      supplier_id: '',
      invoice_number: '',
      invoice_date: '',
      due_date: '',
      original_amount: 0,
      reference_type: 'purchase',
      reference_id: '',
      notes: ''
    });
    setSelectedPurchase(null);
  };

  const handleSaleSelection = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setSelectedSale(sale);
      setNewReceivable(prev => ({
        ...prev,
        customer_id: sale.customer_id || '',
        invoice_number: sale.receipt_number,
        invoice_date: sale.created_at.split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        original_amount: sale.total_amount,
        reference_type: 'sale',
        reference_id: saleId
      }));
    }
  };

  const handlePurchaseSelection = (purchaseId: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (purchase) {
      setSelectedPurchase(purchase);
      setNewPayable(prev => ({
        ...prev,
        supplier_id: purchase.supplier_id || '',
        invoice_number: purchase.purchase_number,
        invoice_date: purchase.created_at.split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        original_amount: purchase.total_amount,
        reference_type: 'purchase',
        reference_id: purchaseId
      }));
    }
  };

  const resetPaymentForm = () => {
    setNewPayment({
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    if (status === 'paid') {
      return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    } else if (status === 'overdue' || daysOverdue > 0) {
      return <Badge className="bg-red-500 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
    } else if (status === 'partial') {
      return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
    } else {
      return <Badge className="bg-blue-500 text-white"><Clock className="w-3 h-3 mr-1" />Outstanding</Badge>;
    }
  };

  const openPaymentDialog = (record: any, type: 'receivable' | 'payable') => {
    setSelectedRecord(record);
    setRecordType(type);
    setNewPayment(prev => ({ ...prev, amount: record.outstanding_amount }));
    setIsPaymentOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTransactionReference = (referenceType: string, referenceId: string) => {
    if (!referenceId) return '-';
    
    if (referenceType === 'sale') {
      const sale = sales.find(s => s.id === referenceId);
      return sale ? sale.receipt_number : '-';
    } else if (referenceType === 'purchase') {
      const purchase = purchases.find(p => p.id === referenceId);
      return purchase ? purchase.purchase_number : '-';
    }
    
    return '-';
  };

  const filteredReceivables = receivables.filter(receivable => {
    const matchesSearch = receivable.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receivable.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receivable.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPayables = payables.filter(payable => {
    const matchesSearch = payable.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payable.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payable.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Load data on component mount
  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      Promise.all([
        fetchReceivables(),
        fetchPayables(),
        fetchAgingAnalysis(),
        fetchCustomersAndSuppliers(),
        fetchSalesAndPurchases()
      ]).finally(() => setLoading(false));
    }
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accounts Receivable & Payable</h2>
          <p className="text-muted-foreground">Manage outstanding invoices and aging analysis</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddReceivableOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Receivable
          </Button>
          <Button onClick={() => setIsAddPayableOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Payable
          </Button>
        </div>
      </div>

      {/* Aging Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Accounts Receivable Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            {receivableAging && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current (0-30 days)</span>
                  <span className="font-medium">{formatCurrency(receivableAging.current_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">31-60 days</span>
                  <span className="font-medium">{formatCurrency(receivableAging.days_30_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">61-90 days</span>
                  <span className="font-medium">{formatCurrency(receivableAging.days_60_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">90+ days</span>
                  <span className="font-medium text-red-600">{formatCurrency(receivableAging.days_over_90_amount)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold">
                    <span>Total Outstanding</span>
                    <span>{formatCurrency(receivableAging.total_amount)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Accounts Payable Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payableAging && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current (0-30 days)</span>
                  <span className="font-medium">{formatCurrency(payableAging.current_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">31-60 days</span>
                  <span className="font-medium">{formatCurrency(payableAging.days_30_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">61-90 days</span>
                  <span className="font-medium">{formatCurrency(payableAging.days_60_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">90+ days</span>
                  <span className="font-medium text-red-600">{formatCurrency(payableAging.days_over_90_amount)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold">
                    <span>Total Outstanding</span>
                    <span>{formatCurrency(payableAging.total_amount)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, supplier, or invoice number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="make-payments">Make Payments</TabsTrigger>
          <TabsTrigger value="receivables">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="payables">Accounts Payable</TabsTrigger>
        </TabsList>

        <TabsContent value="make-payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                Make Payments on Credit Sales
              </CardTitle>
              <CardDescription>
                Process payments for outstanding credit sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredReceivables.filter(r => r.status !== 'paid').length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No Outstanding Credit Sales</p>
                    <p className="text-muted-foreground">All credit sales have been paid in full.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Original Amount</TableHead>
                          <TableHead>Paid Amount</TableHead>
                          <TableHead>Outstanding</TableHead>
                          <TableHead>Days Overdue</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReceivables
                          .filter(receivable => receivable.status !== 'paid')
                          .sort((a, b) => {
                            // Sort by overdue first, then by due date
                            if (a.days_overdue !== b.days_overdue) {
                              return b.days_overdue - a.days_overdue;
                            }
                            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                          })
                          .map((receivable) => (
                            <TableRow key={receivable.id} className={receivable.days_overdue > 0 ? "bg-red-50" : ""}>
                              <TableCell className="font-medium">{receivable.invoice_number}</TableCell>
                              <TableCell>{receivable.customer_name}</TableCell>
                              <TableCell>{format(new Date(receivable.invoice_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>{format(new Date(receivable.due_date), 'MMM d, yyyy')}</TableCell>
                              <TableCell>{formatCurrency(receivable.original_amount)}</TableCell>
                              <TableCell>{formatCurrency(receivable.paid_amount)}</TableCell>
                              <TableCell className="font-semibold text-orange-600">
                                {formatCurrency(receivable.outstanding_amount)}
                              </TableCell>
                              <TableCell>
                                {receivable.days_overdue > 0 ? (
                                  <Badge variant="destructive">{receivable.days_overdue} days</Badge>
                                ) : (
                                  <Badge variant="secondary">Current</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(receivable.status, receivable.days_overdue)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  onClick={() => openPaymentDialog(receivable, 'receivable')}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Pay Now
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable</CardTitle>
              <CardDescription>Outstanding invoices from customers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Original Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivables.map((receivable) => (
                    <TableRow key={receivable.id}>
                      <TableCell>{receivable.customer_name}</TableCell>
                      <TableCell>{receivable.invoice_number}</TableCell>
                      <TableCell>{getTransactionReference(receivable.reference_type, receivable.reference_id)}</TableCell>
                      <TableCell>{format(new Date(receivable.invoice_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(receivable.due_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{formatCurrency(receivable.original_amount)}</TableCell>
                      <TableCell>{formatCurrency(receivable.outstanding_amount)}</TableCell>
                      <TableCell>{getStatusBadge(receivable.status, receivable.days_overdue)}</TableCell>
                      <TableCell>
                        {receivable.outstanding_amount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(receivable, 'receivable')}
                          >
                            Record Payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Payable</CardTitle>
              <CardDescription>Outstanding invoices to suppliers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Original Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayables.map((payable) => (
                    <TableRow key={payable.id}>
                      <TableCell>{payable.supplier_name}</TableCell>
                      <TableCell>{payable.invoice_number}</TableCell>
                      <TableCell>{getTransactionReference(payable.reference_type, payable.reference_id)}</TableCell>
                      <TableCell>{format(new Date(payable.invoice_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(payable.due_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{formatCurrency(payable.original_amount)}</TableCell>
                      <TableCell>{formatCurrency(payable.outstanding_amount)}</TableCell>
                      <TableCell>{getStatusBadge(payable.status, payable.days_overdue)}</TableCell>
                      <TableCell>
                        {payable.outstanding_amount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(payable, 'payable')}
                          >
                            Record Payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Receivable Dialog */}
      <Dialog open={isAddReceivableOpen} onOpenChange={setIsAddReceivableOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Receivable</DialogTitle>
            <DialogDescription>Create a new accounts receivable record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quick Link Section */}
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Link to Existing Sale</Label>
              <p className="text-sm text-muted-foreground mb-2">Select a completed sale to auto-populate the form</p>
              <Select value={selectedSale?.id || ''} onValueChange={handleSaleSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sale to link" />
                </SelectTrigger>
                <SelectContent>
                  {sales.map(sale => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.receipt_number} - {sale.customer_name} - {formatCurrency(sale.total_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Customer</Label>
                <Select value={newReceivable.customer_id} onValueChange={(value) => setNewReceivable(prev => ({ ...prev, customer_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice-number">Invoice Number</Label>
                <Input
                  id="invoice-number"
                  value={newReceivable.invoice_number}
                  onChange={(e) => setNewReceivable(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="INV-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={newReceivable.invoice_date}
                  onChange={(e) => setNewReceivable(prev => ({ ...prev, invoice_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newReceivable.due_date}
                  onChange={(e) => setNewReceivable(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newReceivable.original_amount}
                  onChange={(e) => setNewReceivable(prev => ({ ...prev, original_amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="reference-type">Reference Type</Label>
                <Select value={newReceivable.reference_type} onValueChange={(value) => setNewReceivable(prev => ({ ...prev, reference_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newReceivable.notes}
                onChange={(e) => setNewReceivable(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddReceivableOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createReceivable}>
                Create Receivable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Payable Dialog */}
      <Dialog open={isAddPayableOpen} onOpenChange={setIsAddPayableOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Payable</DialogTitle>
            <DialogDescription>Create a new accounts payable record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Quick Link Section */}
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Link to Existing Purchase</Label>
              <p className="text-sm text-muted-foreground mb-2">Select a received purchase to auto-populate the form</p>
              <Select value={selectedPurchase?.id || ''} onValueChange={handlePurchaseSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a purchase to link" />
                </SelectTrigger>
                <SelectContent>
                  {purchases.map(purchase => (
                    <SelectItem key={purchase.id} value={purchase.id}>
                      {purchase.purchase_number} - {purchase.supplier_name} - {formatCurrency(purchase.total_amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Select value={newPayable.supplier_id} onValueChange={(value) => setNewPayable(prev => ({ ...prev, supplier_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice-number">Invoice Number</Label>
                <Input
                  id="invoice-number"
                  value={newPayable.invoice_number}
                  onChange={(e) => setNewPayable(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="INV-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-date">Invoice Date</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={newPayable.invoice_date}
                  onChange={(e) => setNewPayable(prev => ({ ...prev, invoice_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newPayable.due_date}
                  onChange={(e) => setNewPayable(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={newPayable.original_amount}
                  onChange={(e) => setNewPayable(prev => ({ ...prev, original_amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="reference-type">Reference Type</Label>
                <Select value={newPayable.reference_type} onValueChange={(value) => setNewPayable(prev => ({ ...prev, reference_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newPayable.notes}
                onChange={(e) => setNewPayable(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddPayableOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createPayable}>
                Create Payable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedRecord?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Outstanding Amount:</span>
                <span className="font-medium">{formatCurrency(selectedRecord?.outstanding_amount || 0)}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={newPayment.payment_date}
                onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="payment-amount">Payment Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={newPayment.payment_method} onValueChange={(value) => setNewPayment(prev => ({ ...prev, payment_method: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reference-number">Reference Number</Label>
              <Input
                id="reference-number"
                value={newPayment.reference_number}
                onChange={(e) => setNewPayment(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Check #, Transaction ID, etc."
              />
            </div>
            <div>
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Payment notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
                Cancel
              </Button>
              <Button onClick={recordPayment}>
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsReceivablePayable;