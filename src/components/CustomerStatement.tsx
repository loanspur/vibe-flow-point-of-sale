import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface CustomerStatementProps {
  customerId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StatementTransaction {
  id: string;
  date: string;
  type: 'sale' | 'payment' | 'credit' | 'refund';
  description: string;
  amount: number;
  balance: number;
  reference: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  credit_limit: number;
  current_credit_balance: number;
}

export function CustomerStatement({ customerId, isOpen, onClose }: CustomerStatementProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen && customerId && tenantId) {
      fetchCustomerInfo();
      fetchTransactions();
    }
  }, [isOpen, customerId, tenantId, dateRange]);

  const fetchCustomerInfo = async () => {
    if (!customerId || !tenantId) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, credit_limit, current_credit_balance')
        .eq('id', customerId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer info:', error);
      toast({
        title: "Error",
        description: "Failed to load customer information",
        variant: "destructive",
      });
    }
  };

  const fetchTransactions = async () => {
    if (!customerId || !tenantId) return;

    setLoading(true);
    try {
      // Fetch sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          receipt_number,
          total_amount,
          created_at,
          payment_method,
          status
        `)
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Fetch payments
      const { data: payments, error: paymentsError } = await supabase
        .from('ar_ap_payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          notes
        `)
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)
        .gte('payment_date', dateRange.start)
        .lte('payment_date', dateRange.end + 'T23:59:59')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Combine and format transactions
      const formattedTransactions: StatementTransaction[] = [];

      // Add sales
      sales?.forEach(sale => {
        formattedTransactions.push({
          id: sale.id,
          date: sale.created_at,
          type: 'sale',
          description: `Sale ${sale.receipt_number}`,
          amount: sale.total_amount,
          balance: 0, // Will be calculated
          reference: sale.receipt_number
        });
      });

      // Add payments
      payments?.forEach(payment => {
        formattedTransactions.push({
          id: payment.id,
          date: payment.payment_date,
          type: 'payment',
          description: `Payment - ${payment.notes || payment.payment_method}`,
          amount: -payment.amount, // Negative for payments
          balance: 0, // Will be calculated
          reference: payment.reference_number
        });
      });

      // Sort by date and calculate running balance
      formattedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let runningBalance = customer?.current_credit_balance || 0;
      formattedTransactions.forEach(transaction => {
        runningBalance += transaction.amount;
        transaction.balance = runningBalance;
      });

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'payment': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'credit': return <DollarSign className="h-4 w-4 text-blue-500" />;
      case 'refund': return <TrendingDown className="h-4 w-4 text-orange-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      sale: "destructive",
      payment: "default",
      credit: "secondary",
      refund: "outline"
    };
    return <Badge variant={variants[type] || "outline"}>{type.toUpperCase()}</Badge>;
  };

  const exportStatement = () => {
    if (!customer) return;

    const csvContent = [
      ['Date', 'Type', 'Description', 'Amount', 'Balance', 'Reference'].join(','),
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.description,
        formatCurrency(t.amount),
        formatCurrency(t.balance),
        t.reference
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-statement-${customer.name}-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Customer Statement - {customer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credit Limit</p>
                  <p className="font-medium">{formatCurrency(customer.credit_limit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className={`font-medium ${customer.current_credit_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.current_credit_balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Range Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium">From:</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="ml-2 px-2 py-1 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">To:</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="ml-2 px-2 py-1 border rounded"
                  />
                </div>
                <Button onClick={exportStatement} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>

              {/* Transactions Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading transactions...
                        </TableCell>
                      </TableRow>
                    ) : transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transactions found for the selected date range
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.type)}
                              {new Date(transaction.date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{getTransactionBadge(transaction.type)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className={`text-right font-medium ${transaction.amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${transaction.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(transaction.balance)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
