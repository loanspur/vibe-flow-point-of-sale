import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  X, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign,
  FileText,
  Package,
  ShoppingCart,
  Building2,
  Phone,
  Mail,
  MapPin,
  Users
} from 'lucide-react';
import ContactStatement from './ContactStatement';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  type: string;
  notes: string;
  is_active: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  number: string;
  date: string;
  total_amount: number;
  status: string;
  type: 'sale' | 'purchase';
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string;
  type: 'receivable' | 'payable';
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  notes: string;
  type: 'receivable' | 'payable';
}

interface ContactDetailsProps {
  contact: Contact;
  isOpen: boolean;
  onClose: () => void;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({ contact, isOpen, onClose }) => {
  const { tenantId } = useAuth();
  const { tenantCurrency } = useApp();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalPurchases: 0,
    totalReceivable: 0,
    totalPayable: 0,
    totalPaid: 0
  });
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  useEffect(() => {
    if (isOpen && contact.id) {
      fetchContactData();
    }
  }, [isOpen, contact.id, tenantId]);

  const fetchContactData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTransactions(),
        fetchInvoices(),
        fetchPayments()
      ]);
    } catch (error) {
      toast.error('Failed to load contact details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const transactions: Transaction[] = [];
      
      if (contact.type === 'customer') {
        // Fetch sales for this customer
        const { data: sales, error: salesError } = await supabase
          .from('sales')
          .select('id, receipt_number, created_at, total_amount, status')
          .eq('tenant_id', tenantId)
          .eq('customer_id', contact.id)
          .order('created_at', { ascending: false });

        if (salesError) throw salesError;

        sales?.forEach(sale => {
          transactions.push({
            id: sale.id,
            number: sale.receipt_number,
            date: sale.created_at,
            total_amount: sale.total_amount,
            status: sale.status,
            type: 'sale'
          });
        });
      }

      if (contact.type === 'supplier') {
        // Fetch purchases for this supplier
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases')
          .select('id, purchase_number, created_at, total_amount, status')
          .eq('tenant_id', tenantId)
          .eq('supplier_id', contact.id)
          .order('created_at', { ascending: false });

        if (purchasesError) throw purchasesError;

        purchases?.forEach(purchase => {
          transactions.push({
            id: purchase.id,
            number: purchase.purchase_number,
            date: purchase.created_at,
            total_amount: purchase.total_amount,
            status: purchase.status,
            type: 'purchase'
          });
        });
      }

      setTransactions(transactions);
      
      // Calculate summary
      const totalSales = transactions
        .filter(t => t.type === 'sale')
        .reduce((sum, t) => sum + t.total_amount, 0);
      
      const totalPurchases = transactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + t.total_amount, 0);

      setSummary(prev => ({
        ...prev,
        totalSales,
        totalPurchases
      }));

    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const invoices: Invoice[] = [];
      
      if (contact.type === 'customer') {
        // Fetch accounts receivable for this customer
        const { data: receivables, error: receivablesError } = await supabase
          .from('accounts_receivable')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('customer_id', contact.id)
          .order('invoice_date', { ascending: false });

        if (receivablesError) throw receivablesError;

        receivables?.forEach(receivable => {
          invoices.push({
            id: receivable.id,
            invoice_number: receivable.invoice_number,
            invoice_date: receivable.invoice_date,
            due_date: receivable.due_date,
            original_amount: receivable.original_amount,
            paid_amount: receivable.paid_amount,
            outstanding_amount: receivable.outstanding_amount,
            status: receivable.status,
            type: 'receivable'
          });
        });
      }

      if (contact.type === 'supplier') {
        // Fetch accounts payable for this supplier
        const { data: payables, error: payablesError } = await supabase
          .from('accounts_payable')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('supplier_id', contact.id)
          .order('invoice_date', { ascending: false });

        if (payablesError) throw payablesError;

        payables?.forEach(payable => {
          invoices.push({
            id: payable.id,
            invoice_number: payable.invoice_number,
            invoice_date: payable.invoice_date,
            due_date: payable.due_date,
            original_amount: payable.original_amount,
            paid_amount: payable.paid_amount,
            outstanding_amount: payable.outstanding_amount,
            status: payable.status,
            type: 'payable'
          });
        });
      }

      setInvoices(invoices);

      // Update summary
      const totalReceivable = invoices
        .filter(i => i.type === 'receivable')
        .reduce((sum, i) => sum + i.outstanding_amount, 0);
      
      const totalPayable = invoices
        .filter(i => i.type === 'payable')
        .reduce((sum, i) => sum + i.outstanding_amount, 0);

      setSummary(prev => ({
        ...prev,
        totalReceivable,
        totalPayable
      }));

    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const payments: Payment[] = [];
      
      if (contact.type === 'customer') {
        // Fetch payments for receivables
        const { data: receivablePayments, error: receivablePaymentsError } = await supabase
          .from('ar_ap_payments')
          .select(`
            *,
            accounts_receivable!inner(customer_id)
          `)
          .eq('tenant_id', tenantId)
          .eq('payment_type', 'receivable')
          .eq('accounts_receivable.customer_id', contact.id)
          .order('payment_date', { ascending: false });

        if (receivablePaymentsError) throw receivablePaymentsError;

        receivablePayments?.forEach(payment => {
          payments.push({
            id: payment.id,
            payment_date: payment.payment_date,
            amount: payment.amount,
            payment_method: payment.payment_method,
            reference_number: payment.reference_number || '',
            notes: payment.notes || '',
            type: 'receivable'
          });
        });
      }

      if (contact.type === 'supplier') {
        // Fetch payments for payables
        const { data: payablePayments, error: payablePaymentsError } = await supabase
          .from('ar_ap_payments')
          .select(`
            *,
            accounts_payable!inner(supplier_id)
          `)
          .eq('tenant_id', tenantId)
          .eq('payment_type', 'payable')
          .eq('accounts_payable.supplier_id', contact.id)
          .order('payment_date', { ascending: false });

        if (payablePaymentsError) throw payablePaymentsError;

        payablePayments?.forEach(payment => {
          payments.push({
            id: payment.id,
            payment_date: payment.payment_date,
            amount: payment.amount,
            payment_method: payment.payment_method,
            reference_number: payment.reference_number || '',
            notes: payment.notes || '',
            type: 'payable'
          });
        });
      }

      setPayments(payments);

      // Update summary
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      setSummary(prev => ({
        ...prev,
        totalPaid
      }));

    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'paid': 'default',
      'completed': 'default',
      'outstanding': 'secondary',
      'overdue': 'destructive',
      'partial': 'outline',
      'draft': 'outline',
      'pending': 'outline'
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: tenantCurrency || 'USD'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {contact.type === 'customer' ? (
                <Users className="h-6 w-6 text-primary" />
              ) : (
                <Building2 className="h-6 w-6 text-primary" />
              )}
              {contact.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {(contact.type === 'customer' || contact.type === 'supplier') && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsStatementOpen(true)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Generate Statement
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {contact.company && (
                    <div>
                      <span className="font-medium">Company: </span>
                      <span>{contact.company}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Type: </span>
                    <Badge variant="secondary">{contact.type}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Member Since: </span>
                    <span>{format(new Date(contact.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
              {contact.notes && (
                <div className="mt-4">
                  <span className="font-medium">Notes: </span>
                  <p className="text-muted-foreground mt-1">{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {contact.type === 'customer' && (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="font-semibold">{formatCurrency(summary.totalSales)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding</p>
                        <p className="font-semibold">{formatCurrency(summary.totalReceivable)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            
            {contact.type === 'supplier' && (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Purchases</p>
                        <p className="font-semibold">{formatCurrency(summary.totalPurchases)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding</p>
                        <p className="font-semibold">{formatCurrency(summary.totalPayable)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="font-semibold">{formatCurrency(summary.totalPaid)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="transactions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="transactions">
                {contact.type === 'customer' ? 'Sales' : 'Purchases'} ({transactions.length})
              </TabsTrigger>
              <TabsTrigger value="invoices">
                Invoices ({invoices.length})
              </TabsTrigger>
              <TabsTrigger value="payments">
                Payments ({payments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {contact.type === 'customer' ? (
                      <ShoppingCart className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                    {contact.type === 'customer' ? 'Sales History' : 'Purchase History'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : transactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Number</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">
                              {transaction.number}
                            </TableCell>
                            <TableCell>
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(transaction.total_amount)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(transaction.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No {contact.type === 'customer' ? 'sales' : 'purchases'} found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    {contact.type === 'customer' ? 'Receivables' : 'Payables'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : invoices.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Invoice Date</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Original Amount</TableHead>
                          <TableHead>Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(invoice.original_amount)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(invoice.outstanding_amount)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(invoice.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : payments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {payment.reference_number || '-'}
                            </TableCell>
                            <TableCell>
                              {payment.notes || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No payments found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Contact Statement Dialog */}
        <ContactStatement
          contact={contact}
          isOpen={isStatementOpen}
          onClose={() => setIsStatementOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetails;