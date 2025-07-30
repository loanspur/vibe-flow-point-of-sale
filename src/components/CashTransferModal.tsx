import { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CashDrawer, useCashDrawer } from '@/hooks/useCashDrawer';
import { ArrowRightLeft, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface TransferAccount {
  id: string;
  name: string;
  code: string;
  account_type: string;
  category: string;
  is_active: boolean;
}

interface SplitTransfer {
  id: string;
  account_id: string;
  amount: string;
  notes?: string;
}

interface CashTransferModalProps {
  allDrawers: CashDrawer[];
  currentDrawer: CashDrawer;
  onTransfer: (toDrawerId: string, amount: number, reason?: string) => Promise<void>;
  onClose: () => void;
  formatAmount: (amount: number) => string;
}

export function CashTransferModal({
  allDrawers,
  currentDrawer,
  onTransfer,
  onClose,
  formatAmount
}: CashTransferModalProps) {
  const { user, tenantId } = useAuth();
  const { refresh: refreshCashDrawerData } = useCashDrawer();
  
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferAccounts, setTransferAccounts] = useState<TransferAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('KES');
  const [splitTransfers, setSplitTransfers] = useState<SplitTransfer[]>([
    { id: '1', account_id: '', amount: '', notes: '' }
  ]);
  const [isSplitMode, setIsSplitMode] = useState(false);

  // Fetch accounts and business settings
  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) return;
      
      setLoading(true);
      try {
        // Fetch business settings for currency
        const { data: businessSettings } = await supabase
          .from('business_settings')
          .select('currency_code')
          .eq('tenant_id', tenantId)
          .single();

        if (businessSettings?.currency_code) {
          setCurrencyCode(businessSettings.currency_code);
        }

        // Fetch actual business accounts for transfers (only asset accounts, excluding cash)
        console.log('Fetching transfer accounts for tenant:', tenantId);
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select(`
            id, name, code, is_active,
            account_types!inner(name, category)
          `)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .neq('code', '1010') // Exclude cash account since we're transferring FROM cash
          .eq('account_types.category', 'assets') // Only asset accounts for transfers
          .order('code', { ascending: true });

        console.log('Transfer accounts fetched:', accountsData, 'Error:', accountsError);

        if (accountsError) {
          console.error('Error fetching transfer accounts:', accountsError);
          toast.error('Failed to load transfer accounts');
        }

        // Format accounts data
        const formattedAccounts = (accountsData || []).map(account => ({
          id: account.id,
          name: account.name,
          code: account.code,
          account_type: account.account_types?.name || 'Unknown',
          category: account.account_types?.category || 'unknown',
          is_active: account.is_active
        }));

        setTransferAccounts(formattedAccounts);
        
      } catch (error) {
        console.error('Error fetching transfer data:', error);
        toast.error('Failed to load transfer options');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, currentDrawer.id]);

  // Split transfer management functions
  const addSplitTransfer = () => {
    const newId = (splitTransfers.length + 1).toString();
    setSplitTransfers([...splitTransfers, { id: newId, account_id: '', amount: '', notes: '' }]);
  };

  const removeSplitTransfer = (id: string) => {
    if (splitTransfers.length > 1) {
      setSplitTransfers(splitTransfers.filter(st => st.id !== id));
    }
  };

  const updateSplitTransfer = (id: string, field: keyof SplitTransfer, value: string) => {
    setSplitTransfers(splitTransfers.map(st => 
      st.id === id ? { ...st, [field]: value } : st
    ));
  };

  const getTotalSplitAmount = () => {
    return splitTransfers.reduce((total, st) => total + (Number(st.amount) || 0), 0);
  };

  const createSplitTransferRequests = async (validSplits: SplitTransfer[]) => {
    if (!tenantId || !user?.id) return;

    const promises = validSplits.map(async split => {
      const transferData = {
        tenant_id: tenantId,
        transfer_type: 'account' as const,
        amount: Number(split.amount),
        currency_code: currencyCode,
        from_user_id: user.id,
        to_user_id: user.id,
        from_drawer_id: currentDrawer.id,
        to_account_id: split.account_id,
        reason: split.notes || reason || null,
        status: 'pending' as const, // Create as pending, then process
        reference_number: generateReferenceNumber()
      };

      const { data: transferRequest, error } = await supabase
        .from('transfer_requests')
        .insert([transferData])
        .select()
        .single();

      if (error) throw error;

      // Immediately process the transfer
      if (transferRequest) {
        const { error: processError } = await supabase.rpc('process_transfer_request', {
          transfer_request_id: transferRequest.id,
          action: 'approve'
        });

        if (processError) {
          console.error('Error processing split transfer:', processError);
          throw processError;
        }

        // Mark as completed after processing
        const { error: updateError } = await supabase
          .from('transfer_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', transferRequest.id);

        if (updateError) {
          console.error('Error updating split transfer status:', updateError);
          throw updateError;
        }
      }

      return { data: transferRequest, error: null };
    });

    const results = await Promise.all(promises);
    const errors = results.filter(result => result.error);
    
    if (errors.length > 0) {
      throw new Error(`Failed to create ${errors.length} transfer requests`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSplitMode) {
      // Handle split transfers
      const totalAmount = getTotalSplitAmount();
      const validSplits = splitTransfers.filter(st => st.account_id && Number(st.amount) > 0);
      
      if (validSplits.length === 0) {
        toast.error('Please add at least one valid split transfer');
        return;
      }
      
      if (totalAmount > currentDrawer.current_balance) {
        toast.error('Total split amount exceeds cash drawer balance');
        return;
      }
      
      setIsSubmitting(true);
      try {
      await createSplitTransferRequests(validSplits);
      toast.success('Split transfer requests created successfully');
      
      // Refresh cash drawer data after successful transfer
      refreshCashDrawerData();
      
      // Clear dashboard cache to refresh banked amounts
      const cacheKey = `dashboard-metrics-${tenantId}-${new Date().toISOString().split('T')[0]}`;
      if (typeof window !== 'undefined') {
        const cache = window.localStorage;
        const cacheEntries = Object.keys(cache).filter(key => key.startsWith(cacheKey));
        cacheEntries.forEach(key => cache.removeItem(key));
      }
      
      onClose();
      } catch (error) {
        console.error('Split transfer failed:', error);
        toast.error('Failed to create split transfer requests');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    // Handle single transfers
    const transferAmount = Number(amount);
    if (transferAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (transferAmount > currentDrawer.current_balance) {
      toast.error('Insufficient balance in cash drawer');
      return;
    }

    // Validate account selection (always bank account transfer)
    if (!selectedAccountId) {
      toast.error('Please select an account');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransferRequest();
      toast.success('Transfer request created successfully');
      
      // Refresh cash drawer data after successful transfer
      refreshCashDrawerData();
      
      // Clear dashboard cache to refresh banked amounts
      const cacheKey = `dashboard-metrics-${tenantId}-${new Date().toISOString().split('T')[0]}`;
      if (typeof window !== 'undefined') {
        const cache = window.localStorage;
        const cacheEntries = Object.keys(cache).filter(key => key.startsWith(cacheKey));
        cacheEntries.forEach(key => cache.removeItem(key));
      }
      
      onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('Failed to create transfer request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const createTransferRequest = async () => {
    if (!tenantId || !user?.id) return;

    const transferData = {
      tenant_id: tenantId,
      transfer_type: 'account' as const,
      amount: Number(amount),
      currency_code: currencyCode,
      from_user_id: user.id,
      to_user_id: user.id,
      from_drawer_id: currentDrawer.id,
      to_drawer_id: null,
      to_account_id: selectedAccountId,
      reason: reason || null,
      status: 'pending', // Always create as pending, then process
      reference_number: generateReferenceNumber()
    };

    const { data: transferRequest, error } = await supabase
      .from('transfer_requests')
      .insert([transferData])
      .select()
      .single();

    if (error) throw error;

    // Immediately process the account transfer
    if (transferRequest) {
      const { error: processError } = await supabase.rpc('process_transfer_request', {
        transfer_request_id: transferRequest.id,
        action: 'approve'
      });

      if (processError) {
        console.error('Error processing account transfer:', processError);
        throw processError;
      }

      // Mark as completed after processing
      const { error: updateError } = await supabase
        .from('transfer_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', transferRequest.id);

      if (updateError) {
        console.error('Error updating transfer status:', updateError);
        throw updateError;
      }
    }
  };

  const generateReferenceNumber = () => {
    const prefix = 'TAC'; // Always bank account transfer
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-muted-foreground">Loading transfer options...</div>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Bank Account Transfer
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Current Balance</Label>
          <div className="p-3 bg-muted rounded-lg font-medium">
            {formatAmount(currentDrawer.current_balance)}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Transfer Type</Label>
          <div className="p-3 bg-muted rounded-lg font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Bank Account Transfer
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label>Transfer To Bank Account</Label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="split-mode"
                checked={isSplitMode}
                onChange={(e) => setIsSplitMode(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="split-mode" className="text-sm">Split to multiple accounts</Label>
            </div>
          </div>

          {!isSplitMode ? (
            // Single transfer mode
            <div className="space-y-2">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {transferAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{account.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {account.code} • {account.account_type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            // Split transfer mode - Compact design
            <div className="space-y-3">
              {splitTransfers.map((split, index) => (
                <div key={split.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    {splitTransfers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSplitTransfer(split.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Select 
                        value={split.account_id} 
                        onValueChange={(value) => updateSplitTransfer(split.id, 'account_id', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Account" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {transferAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <span className="text-sm">{account.name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={split.amount}
                        onChange={(e) => updateSplitTransfer(split.id, 'amount', e.target.value)}
                        step="0.01"
                        className="h-8"
                      />
                    </div>
                  </div>
                  
                  {split.notes !== undefined && (
                    <Input
                      placeholder="Notes (optional)"
                      value={split.notes || ''}
                      onChange={(e) => updateSplitTransfer(split.id, 'notes', e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addSplitTransfer}
                size="sm"
                className="w-full h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Transfer
              </Button>
              
              <div className="bg-muted/50 p-2 rounded-md">
                <div className="flex justify-between text-xs">
                  <span>Total:</span>
                  <span className="font-medium">{formatAmount(getTotalSplitAmount())}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Available:</span>
                  <span>{formatAmount(currentDrawer.current_balance)}</span>
                </div>
              </div>
            </div>
          )}

          {transferAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No transfer accounts available. Set up accounts in the accounting section.
            </p>
          )}

          {!isSplitMode && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Reason for transfer..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                isSubmitting ||
                (!isSplitMode && (!selectedAccountId || transferAccounts.length === 0 || !amount || Number(amount) > currentDrawer.current_balance)) ||
                (isSplitMode && (getTotalSplitAmount() === 0 || getTotalSplitAmount() > currentDrawer.current_balance || splitTransfers.filter(st => st.account_id && Number(st.amount) > 0).length === 0))
              }
            >
              {isSubmitting ? 'Creating...' : isSplitMode ? 'Create Split Transfers' : 'Create Bank Transfer'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}