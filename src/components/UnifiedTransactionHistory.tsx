import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  total_amount?: number;
  is_posted?: boolean;
  entries?: Array<{
    id: string;
    account_code: string;
    account_name: string;
    description: string;
    debit_amount: number;
    credit_amount: number;
  }>;
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
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const fetchUserNames = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (error) throw error;

      const nameMap: Record<string, string> = {};
      profiles?.forEach(profile => {
        nameMap[profile.user_id] = profile.full_name || 'Unknown User';
      });

      setUserNames(prev => ({ ...prev, ...nameMap }));
    } catch (error) {
      console.error('Error fetching user names:', error);
      // If profiles query fails, try to get emails from auth.users through a function
      try {
        const { data: userEmails, error: emailError } = await supabase
          .rpc('get_tenant_user_emails', { user_ids: userIds });

        if (!emailError && userEmails) {
          const emailMap: Record<string, string> = {};
          userEmails.forEach((user: any) => {
            emailMap[user.user_id] = user.email || 'Unknown User';
          });
          setUserNames(prev => ({ ...prev, ...emailMap }));
        }
      } catch (emailErr) {
        console.error('Error fetching user emails:', emailErr);
      }
    }
  };

  const fetchTransactions = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const dateFilter = getPeriodFilter();
      const allTransactions: UnifiedTransaction[] = [];
      const userIds = new Set<string>();

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

        const formattedAccounting = accountingTxns?.map(txn => {
          if (txn.created_by) userIds.add(txn.created_by);
          
          return {
            id: txn.id,
            transaction_number: txn.transaction_number,
            description: txn.description,
            transaction_date: txn.transaction_date,
            amount: txn.total_amount,
            total_amount: txn.total_amount,
            is_posted: txn.is_posted,
            payment_method: 'Journal Entry',
            posted_by_name: 'Loading...',
            posted_by_id: txn.created_by,
            type: 'accounting' as const,
            status: txn.is_posted ? 'Posted' : 'Draft',
            reference_type: txn.reference_type,
            reference_id: txn.reference_id
          };
        }) || [];

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

        const formattedCash = cashTxns?.map(txn => {
          if (txn.performed_by) userIds.add(txn.performed_by);
          
          return {
            id: txn.id,
            transaction_number: `CASH-${txn.id.substring(0, 8)}`,
            description: txn.description,
            transaction_date: txn.transaction_date,
            amount: txn.amount,
            payment_method: getPaymentMethodForCashTransaction(txn.transaction_type),
            posted_by_name: 'Loading...',
            posted_by_id: txn.performed_by,
            type: 'cash' as const,
            status: 'Posted',
            reference_type: txn.reference_type,
            reference_id: txn.reference_id
          };
        }) || [];

        allTransactions.push(...formattedCash);
      }

      // Sort by date and limit
      const sortedTransactions = allTransactions
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, limit);

      setTransactions(sortedTransactions);
      
      // Fetch user names for all unique user IDs
      await fetchUserNames(Array.from(userIds));
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

  const viewTransactionDetails = async (transaction: UnifiedTransaction) => {
    if (transaction.type === 'accounting') {
      try {
        // Fetch detailed accounting transaction with entries
        const { data: txnData, error: txnError } = await supabase
          .from('accounting_transactions')
          .select(`
            *,
            accounting_entries (
              id,
              debit_amount,
              credit_amount,
              description,
              account_id,
              accounts (
                code,
                name
              )
            )
          `)
          .eq('id', transaction.id)
          .single();

        if (txnError) throw txnError;

        const detailedTransaction = {
          ...transaction,
          ...txnData,
          entries: txnData.accounting_entries?.map(entry => ({
            id: entry.id,
            account_code: entry.accounts?.code || '',
            account_name: entry.accounts?.name || '',
            description: entry.description || '',
            debit_amount: entry.debit_amount || 0,
            credit_amount: entry.credit_amount || 0
          })) || []
        };

        setSelectedTransaction(detailedTransaction);
        setIsDetailOpen(true);
      } catch (error) {
        console.error('Error fetching transaction details:', error);
        toast({ title: "Error", description: "Failed to fetch transaction details", variant: "destructive" });
      }
    } else {
      // For cash transactions, show basic details
      setSelectedTransaction(transaction);
      setIsDetailOpen(true);
    }
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
                      {userNames[transaction.posted_by_id] || transaction.posted_by_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.status === 'Posted' ? 'default' : 'outline'}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewTransactionDetails(transaction)}
                        title="View transaction details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {transaction.reference_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewReference(transaction)}
                          title="View reference document"
                        >
                          <Building2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Transaction Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Detailed view of {selectedTransaction?.type === 'accounting' ? 'accounting' : 'cash'} transaction
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getTransactionIcon(selectedTransaction.type, selectedTransaction.reference_type)}
                    <span className="font-medium">Transaction #{selectedTransaction.transaction_number}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedTransaction.transaction_date), 'EEEE, MMMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div className="space-y-2 text-right">
                  <div className={`text-2xl font-bold ${getAmountColor(selectedTransaction.amount, selectedTransaction.type)}`}>
                    {selectedTransaction.amount >= 0 ? '+' : ''}{formatCurrency(selectedTransaction.amount)}
                  </div>
                  <Badge variant={selectedTransaction.status === 'Posted' ? 'default' : 'outline'}>
                    {selectedTransaction.status}
                  </Badge>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{selectedTransaction.description}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Payment Method</h4>
                    <Badge variant="outline">{selectedTransaction.payment_method}</Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Posted By</h4>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{userNames[selectedTransaction.posted_by_id] || 'System'}</span>
                    </div>
                  </div>
                  {selectedTransaction.reference_type && (
                    <div>
                      <h4 className="font-medium mb-2">Reference</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedTransaction.reference_type}: {selectedTransaction.reference_id?.substring(0, 8)}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Journal Entries (for accounting transactions) */}
              {selectedTransaction.type === 'accounting' && selectedTransaction.entries && (
                <div>
                  <h4 className="font-medium mb-4">Journal Entries</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransaction.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.account_code}</div>
                              <div className="text-sm text-muted-foreground">{entry.account_name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{entry.description}</TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}