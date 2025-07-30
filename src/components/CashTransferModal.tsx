import { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashDrawer } from '@/hooks/useCashDrawer';
import { ArrowRightLeft, CreditCard, Wallet, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface DrawerWithUser {
  id: string;
  drawer_name: string;
  current_balance: number;
  status: string;
  user_id: string;
  user_name: string;
  location?: string;
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
  
  const [transferType, setTransferType] = useState<'cash_drawer' | 'payment_method'>('cash_drawer');
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [drawerUsers, setDrawerUsers] = useState<DrawerWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('KES');

  // Fetch payment methods, drawer users, and business settings
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

        // Fetch actual existing payment methods from database
        const { data: paymentMethodsData, error: paymentError } = await supabase
          .from('payment_methods')
          .select('id, name, type, is_active, display_order')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .neq('type', 'cash') // Exclude cash since we're transferring FROM cash drawer
          .order('display_order', { ascending: true });

        if (paymentError) {
          console.error('Error fetching payment methods:', paymentError);
        }

        // Fetch actual existing active cash drawers from active users
        const { data: allCashDrawers, error: drawersError } = await supabase
          .from('cash_drawers')
          .select('id, drawer_name, current_balance, status, user_id, location_name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)         // Cash drawer must be active
          .eq('status', 'open')          // Cash drawer must be open
          .neq('id', currentDrawer.id);  // Exclude current drawer

        if (drawersError) {
          console.error('Error fetching cash drawers:', drawersError);
        }

        // Get user profiles for drawer owners to ensure they are active
        const drawerUserIds = (allCashDrawers || []).map(d => d.user_id);
        let userProfiles: any[] = [];
        
        if (drawerUserIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, tenant_id')
            .in('user_id', drawerUserIds)
            .eq('tenant_id', tenantId); // Only users from same tenant

          if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
          } else {
            userProfiles = profiles || [];
          }
        }

        // Only include cash drawers from active users in same tenant
        const validCashDrawers = (allCashDrawers || []).filter(drawer => {
          return userProfiles.some(profile => profile.user_id === drawer.user_id);
        });

        // Format drawer data with user information
        const drawersWithUsers = validCashDrawers.map(drawer => {
          const profile = userProfiles.find(p => p.user_id === drawer.user_id);
          return {
            id: drawer.id,
            drawer_name: drawer.drawer_name,
            current_balance: drawer.current_balance,
            status: drawer.status,
            user_id: drawer.user_id,
            user_name: profile?.full_name || profile?.email || 'Unknown User',
            location: drawer.location_name
          };
        });

        setPaymentMethods(paymentMethodsData || []);
        setDrawerUsers(drawersWithUsers);
        
      } catch (error) {
        console.error('Error fetching transfer data:', error);
        toast.error('Failed to load transfer options');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, currentDrawer.id]); // Removed dependency on allDrawers prop

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

    // Validate based on transfer type
    if (transferType === 'cash_drawer' && !selectedDrawerId) {
      toast.error('Please select a cash drawer to transfer to');
      return;
    }
    
    if (transferType === 'payment_method' && !selectedPaymentMethodId) {
      toast.error('Please select a payment method');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransferRequest();
      toast.success('Transfer request created successfully');
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

    let targetUserId = user.id; // Default to self for payment methods
    
    if (transferType === 'cash_drawer') {
      const targetDrawer = drawerUsers.find(d => d.id === selectedDrawerId);
      if (targetDrawer) {
        targetUserId = targetDrawer.user_id;
      }
    }

    const transferData = {
      tenant_id: tenantId,
      transfer_type: transferType,
      amount: Number(amount),
      currency_code: currencyCode,
      from_user_id: user.id,
      to_user_id: targetUserId,
      from_drawer_id: currentDrawer.id,
      to_drawer_id: transferType === 'cash_drawer' ? selectedDrawerId : null,
      to_payment_method_id: transferType === 'payment_method' ? selectedPaymentMethodId : null,
      reason: reason || null,
      status: 'pending',
      reference_number: generateReferenceNumber()
    };

    const { error } = await supabase
      .from('transfer_requests')
      .insert([transferData]);

    if (error) throw error;
  };

  const generateReferenceNumber = () => {
    const prefix = transferType === 'cash_drawer' ? 'TCD' : 'TPM';
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
          Create Transfer Request
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Current Balance</Label>
          <div className="p-3 bg-muted rounded-lg font-medium">
            {formatAmount(currentDrawer.current_balance)}
          </div>
        </div>

        <Tabs value={transferType} onValueChange={(value) => setTransferType(value as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash_drawer" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              To Cash Drawer
            </TabsTrigger>
            <TabsTrigger value="payment_method" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              To Bank/Card
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <TabsContent value="cash_drawer" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="drawer">Transfer To Cash Drawer</Label>
                <Select value={selectedDrawerId} onValueChange={setSelectedDrawerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a cash drawer" />
                  </SelectTrigger>
                  <SelectContent>
                    {drawerUsers.map((drawer) => (
                      <SelectItem key={drawer.id} value={drawer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{drawer.drawer_name}</span>
                          <span className="text-sm text-muted-foreground">
                            Owner: {drawer.user_name} • Balance: {formatAmount(drawer.current_balance)}
                            {drawer.location && ` • ${drawer.location}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {drawerUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active cash drawers available from other users
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="payment_method" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Transfer To Bank/Card Account</Label>
                <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {method.name} ({method.type.toUpperCase()})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {paymentMethods.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No payment methods available. Add bank or card accounts in settings.
                  </p>
                )}
              </div>
            </TabsContent>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={transferType === 'cash_drawer' ? currentDrawer.current_balance : undefined}
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

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  !amount || 
                  isSubmitting ||
                  Number(amount) > currentDrawer.current_balance ||
                  (transferType === 'cash_drawer' && (!selectedDrawerId || drawerUsers.length === 0)) ||
                  (transferType === 'payment_method' && (!selectedPaymentMethodId || paymentMethods.length === 0))
                }
              >
                {isSubmitting ? 'Creating...' : 'Create Transfer Request'}
              </Button>
            </div>
          </form>
        </Tabs>
      </div>
    </>
  );
}