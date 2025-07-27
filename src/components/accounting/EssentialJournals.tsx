import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingCart, 
  Package, 
  Undo2, 
  DollarSign, 
  CreditCard, 
  Building,
  Receipt,
  TrendingUp,
  TrendingDown,
  Plus
} from 'lucide-react';
import { createJournalEntry, getDefaultAccounts } from '@/lib/accounting-integration';
import { updateProductInventory, processPurchaseReceipt, processSaleInventory } from '@/lib/inventory-integration';

interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: string;
  entries: {
    account_type: string;
    debit_credit: 'debit' | 'credit';
    description: string;
    amount_field: string;
  }[];
}

interface Account {
  id: string;
  code: string;
  name: string;
  account_type_category: string;
}

const journalTemplates: JournalTemplate[] = [
  {
    id: 'cash_sale',
    name: 'Cash Sale',
    description: 'Record a cash sale transaction',
    icon: ShoppingCart,
    category: 'sales',
    entries: [
      { account_type: 'cash', debit_credit: 'debit', description: 'Cash received from sale', amount_field: 'total_amount' },
      { account_type: 'sales_revenue', debit_credit: 'credit', description: 'Sales revenue', amount_field: 'revenue_amount' },
      { account_type: 'sales_tax_payable', debit_credit: 'credit', description: 'Sales tax collected', amount_field: 'tax_amount' },
      { account_type: 'cost_of_goods_sold', debit_credit: 'debit', description: 'Cost of goods sold', amount_field: 'cogs_amount' },
      { account_type: 'inventory', debit_credit: 'credit', description: 'Inventory reduction', amount_field: 'cogs_amount' }
    ]
  },
  {
    id: 'credit_sale',
    name: 'Credit Sale',
    description: 'Record a sale on account',
    icon: CreditCard,
    category: 'sales',
    entries: [
      { account_type: 'accounts_receivable', debit_credit: 'debit', description: 'Sale on account', amount_field: 'total_amount' },
      { account_type: 'sales_revenue', debit_credit: 'credit', description: 'Sales revenue', amount_field: 'revenue_amount' },
      { account_type: 'sales_tax_payable', debit_credit: 'credit', description: 'Sales tax collected', amount_field: 'tax_amount' }
    ]
  },
  {
    id: 'inventory_purchase',
    name: 'Inventory Purchase',
    description: 'Record purchase of inventory',
    icon: Package,
    category: 'purchases',
    entries: [
      { account_type: 'inventory', debit_credit: 'debit', description: 'Inventory purchased', amount_field: 'total_amount' },
      { account_type: 'accounts_payable', debit_credit: 'credit', description: 'Amount owed to supplier', amount_field: 'total_amount' }
    ]
  },
  {
    id: 'cash_purchase',
    name: 'Cash Purchase',
    description: 'Record cash purchase of inventory',
    icon: DollarSign,
    category: 'purchases',
    entries: [
      { account_type: 'inventory', debit_credit: 'debit', description: 'Inventory purchased', amount_field: 'total_amount' },
      { account_type: 'cash', debit_credit: 'credit', description: 'Cash paid', amount_field: 'total_amount' }
    ]
  },
  {
    id: 'customer_payment',
    name: 'Customer Payment',
    description: 'Record payment received from customer',
    icon: Receipt,
    category: 'payments',
    entries: [
      { account_type: 'cash', debit_credit: 'debit', description: 'Payment received', amount_field: 'payment_amount' },
      { account_type: 'accounts_receivable', debit_credit: 'credit', description: 'Customer payment applied', amount_field: 'payment_amount' }
    ]
  },
  {
    id: 'supplier_payment',
    name: 'Supplier Payment',
    description: 'Record payment made to supplier',
    icon: Building,
    category: 'payments',
    entries: [
      { account_type: 'accounts_payable', debit_credit: 'debit', description: 'Payment to supplier', amount_field: 'payment_amount' },
      { account_type: 'cash', debit_credit: 'credit', description: 'Cash paid', amount_field: 'payment_amount' }
    ]
  },
  {
    id: 'sales_return',
    name: 'Sales Return',
    description: 'Record return of sold items',
    icon: Undo2,
    category: 'returns',
    entries: [
      { account_type: 'sales_returns', debit_credit: 'debit', description: 'Sales return', amount_field: 'return_amount' },
      { account_type: 'cash', debit_credit: 'credit', description: 'Refund given', amount_field: 'return_amount' },
      { account_type: 'inventory', debit_credit: 'debit', description: 'Inventory restocked', amount_field: 'restock_amount' },
      { account_type: 'cost_of_goods_sold', debit_credit: 'credit', description: 'COGS adjustment', amount_field: 'restock_amount' }
    ]
  },
  {
    id: 'expense_payment',
    name: 'Expense Payment',
    description: 'Record payment for business expenses',
    icon: TrendingDown,
    category: 'expenses',
    entries: [
      { account_type: 'operating_expenses', debit_credit: 'debit', description: 'Business expense', amount_field: 'expense_amount' },
      { account_type: 'cash', debit_credit: 'credit', description: 'Cash paid', amount_field: 'expense_amount' }
    ]
  },
  {
    id: 'depreciation',
    name: 'Depreciation',
    description: 'Record depreciation expense',
    icon: TrendingDown,
    category: 'adjustments',
    entries: [
      { account_type: 'depreciation_expense', debit_credit: 'debit', description: 'Depreciation expense', amount_field: 'depreciation_amount' },
      { account_type: 'accumulated_depreciation', debit_credit: 'credit', description: 'Accumulated depreciation', amount_field: 'depreciation_amount' }
    ]
  }
];

