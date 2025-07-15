import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, FileText, Calendar, DollarSign, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AccountingTransaction {
  id: string;
  transaction_number: string;
  description: string;
  transaction_date: string;
  total_amount: number;
  is_posted: boolean;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
  entries: AccountingEntry[];
}

interface AccountingEntry {
  id: string;
  account_id: string;
  account_name: string;
  account_code: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  account_type_id: string;
  account_type_name: string;
  account_type_category: string;
  balance: number;
  is_active: boolean;
}

export default function TransactionManagement() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    reference_type: '',
    reference_id: ''
  });

  const [entries, setEntries] = useState<Array<{
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    description: string;
  }>>([
    { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
    { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
  ]);

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
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
          created_at,
          accounting_entries (
            id,
            account_id,
            debit_amount,
            credit_amount,
            description,
            accounts (
              code,
              name,
              account_types (
                name,
                category
              )
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data?.map(transaction => ({
        ...transaction,
        entries: transaction.accounting_entries?.map(entry => ({
          id: entry.id,
          account_id: entry.account_id,
          account_name: entry.accounts?.name || 'Unknown Account',
          account_code: entry.accounts?.code || '',
          debit_amount: entry.debit_amount || 0,
          credit_amount: entry.credit_amount || 0,
          description: entry.description || ''
        })) || []
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({ title: "Error", description: "Failed to fetch transactions", variant: "destructive" });
    }
  };

  // Fetch accounts
  const fetchAccounts = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          code,
          name,
          balance,
          is_active,
          account_type_id,
          account_types (
            name,
            category
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('code');

      if (error) throw error;

      const formattedAccounts = data?.map(account => ({
        ...account,
        account_type_name: account.account_types?.name || 'Unknown',
        account_type_category: account.account_types?.category || 'Unknown'
      })) || [];

      setAccounts(formattedAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({ title: "Error", description: "Failed to fetch accounts", variant: "destructive" });
    }
  };

  // Create transaction
  const createTransaction = async () => {
    if (!tenantId || !user?.id) return;

    // Validate entries balance
    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast({ title: "Error", description: "Debits and credits must balance", variant: "destructive" });
      return;
    }

    if (totalDebits === 0 || totalCredits === 0) {
      toast({ title: "Error", description: "Transaction must have both debits and credits", variant: "destructive" });
      return;
    }

    try {
      // Generate transaction number
      const transactionNumber = `TXN-${Date.now()}`;

      // Create transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('accounting_transactions')
        .insert({
          tenant_id: tenantId,
          transaction_number: transactionNumber,
          description: newTransaction.description,
          transaction_date: newTransaction.transaction_date,
          total_amount: totalDebits,
          is_posted: false,
          reference_type: newTransaction.reference_type || null,
          reference_id: newTransaction.reference_id || null,
          created_by: user.id
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create entries
      const entriesData = entries
        .filter(entry => entry.account_id && (entry.debit_amount > 0 || entry.credit_amount > 0))
        .map(entry => ({
          transaction_id: transactionData.id,
          account_id: entry.account_id,
          debit_amount: entry.debit_amount || 0,
          credit_amount: entry.credit_amount || 0,
          description: entry.description
        }));

      const { error: entriesError } = await supabase
        .from('accounting_entries')
        .insert(entriesData);

      if (entriesError) throw entriesError;

      toast({ title: "Success", description: "Transaction created successfully" });
      setIsCreateOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({ title: "Error", description: "Failed to create transaction", variant: "destructive" });
    }
  };

  // Post transaction
  const postTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('accounting_transactions')
        .update({ is_posted: true })
        .eq('id', transactionId);

      if (error) throw error;

      toast({ title: "Success", description: "Transaction posted successfully" });
      fetchTransactions();
    } catch (error) {
      console.error('Error posting transaction:', error);
      toast({ title: "Error", description: "Failed to post transaction", variant: "destructive" });
    }
  };

  // Helper functions
  const resetForm = () => {
    setNewTransaction({
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      reference_type: '',
      reference_id: ''
    });
    setEntries([
      { account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
      { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }
    ]);
  };

  const addEntry = () => {
    setEntries([...entries, { account_id: '', debit_amount: 0, credit_amount: 0, description: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: string, value: any) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setEntries(updatedEntries);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalDebits = () => entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
  const getTotalCredits = () => entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);

  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      Promise.all([fetchTransactions(), fetchAccounts()]).finally(() => setLoading(false));
    }
  }, [tenantId]);

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
          <p className="text-muted-foreground text-center">
            Transaction management requires an active tenant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Journal Entries</h3>
          <p className="text-sm text-muted-foreground">Manage accounting transactions and journal entries</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Journal Entry</DialogTitle>
              <DialogDescription>
                Create a new accounting transaction with journal entries
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Transaction description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction_date">Date</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={newTransaction.transaction_date}
                    onChange={(e) => setNewTransaction(prev => ({ ...prev, transaction_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-4">Journal Entries</h4>
                <div className="space-y-4">
                  {entries.map((entry, index) => (
                    <div key={index} className="grid grid-cols-6 gap-4 items-end p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label>Account</Label>
                        <Select
                          value={entry.account_id}
                          onValueChange={(value) => updateEntry(index, 'account_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Debit</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.debit_amount || ''}
                          onChange={(e) => updateEntry(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Credit</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.credit_amount || ''}
                          onChange={(e) => updateEntry(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={entry.description}
                          onChange={(e) => updateEntry(index, 'description', e.target.value)}
                          placeholder="Entry description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Actions</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEntry(index)}
                          disabled={entries.length <= 2}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addEntry}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Entry
                  </Button>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Total Debits: {formatCurrency(getTotalDebits())}</span>
                    <span>Total Credits: {formatCurrency(getTotalCredits())}</span>
                  </div>
                  <div className="mt-2">
                    <span className={`font-medium ${Math.abs(getTotalDebits() - getTotalCredits()) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                      Difference: {formatCurrency(getTotalDebits() - getTotalCredits())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createTransaction}
                  disabled={Math.abs(getTotalDebits() - getTotalCredits()) > 0.01 || getTotalDebits() === 0}
                >
                  Create Transaction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-mono">{transaction.transaction_number}</TableCell>
                  <TableCell>{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{formatCurrency(transaction.total_amount)}</TableCell>
                  <TableCell>
                    {transaction.is_posted ? (
                      <Badge className="bg-green-500">Posted</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!transaction.is_posted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => postTransaction(transaction.id)}
                      >
                        Post
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}