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
import { useDeletionControl } from '@/hooks/useDeletionControl';
import { format } from 'date-fns';
import { Plus, FileText, Calendar, DollarSign, Trash2, Edit, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const { canDelete, logDeletionAttempt } = useDeletionControl();

  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AccountingTransaction | null>(null);

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

  // Delete transaction
  const deleteTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    
    if (!canDelete('transaction')) {
      logDeletionAttempt('transaction', transactionId, transaction?.description);
      toast({ 
        title: "Deletion Disabled", 
        description: "Transaction deletion has been disabled to maintain audit trail and data integrity.", 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('accounting_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      toast({ title: "Success", description: "Transaction deleted successfully" });
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({ title: "Error", description: "Failed to delete transaction", variant: "destructive" });
    }
  };

  // Edit transaction
  const updateTransaction = async () => {
    if (!selectedTransaction || !tenantId || !user?.id) return;

    // Validate entries balance
    const totalDebits = entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast({ title: "Error", description: "Debits and credits must balance", variant: "destructive" });
      return;
    }

    try {
      // Update transaction
      const { error: transactionError } = await supabase
        .from('accounting_transactions')
        .update({
          description: newTransaction.description,
          transaction_date: newTransaction.transaction_date,
          total_amount: totalDebits,
          reference_type: newTransaction.reference_type || null,
          reference_id: newTransaction.reference_id || null
        })
        .eq('id', selectedTransaction.id);

      if (transactionError) throw transactionError;

      // Delete existing entries
      const { error: deleteError } = await supabase
        .from('accounting_entries')
        .delete()
        .eq('transaction_id', selectedTransaction.id);

      if (deleteError) throw deleteError;

      // Create new entries
      const entriesData = entries
        .filter(entry => entry.account_id && (entry.debit_amount > 0 || entry.credit_amount > 0))
        .map(entry => ({
          transaction_id: selectedTransaction.id,
          account_id: entry.account_id,
          debit_amount: entry.debit_amount || 0,
          credit_amount: entry.credit_amount || 0,
          description: entry.description
        }));

      const { error: entriesError } = await supabase
        .from('accounting_entries')
        .insert(entriesData);

      if (entriesError) throw entriesError;

      toast({ title: "Success", description: "Transaction updated successfully" });
      setIsEditOpen(false);
      setSelectedTransaction(null);
      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({ title: "Error", description: "Failed to update transaction", variant: "destructive" });
    }
  };

  // Open edit dialog
  const openEditDialog = (transaction: AccountingTransaction) => {
    setSelectedTransaction(transaction);
    setNewTransaction({
      description: transaction.description,
      transaction_date: transaction.transaction_date,
      reference_type: transaction.reference_type || '',
      reference_id: transaction.reference_id || ''
    });
    setEntries(transaction.entries.map(entry => ({
      account_id: entry.account_id,
      debit_amount: entry.debit_amount,
      credit_amount: entry.credit_amount,
      description: entry.description || ''
    })));
    setIsEditOpen(true);
  };

  // Open view dialog
  const openViewDialog = (transaction: AccountingTransaction) => {
    setSelectedTransaction(transaction);
    setIsViewOpen(true);
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
    setSelectedTransaction(null);
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
                     <div className="flex space-x-2">
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => openViewDialog(transaction)}
                         title="View transaction"
                       >
                         <Eye className="w-4 h-4" />
                       </Button>
                       {transaction.is_posted ? (
                         // For posted transactions - view only with edit option for reversals
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => openEditDialog(transaction)}
                           title="View/Reverse transaction"
                         >
                           <Edit className="w-4 h-4" />
                         </Button>
                       ) : (
                         // For draft transactions - full edit capabilities
                         <>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => openEditDialog(transaction)}
                             title="Edit transaction"
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => postTransaction(transaction.id)}
                             title="Post transaction"
                           >
                             <CheckCircle className="w-4 h-4" />
                           </Button>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  title={!canDelete('transaction') ? 'Deletion disabled for audit trail' : 'Delete transaction'}
                                  disabled={!canDelete('transaction')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   Are you sure you want to delete this transaction? This action cannot be undone.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteTransaction(transaction.id)}
                                    disabled={!canDelete('transaction')}
                                  >
                                    Delete
                                  </AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                         </>
                       )}
                     </div>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
            <DialogDescription>
              Edit the selected accounting transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Transaction description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-transaction_date">Date</Label>
                <Input
                  id="edit-transaction_date"
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
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={updateTransaction}
                disabled={Math.abs(getTotalDebits() - getTotalCredits()) > 0.01 || getTotalDebits() === 0}
              >
                Update Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Journal Entry</DialogTitle>
            <DialogDescription>
              Transaction details and journal entries
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Transaction Number</Label>
                  <p className="font-mono">{selectedTransaction.transaction_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p>{format(new Date(selectedTransaction.transaction_date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p>{selectedTransaction.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                  <p>{formatCurrency(selectedTransaction.total_amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div>
                    {selectedTransaction.is_posted ? (
                      <Badge className="bg-green-500">Posted</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </div>
                </div>
              </div>

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
                    {selectedTransaction.entries.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm">{entry.account_code}</span>
                            <br />
                            <span className="text-sm">{entry.account_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right">
                          {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-between font-medium">
                  <span>Total Debits: {formatCurrency(selectedTransaction.entries.reduce((sum, entry) => sum + entry.debit_amount, 0))}</span>
                  <span>Total Credits: {formatCurrency(selectedTransaction.entries.reduce((sum, entry) => sum + entry.credit_amount, 0))}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsViewOpen(false)}>
                  Close
                </Button>
                {!selectedTransaction.is_posted && (
                  <Button onClick={() => openEditDialog(selectedTransaction)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Transaction
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}