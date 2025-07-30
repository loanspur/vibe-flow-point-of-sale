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

interface TransferAccount {
  id: string;
  name: string;
  code: string;
  account_type: string;
  category: string;
  is_active: boolean;
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
  
  const [transferType, setTransferType] = useState<'drawer' | 'account'>('drawer');
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferAccounts, setTransferAccounts] = useState<TransferAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('KES');

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

  const generateReferenceNumber = () => {
    const prefix = 'TAC';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
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
      status: 'pending',
      reference_number: generateReferenceNumber()
    };

    const { data: transferRequest, error } = await supabase
      .from('transfer_requests')
      .insert([transferData])
      .select()
      .single();

    if (error) throw error;

    console.log('Transfer request created and pending approval:', transferRequest.reference_number);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const transferAmount = Number(amount);
    if (transferAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    if (transferAmount > currentDrawer.current_balance) {
      toast.error('Insufficient balance in cash drawer');
      return;
    }

    setIsSubmitting(true);
    try {
      if (transferType === 'drawer') {
        if (!selectedDrawerId) {
          toast.error('Please select a cash drawer');
          return;
        }
        await onTransfer(selectedDrawerId, transferAmount, reason);
        toast.success('Cash drawer transfer request created');
      } else {
        if (!selectedAccountId) {
          toast.error('Please select a bank account');
          return;
        }
        await createTransferRequest();
        toast.success('Bank transfer request created');
      }
      
      refreshCashDrawerData();
      onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error('Failed to create transfer request');
    } finally {
      setIsSubmitting(false);
    }
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
          Transfer Cash
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTransferType('drawer')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                transferType === 'drawer'
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/20'
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <ArrowRightLeft className="h-4 w-4" />
                <span className="text-sm font-medium">Cash Drawer</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTransferType('account')}
              className={`p-3 rounded-lg border-2 transition-colors ${
                transferType === 'account'
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/20'
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">Bank Account</span>
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {transferType === 'drawer' ? (
            <div className="space-y-2">
              <Label>Transfer To Cash Drawer</Label>
              <Select value={selectedDrawerId} onValueChange={setSelectedDrawerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a cash drawer" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {allDrawers
                    .filter(drawer => drawer.id !== currentDrawer.id && drawer.is_active)
                    .map((drawer) => (
                      <SelectItem key={drawer.id} value={drawer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{drawer.drawer_name}</span>
                          <span className="text-sm text-muted-foreground">
                            {drawer.location_name || 'No location'} • Balance: {formatAmount(drawer.current_balance)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {allDrawers.filter(d => d.id !== currentDrawer.id && d.is_active).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No other active cash drawers available for transfer.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Transfer To Bank Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a bank account" />
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
              {transferAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No bank accounts available for transfer.
                </p>
              )}
            </div>
          )}

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

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (!selectedDrawerId && transferType === 'drawer') || (!selectedAccountId && transferType === 'account')}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Transfer Request'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}