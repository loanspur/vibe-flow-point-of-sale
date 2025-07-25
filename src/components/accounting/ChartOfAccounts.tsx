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
import { useToast } from '@/hooks/use-toast';
import { useDeletionControl } from '@/hooks/useDeletionControl';
import { Plus, Building, TrendingUp, TrendingDown, CreditCard, Banknote, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AccountType {
  id: string;
  name: string;
  category: 'assets' | 'liabilities' | 'equity' | 'income' | 'expenses';
  parent_id?: string;
  is_active: boolean;
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

const categoryIcons = {
  assets: Building,
  liabilities: CreditCard,
  equity: TrendingUp,
  income: TrendingUp,
  expenses: TrendingDown
};

const categoryColors = {
  assets: 'bg-blue-500',
  liabilities: 'bg-red-500',
  equity: 'bg-green-500',
  income: 'bg-emerald-500',
  expenses: 'bg-orange-500'
};

export default function ChartOfAccounts() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { canDelete, logDeletionAttempt } = useDeletionControl();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form states
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    account_type_id: ''
  });

  const [newAccountType, setNewAccountType] = useState({
    name: '',
    category: 'assets' as const,
    parent_id: ''
  });

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
        .order('code');

      if (error) throw error;

      const formattedAccounts = data?.map(account => ({
        ...account,
        account_type_name: account.account_types?.name || 'Unknown',
        account_type_category: account.account_types?.category || 'assets'
      })) || [];

      setAccounts(formattedAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({ title: "Error", description: "Failed to fetch accounts", variant: "destructive" });
    }
  };

  // Fetch account types
  const fetchAccountTypes = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('category, name');

      if (error) throw error;
      setAccountTypes((data as AccountType[]) || []);
    } catch (error) {
      console.error('Error fetching account types:', error);
      toast({ title: "Error", description: "Failed to fetch account types", variant: "destructive" });
    }
  };

  // Generate next account code based on category
  const generateAccountCode = async (accountTypeId: string) => {
    const accountType = accountTypes.find(type => type.id === accountTypeId);
    if (!accountType) return '';

    // Standard account code ranges by category
    const codeRanges = {
      assets: { start: 1000, end: 1999 },
      liabilities: { start: 2000, end: 2999 },
      equity: { start: 3000, end: 3999 },
      income: { start: 4000, end: 4999 },
      expenses: { start: 5000, end: 5999 }
    };

    const range = codeRanges[accountType.category];
    if (!range) return '';

    // Find existing accounts in this category
    const existingCodes = accounts
      .filter(account => account.account_type_category === accountType.category)
      .map(account => parseInt(account.code))
      .filter(code => !isNaN(code) && code >= range.start && code <= range.end)
      .sort((a, b) => a - b);

    // Find the next available code
    let nextCode = range.start;
    for (const code of existingCodes) {
      if (code === nextCode) {
        nextCode++;
      } else if (code > nextCode) {
        break;
      }
    }

    // Ensure we don't exceed the range
    if (nextCode > range.end) {
      // Find the first gap in the sequence
      for (let i = range.start; i <= range.end; i++) {
        if (!existingCodes.includes(i)) {
          nextCode = i;
          break;
        }
      }
    }

    return nextCode.toString();
  };

  // Handle account type selection and auto-generate code
  const handleAccountTypeChange = async (accountTypeId: string) => {
    setNewAccount(prev => ({ ...prev, account_type_id: accountTypeId }));
    
    // Auto-generate code only if current code is empty or was auto-generated
    const currentCode = newAccount.code;
    const isAutoGenerated = /^\d{4}$/.test(currentCode) || currentCode === '';
    
    if (isAutoGenerated) {
      const generatedCode = await generateAccountCode(accountTypeId);
      if (generatedCode) {
        setNewAccount(prev => ({ ...prev, code: generatedCode }));
      }
    }
  };

  // Create account
  const createAccount = async () => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .insert({
          ...newAccount,
          tenant_id: tenantId
        });

      if (error) throw error;

      toast({ title: "Success", description: "Account created successfully" });
      setIsCreateAccountOpen(false);
      resetAccountForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
      toast({ title: "Error", description: "Failed to create account", variant: "destructive" });
    }
  };

  // Create account type
  const createAccountType = async () => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('account_types')
        .insert({
          ...newAccountType,
          tenant_id: tenantId,
          parent_id: newAccountType.parent_id || null
        });

      if (error) throw error;

      toast({ title: "Success", description: "Account type created successfully" });
      setIsCreateTypeOpen(false);
      resetAccountTypeForm();
      fetchAccountTypes();
    } catch (error) {
      console.error('Error creating account type:', error);
      toast({ title: "Error", description: "Failed to create account type", variant: "destructive" });
    }
  };

  // Edit account
  const editAccount = (account: Account) => {
    setEditingAccount(account);
    setNewAccount({
      code: account.code,
      name: account.name,
      account_type_id: account.account_type_id
    });
    setIsEditAccountOpen(true);
  };

  // Update account
  const updateAccount = async () => {
    if (!editingAccount) return;

    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          code: newAccount.code,
          name: newAccount.name,
          account_type_id: newAccount.account_type_id
        })
        .eq('id', editingAccount.id);

      if (error) throw error;

      toast({ title: "Success", description: "Account updated successfully" });
      setIsEditAccountOpen(false);
      setEditingAccount(null);
      resetAccountForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account:', error);
      toast({ title: "Error", description: "Failed to update account", variant: "destructive" });
    }
  };

  // Delete account
  const deleteAccount = async (accountId: string, accountName: string) => {
    if (!canDelete('account')) {
      logDeletionAttempt('account', accountId, accountName);
      toast({ 
        title: "Deletion Disabled", 
        description: "Account deletion has been disabled to maintain audit trail and data integrity.", 
        variant: "destructive" 
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete the account "${accountName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({ title: "Success", description: "Account deleted successfully" });
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({ title: "Error", description: "Failed to delete account", variant: "destructive" });
    }
  };

  // Toggle account status
  const toggleAccountStatus = async (accountId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: !currentStatus })
        .eq('id', accountId);

      if (error) throw error;

      toast({ title: "Success", description: "Account status updated" });
      fetchAccounts();
    } catch (error) {
      console.error('Error updating account status:', error);
      toast({ title: "Error", description: "Failed to update account status", variant: "destructive" });
    }
  };

  // Helper functions
  const resetAccountForm = () => {
    setNewAccount({
      code: '',
      name: '',
      account_type_id: ''
    });
  };

  const resetAccountTypeForm = () => {
    setNewAccountType({
      name: '',
      category: 'assets',
      parent_id: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category as keyof typeof categoryIcons] || Building;
    return Icon;
  };

  const getCategoryColor = (category: string) => {
    return categoryColors[category as keyof typeof categoryColors] || 'bg-gray-500';
  };

  const filteredAccounts = accounts.filter(account => {
    if (selectedCategory === 'all') return true;
    return account.account_type_category === selectedCategory;
  });

  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const category = account.account_type_category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  const getCategoryTotals = () => {
    const totals = accounts.reduce((acc, account) => {
      const category = account.account_type_category;
      if (!acc[category]) acc[category] = 0;
      acc[category] += account.balance || 0;
      return acc;
    }, {} as Record<string, number>);

    return totals;
  };

  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      Promise.all([fetchAccounts(), fetchAccountTypes()]).finally(() => setLoading(false));
    }
  }, [tenantId]);

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
          <p className="text-muted-foreground text-center">
            Chart of accounts requires an active tenant.
          </p>
        </CardContent>
      </Card>
    );
  }

  const categoryTotals = getCategoryTotals();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chart of Accounts</h3>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isCreateTypeOpen} onOpenChange={setIsCreateTypeOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Account Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Account Type</DialogTitle>
                <DialogDescription>
                  Create a new account type category
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type_name">Name</Label>
                  <Input
                    id="type_name"
                    value={newAccountType.name}
                    onChange={(e) => setNewAccountType(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Account type name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newAccountType.category}
                    onValueChange={(value: any) => setNewAccountType(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assets">Assets</SelectItem>
                      <SelectItem value="liabilities">Liabilities</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expenses">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateTypeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAccountType}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateAccountOpen} onOpenChange={setIsCreateAccountOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Account</DialogTitle>
                <DialogDescription>
                  Create a new account in your chart of accounts
                </DialogDescription>
              </DialogHeader>
               <div className="space-y-4">
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                   <p className="text-sm text-blue-800">
                     <strong>Account Code Ranges:</strong> Assets (1000-1999), Liabilities (2000-2999), 
                     Equity (3000-3999), Income (4000-4999), Expenses (5000-5999)
                   </p>
                   <p className="text-xs text-blue-600 mt-1">
                     Codes are auto-generated based on account type selection.
                   </p>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="code">Account Code</Label>
                    <Input
                      id="code"
                      value={newAccount.code}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="Auto-generated (e.g., 1000 for Assets)"
                    />
                 </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Cash"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type</Label>
                   <Select
                     value={newAccount.account_type_id}
                     onValueChange={handleAccountTypeChange}
                   >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateAccountOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAccount}>Create</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Account Dialog */}
          <Dialog open={isEditAccountOpen} onOpenChange={setIsEditAccountOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Account</DialogTitle>
                <DialogDescription>
                  Modify the account details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_code">Account Code</Label>
                  <Input
                    id="edit_code"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., 1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Account Name</Label>
                  <Input
                    id="edit_name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Cash"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_account_type">Account Type</Label>
                  <Select
                    value={newAccount.account_type_id}
                    onValueChange={(value) => setNewAccount(prev => ({ ...prev, account_type_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditAccountOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={updateAccount}>Update</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(categoryTotals).map(([category, total]) => {
          const Icon = getCategoryIcon(category);
          const colorClass = getCategoryColor(category);
          
          return (
            <Card key={category} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${colorClass} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{category}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Accounts</CardTitle>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="assets">Assets</SelectItem>
                <SelectItem value="liabilities">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCategory === 'all' ? (
            // Show grouped by category
            <div className="space-y-6">
              {Object.entries(groupedAccounts).map(([category, categoryAccounts]) => {
                const Icon = getCategoryIcon(category);
                const colorClass = getCategoryColor(category);
                
                return (
                  <div key={category}>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`p-1 rounded ${colorClass} text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-medium capitalize">{category}</h4>
                      <Badge variant="outline">{categoryAccounts.length} accounts</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryAccounts.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-mono">{account.code}</TableCell>
                            <TableCell>{account.name}</TableCell>
                            <TableCell>{account.account_type_name}</TableCell>
                            <TableCell>{formatCurrency(account.balance || 0)}</TableCell>
                            <TableCell>
                              {account.is_active ? (
                                <Badge className="bg-green-500">Active</Badge>
                              ) : (
                                <Badge variant="outline">Inactive</Badge>
                              )}
                            </TableCell>
                             <TableCell>
                               <div className="flex space-x-1">
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => editAccount(account)}
                                 >
                                   <Edit className="w-4 h-4" />
                                 </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteAccount(account.id, account.name)}
                                    disabled={!canDelete('account')}
                                    title={!canDelete('account') ? 'Deletion disabled for audit trail' : 'Delete account'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                 <Button
                                   size="sm"
                                   variant="outline"
                                   onClick={() => toggleAccountStatus(account.id, account.is_active)}
                                 >
                                   {account.is_active ? 'Deactivate' : 'Activate'}
                                 </Button>
                               </div>
                             </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          ) : (
            // Show single category
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>{account.name}</TableCell>
                    <TableCell>{account.account_type_name}</TableCell>
                    <TableCell>{formatCurrency(account.balance || 0)}</TableCell>
                    <TableCell>
                      {account.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                     <TableCell>
                       <div className="flex space-x-1">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => editAccount(account)}
                         >
                           <Edit className="w-4 h-4" />
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => deleteAccount(account.id, account.name)}
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => toggleAccountStatus(account.id, account.is_active)}
                         >
                           {account.is_active ? 'Deactivate' : 'Activate'}
                         </Button>
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}