export default function EssentialJournals() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<JournalTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // Fetch accounts and create mapping
  const fetchAccountsAndMapping = async () => {
    if (!tenantId) return;

    try {
      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          id,
          code,
          name,
          account_types!inner(category)
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      const formattedAccounts = accountsData?.map(account => ({
        ...account,
        account_type_category: account.account_types?.category || 'assets'
      })) || [];

      setAccounts(formattedAccounts);

      // Get default account mapping
      const mapping = await getDefaultAccounts(tenantId);
      setAccountMap(mapping);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({ title: "Error", description: "Failed to fetch accounts", variant: "destructive" });
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: JournalTemplate) => {
    setSelectedTemplate(template);
    setFormData({});
    setIsDialogOpen(true);
  };

  // Create journal entry from template
  const createJournalFromTemplate = async () => {
    if (!selectedTemplate || !tenantId || !user?.id) return;

    setLoading(true);
    try {
      const entries = selectedTemplate.entries
        .filter(entry => {
          const amount = parseFloat(formData[entry.amount_field] || 0);
          return amount > 0;
        })
        .map(entry => {
          const amount = parseFloat(formData[entry.amount_field] || 0);
          const accountId = accountMap[entry.account_type];
          
          if (!accountId) {
            throw new Error(`Account not found for type: ${entry.account_type}`);
          }

          return {
            account_id: accountId,
            debit_amount: entry.debit_credit === 'debit' ? amount : 0,
            credit_amount: entry.debit_credit === 'credit' ? amount : 0,
            description: entry.description
          };
        });

      if (entries.length === 0) {
        throw new Error('No valid entries to create');
      }

      const transaction = {
        description: formData.description || selectedTemplate.name,
        reference_type: selectedTemplate.category,
        reference_id: formData.reference_id || null,
        transaction_date: formData.transaction_date || new Date().toISOString().split('T')[0],
        entries
      };

      await createJournalEntry(tenantId, transaction, user.id);

      toast({ title: "Success", description: "Journal entry created successfully" });
      setIsDialogOpen(false);
      setSelectedTemplate(null);
      setFormData({});
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to create journal entry", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchAccountsAndMapping();
    }
  }, [tenantId]);

  // Group templates by category
  const groupedTemplates = journalTemplates.reduce((groups, template) => {
    if (!groups[template.category]) {
      groups[template.category] = [];
    }
    groups[template.category].push(template);
    return groups;
  }, {} as Record<string, JournalTemplate[]>);

  const categoryNames = {
    sales: 'Sales Transactions',
    purchases: 'Purchase Transactions',
    payments: 'Payment Transactions',
    returns: 'Return Transactions',
    expenses: 'Expense Transactions',
    adjustments: 'Adjusting Entries'
  };

  const renderFormFields = () => {
    if (!selectedTemplate) return null;

    const uniqueAmountFields = [...new Set(selectedTemplate.entries.map(e => e.amount_field))];

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder={selectedTemplate.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction_date">Transaction Date</Label>
          <Input
            id="transaction_date"
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={formData.transaction_date || new Date().toISOString().split('T')[0]}
            onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
          />
        </div>

        {uniqueAmountFields.map(field => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field}>
              {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Label>
            <Input
              id={field}
              type="number"
              step="0.01"
              value={formData[field] || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, [field]: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="reference_id">Reference ID (Optional)</Label>
          <Input
            id="reference_id"
            value={formData.reference_id || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, reference_id: e.target.value }))}
            placeholder="Reference number or ID"
          />
        </div>
      </div>
    );
  };

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Plus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
          <p className="text-muted-foreground text-center">
            Please log in to access essential journals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Essential Journals</h2>
          <p className="text-muted-foreground">
            Create common journal entries for your business transactions.
            <br />
            <strong>Note:</strong> Sales and purchases from your POS automatically create journal entries. 
            Use these templates for other manual adjustments.
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plus className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Chart of Accounts</h3>
            <p className="text-muted-foreground text-center">
              Your chart of accounts is being set up. Please refresh the page or create some sales/purchase transactions first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-semibold">Essential Journal Templates</h3>
            <p className="text-sm text-muted-foreground">
              Quick access to common business transaction templates
            </p>
          </div>

          {Object.entries(groupedTemplates).map(([category, templates]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{categoryNames[category as keyof typeof categoryNames] || category}</CardTitle>
                <CardDescription>
                  Journal templates for {category} related transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{template.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Template Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedTemplate && (
                    <div className="flex items-center space-x-2">
                      {React.createElement(selectedTemplate.icon, { className: "w-5 h-5" })}
                      <span>{selectedTemplate.name}</span>
                    </div>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {renderFormFields()}

                {selectedTemplate && (
                  <div className="space-y-2">
                    <Label>Preview Journal Entries:</Label>
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="space-y-2 text-sm">
                        {selectedTemplate.entries.map((entry, index) => {
                          const amount = parseFloat(formData[entry.amount_field] || 0);
                          if (amount <= 0) return null;

                          return (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-muted-foreground">{entry.description}</span>
                              <div className="flex space-x-4">
                                <span className="w-20 text-right">
                                  {entry.debit_credit === 'debit' ? `$${amount.toFixed(2)}` : '-'}
                                </span>
                                <span className="w-20 text-right">
                                  {entry.debit_credit === 'credit' ? `$${amount.toFixed(2)}` : '-'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createJournalFromTemplate} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Journal Entry'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}