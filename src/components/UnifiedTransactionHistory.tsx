import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Clock, DollarSign, Eye, Building2, CreditCard, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UnifiedTransaction {
  id: string;
  transaction_number: string;
  description: string;
  transaction_date: string;
  amount: number;
  payment_method: string;
  posted_by_name: string;
  posted_by_id: string;
  type: 'accounting' | 'cash';
  status: string;
  reference_type?: string;
  reference_id?: string;
}

interface UnifiedTransactionHistoryProps {
  title?: string;
  filterType?: 'all' | 'accounting' | 'cash';
  showFilters?: boolean;
  limit?: number;
}

export function UnifiedTransactionHistory({ 
  title = "Recent Transactions",
  filterType = 'all',
  showFilters = true,
  limit = 10
}: UnifiedTransactionHistoryProps) {
  const { tenantId } = useAuth();
  const { formatCurrency } = useApp();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'accounting' | 'cash'>(filterType);
  const [period, setPeriod] = useState('7d'); // 7d, 30d, 90d, all

  const fetchTransactions = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const dateFilter = getPeriodFilter();
      const allTransactions: UnifiedTransaction[] = [];

      // Fetch accounting transactions if needed
      if (selectedFilter === 'all' || selectedFilter === 'accounting') {
        const { data: accountingTxns, error: accError } = await supabase
          .from('accounting_transactions')
          .select(`
            id,
            transaction_number,
            description,
            transaction_date,
            total_amount,
            is_posted,
            reference_type,
            reference_id,
            created_by
          `)
          .eq('tenant_id', tenantId)
          .gte('transaction_date', dateFilter)
          .order('transaction_date', { ascending: false })
          .limit(selectedFilter === 'accounting' ? limit : Math.floor(limit / 2));

        if (accError) throw accError;

        const formattedAccounting = accountingTxns?.map(txn => ({
          id: txn.id,
          transaction_number: txn.transaction_number,
          description: txn.description,
          transaction_date: txn.transaction_date,
          amount: txn.total_amount,
          payment_method: 'Journal Entry',
          posted_by_name: 'System',
          posted_by_id: txn.created_by,
          type: 'accounting' as const,
          status: txn.is_posted ? 'Posted' : 'Draft',
          reference_type: txn.reference_type,
          reference_id: txn.reference_id
        })) || [];

        allTransactions.push(...formattedAccounting);
      }

      // Fetch cash transactions if needed
      if (selectedFilter === 'all' || selectedFilter === 'cash') {
        const { data: cashTxns, error: cashError } = await supabase
          .from('cash_transactions')
          .select(`
            id,
            transaction_type,
            description,
            transaction_date,
            amount,
            reference_type,
            reference_id,
            performed_by
          `)
          .eq('tenant_id', tenantId)
          .gte('transaction_date', dateFilter)
          .order('transaction_date', { ascending: false })
          .limit(selectedFilter === 'cash' ? limit : Math.floor(limit / 2));

        if (cashError) throw cashError;

        const formattedCash = cashTxns?.map(txn => ({
          id: txn.id,
          transaction_number: `CASH-${txn.id.substring(0, 8)}`,
          description: txn.description,
          transaction_date: txn.transaction_date,
          amount: txn.amount,
          payment_method: getPaymentMethodForCashTransaction(txn.transaction_type),
          posted_by_name: 'System',
          posted_by_id: txn.performed_by,
          type: 'cash' as const,
          status: 'Posted',
          reference_type: txn.reference_type,
          reference_id: txn.reference_id
        })) || [];

        allTransactions.push(...formattedCash);
      }

      // Sort by date and limit
      const sortedTransactions = allTransactions
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, limit);

      setTransactions(sortedTransactions);
    } catch (error) {
      console.error('Error fetching unified transactions:', error);
      toast({ title: "Error", description: "Failed to fetch transactions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getPeriodFilter = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return sevenDaysAgo.toISOString().split('T')[0];
      case '30d':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return thirtyDaysAgo.toISOString().split('T')[0];
      case '90d':
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return ninetyDaysAgo.toISOString().split('T')[0];
      default:
        return '1900-01-01'; // All time
    }
  };

  const getPaymentMethodForCashTransaction = (transactionType: string) => {
    switch (transactionType) {
      case 'sale_payment': return 'Cash Sale';
      case 'bank_deposit': return 'Bank Transfer';
      case 'expense_payment': return 'Cash Payment';
      case 'transfer_out': return 'Cash Transfer';
      case 'transfer_in': return 'Cash Transfer';
      case 'adjustment': return 'Cash Adjustment';
      default: return 'Cash';
    }
  };

  const getTransactionIcon = (type: string, transactionType?: string) => {
    if (type === 'accounting') return <Building2 className="h-4 w-4" />;
    if (transactionType === 'sale_payment') return <DollarSign className="h-4 w-4" />;
    if (transactionType === 'bank_deposit') return <Building2 className="h-4 w-4" />;
    return <CreditCard className="h-4 w-4" />;
  };

  const getAmountColor = (amount: number, type: string) => {
    if (type === 'accounting') return 'text-foreground';
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const viewReference = (transaction: UnifiedTransaction) => {
    if (transaction.reference_type && transaction.reference_id) {
      const routeMap: Record<string, string> = {
        'sale': '/admin/sales',
        'purchase': '/admin/purchases',
        'payment': '/admin/payments'
      };
      
      const route = routeMap[transaction.reference_type];
      if (route) {
        window.open(`${route}?ref=${transaction.reference_id}`, '_blank');
      }
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [tenantId, selectedFilter, period]);

  // Set up real-time subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('unified-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounting_transactions',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => fetchTransactions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_transactions',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, selectedFilter, period]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          All transaction activities across cash and accounting systems
        </CardDescription>
        {showFilters && (
          <div className="flex gap-4 mt-4">
            <Select value={selectedFilter} onValueChange={(value: 'all' | 'accounting' | 'cash') => setSelectedFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="accounting">Accounting Only</SelectItem>
                <SelectItem value="cash">Cash Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No transactions found for the selected period
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Posted By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={`${transaction.type}-${transaction.id}`}>
                  <TableCell className="font-mono">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type, transaction.reference_type)}
                      {transaction.transaction_number}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(transaction.transaction_date), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {transaction.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${getAmountColor(transaction.amount, transaction.type)}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {transaction.posted_by_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.status === 'Posted' ? 'default' : 'outline'}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {transaction.reference_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewReference(transaction)}
                        title="View reference"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}