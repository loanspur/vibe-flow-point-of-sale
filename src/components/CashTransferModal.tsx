import { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashDrawer } from '@/hooks/useCashDrawer';
import { ArrowRightLeft, Users, CreditCard, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface User {
  id: string;
  email: string;
  full_name: string;
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
  
  const [transferType, setTransferType] = useState<'cash_drawer' | 'user_to_user' | 'payment_method'>('cash_drawer');
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const availableDrawers = allDrawers.filter(
    drawer => drawer.id !== currentDrawer.id && drawer.status === 'open'
  );

  // Fetch payment methods and users
  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) return;
      
      setLoading(true);
      try {
        // Fetch payment methods
        const { data: paymentMethodsData } = await supabase
          .from('payment_methods')
          .select('id, name, type, is_active')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('display_order');

        // Fetch tenant users with profiles
        const { data: usersData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('tenant_id', tenantId)
          .neq('user_id', user?.id);

        if (paymentMethodsData) setPaymentMethods(paymentMethodsData);
        if (usersData) {
          const formattedUsers = usersData.map(u => ({
            id: u.user_id,
            email: '', // We'll get this from auth if needed
            full_name: u.full_name || 'Unknown User'
          }));
          setUsers(formattedUsers);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const transferAmount = Number(amount);
    if (transferAmount <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    // Validate based on transfer type
    if (transferType === 'cash_drawer') {
      if (!selectedDrawerId || transferAmount > currentDrawer.current_balance) {
        alert('Invalid transfer amount or drawer selection');
        return;
      }
    } else if (transferType === 'user_to_user') {
      if (!selectedUserId) {
        alert('Please select a user to transfer to');
        return;
      }
    } else if (transferType === 'payment_method') {
      if (!selectedPaymentMethodId) {
        alert('Please select a payment method');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (transferType === 'cash_drawer') {
        // Use existing cash drawer transfer
        await onTransfer(selectedDrawerId, transferAmount, reason || undefined);
      } else {
        // Create enhanced transfer request
        await createEnhancedTransferRequest();
      }
      onClose();
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const createEnhancedTransferRequest = async () => {
    if (!tenantId || !user?.id) return;

    const transferData = {
      tenant_id: tenantId,
      transfer_type: transferType,
      amount: Number(amount),
      currency_code: 'KES', // Could be dynamic from business settings
      from_user_id: user.id,
      to_user_id: transferType === 'user_to_user' ? selectedUserId : user.id,
      from_drawer_id: transferType === 'cash_drawer' ? currentDrawer.id : null,
      to_drawer_id: transferType === 'cash_drawer' ? selectedDrawerId : null,
      from_payment_method_id: transferType === 'payment_method' ? currentDrawer.id : null, // Assuming cash drawer for now
      to_payment_method_id: transferType === 'payment_method' ? selectedPaymentMethodId : null,
      reason: reason || null,
      status: 'pending'
    };

    const { error } = await supabase
      .from('transfer_requests')
      .insert([transferData]);

    if (error) throw error;
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cash_drawer" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cash Drawer
            </TabsTrigger>
            <TabsTrigger value="user_to_user" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User to User
            </TabsTrigger>
            <TabsTrigger value="payment_method" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method
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
                    {availableDrawers.map((drawer) => (
                      <SelectItem key={drawer.id} value={drawer.id}>
                        {drawer.drawer_name} - {formatAmount(drawer.current_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="user_to_user" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Transfer To User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="payment_method" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Transfer To Payment Method</Label>
                <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name} ({method.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  (transferType === 'cash_drawer' && !selectedDrawerId) ||
                  (transferType === 'user_to_user' && !selectedUserId) ||
                  (transferType === 'payment_method' && !selectedPaymentMethodId)
                }
              >
                {isSubmitting ? 'Processing...' : 'Create Transfer Request'}
              </Button>
            </div>
          </form>
        </Tabs>
      </div>
    </>
  );
}