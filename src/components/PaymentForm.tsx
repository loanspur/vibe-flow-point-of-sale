import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign, Receipt, Calendar, Banknote, Smartphone, Building2 } from 'lucide-react';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  method: string;
  amount: number;
  reference?: string;
  date: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed';
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  requires_reference: boolean;
  display_order: number;
}

interface PaymentFormProps {
  totalAmount: number;
  remainingAmount: number;
  payments: Payment[];
  onAddPayment: (payment: Omit<Payment, 'id'>) => void;
  onRemovePayment: (paymentId: string) => void;
  disabled?: boolean;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  totalAmount,
  remainingAmount,
  payments,
  onAddPayment,
  onRemovePayment,
  disabled = false
}) => {
  const { tenantCurrency, formatLocalCurrency } = useApp();
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [newPayment, setNewPayment] = useState({
    method: '',
    amount: 0,
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'completed' as const
  });

  // Fetch payment methods from database
  useEffect(() => {
    fetchPaymentMethods();
  }, [tenantId]);

  const fetchPaymentMethods = async () => {
    if (!tenantId) {
      setPaymentMethods([]);
      setIsLoadingMethods(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Filter out credit sales for purchase payments (only show payment methods, not credit)
        const purchasePaymentMethods = data.filter(method => method.type !== 'credit');
        setPaymentMethods(purchasePaymentMethods);
        
        // Set first payment method as default
        if (purchasePaymentMethods.length > 0) {
          setNewPayment(prev => ({ 
            ...prev, 
            method: purchasePaymentMethods[0].type 
          }));
        }
      } else {
        // Fallback to default methods if none configured (excluding credit)
        setPaymentMethods([
          { id: 'default-cash', name: 'Cash', type: 'cash', is_active: true, requires_reference: false, display_order: 1 },
          { id: 'default-card', name: 'Credit/Debit Card', type: 'card', is_active: true, requires_reference: true, display_order: 2 },
          { id: 'default-bank', name: 'Bank Transfer', type: 'bank_transfer', is_active: true, requires_reference: true, display_order: 3 },
          { id: 'default-check', name: 'Check', type: 'check', is_active: true, requires_reference: true, display_order: 4 }
        ]);
        setNewPayment(prev => ({ ...prev, method: 'cash' }));
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        title: "Warning",
        description: "Could not load payment methods. Using defaults.",
        variant: "destructive",
      });
      // Use fallback methods
      setPaymentMethods([
        { id: 'default-cash', name: 'Cash', type: 'cash', is_active: true, requires_reference: false, display_order: 1 },
        { id: 'default-card', name: 'Credit/Debit Card', type: 'card', is_active: true, requires_reference: true, display_order: 2 }
      ]);
      setNewPayment(prev => ({ ...prev, method: 'cash' }));
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const handleAddPayment = () => {
    const selectedMethod = paymentMethods.find(m => m.type === newPayment.method);
    
    if (!newPayment.method || newPayment.amount <= 0) {
      toast({
        title: "Invalid Payment",
        description: "Please select a payment method and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Check if reference is required
    if (selectedMethod?.requires_reference && !newPayment.reference?.trim()) {
      toast({
        title: "Reference Required",
        description: `${selectedMethod.name} payments require a reference number`,
        variant: "destructive",
      });
      return;
    }

    if (newPayment.amount > remainingAmount) {
      toast({
        title: "Amount Too High",
        description: "Payment amount cannot exceed remaining balance",
        variant: "destructive",
      });
      return;
    }

    onAddPayment(newPayment);
    setNewPayment({
      method: paymentMethods.length > 0 ? paymentMethods[0].type : '',
      amount: 0,
      reference: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'completed'
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    // Map payment types to icons
    const iconMap: Record<string, any> = {
      cash: Banknote,
      card: CreditCard,
      digital: Smartphone,
      bank_transfer: Building2,
      check: Receipt,
      gift_card: CreditCard,
      trade_credit: Receipt,
    };
    const Icon = iconMap[method] || DollarSign;
    return Icon;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const isFullyPaid = remainingAmount <= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Amount</div>
            <div className="text-lg font-semibold flex items-center justify-center gap-1">
              <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-4 w-4" />
              {formatLocalCurrency(totalAmount)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Paid Amount</div>
            <div className="text-lg font-semibold text-green-600 flex items-center justify-center gap-1">
              <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-4 w-4" />
              {formatLocalCurrency(totalPaid)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className={`text-lg font-semibold flex items-center justify-center gap-1 ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
              <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-4 w-4" />
              {formatLocalCurrency(remainingAmount)}
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex items-center justify-center">
          <Badge className={isFullyPaid ? 'bg-green-500' : 'bg-yellow-500'}>
            {isFullyPaid ? 'Fully Paid' : 'Payment Required'}
          </Badge>
        </div>

        {/* Existing Payments */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <Label>Payment History</Label>
            {payments.map((payment) => {
              const Icon = getPaymentMethodIcon(payment.method);
              const methodName = paymentMethods.find(m => m.type === payment.method)?.name || 
                               payment.method.replace('_', ' ').toUpperCase();
              return (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{methodName}</div>
                      <div className="text-sm text-muted-foreground">
                        {payment.date} {payment.reference && `• ${payment.reference}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                    <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    {!disabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemovePayment(payment.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Payment */}
        {!disabled && !isFullyPaid && (
          <div className="space-y-4 border-t pt-4">
            <Label>Add Payment</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select
                  value={newPayment.method}
                  onValueChange={(value) => setNewPayment(prev => ({ ...prev, method: value }))}
                  disabled={isLoadingMethods}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => {
                      const Icon = getPaymentMethodIcon(method.type);
                      return (
                        <SelectItem key={method.id} value={method.type}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {method.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {isLoadingMethods && (
                  <p className="text-xs text-muted-foreground mt-1">Loading payment methods...</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingAmount}
                  value={newPayment.amount || ''}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-reference">
                  Reference Number {paymentMethods.find(m => m.type === newPayment.method)?.requires_reference && '*'}
                </Label>
                <Input
                  id="payment-reference"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Check #, Transaction ID, etc."
                  required={paymentMethods.find(m => m.type === newPayment.method)?.requires_reference}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={newPayment.date}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Textarea
                id="payment-notes"
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional payment details..."
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAddPayment} 
                disabled={!newPayment.method || newPayment.amount <= 0 || isLoadingMethods}
              >
                Add Payment
              </Button>
              <Button
                variant="outline"
                onClick={() => setNewPayment(prev => ({ ...prev, amount: remainingAmount }))}
                disabled={remainingAmount <= 0}
              >
                Pay Full Amount
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
