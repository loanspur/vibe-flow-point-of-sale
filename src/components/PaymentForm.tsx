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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePaymentMethods, type PaymentMethod } from '@/hooks/usePaymentMethods';
import { useCashDrawer } from '@/hooks/useCashDrawer';

interface Payment {
  id: string;
  method: string;
  amount: number;
  reference?: string;
  date: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed';
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
  const { tenantCurrency, formatCurrency } = useApp();
  const { toast } = useToast();
  const { currentDrawer } = useCashDrawer();
  
  // Use centralized payment methods hook
  const { 
    paymentMethods, 
    loading: isLoadingMethods, 
    getActivePaymentMethods,
    getDefaultPaymentMethods 
  } = usePaymentMethods();
  
  const [newPayment, setNewPayment] = useState({
    method: '',
    amount: 0,
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'completed' as const
  });

  // Get active payment methods for purchases (filter out credit)
  const purchasePaymentMethods = getActivePaymentMethods().filter(method => method.type !== 'credit' as any);
  
  // Set default payment method if none selected
  React.  useEffect(() => {
    if (purchasePaymentMethods.length > 0 && !newPayment.method) {
      setNewPayment(prev => ({ 
        ...prev, 
        method: purchasePaymentMethods[0].type 
      }));
    }
  }, [purchasePaymentMethods, newPayment.method]);

  // Auto-switch away from cash method if drawer is closed
  useEffect(() => {
    if (newPayment.method === 'cash' && (!currentDrawer || currentDrawer.status !== 'open')) {
      // Switch to first available non-cash method
      const availableMethod = purchasePaymentMethods.find(m => m.type !== 'cash');
      if (availableMethod) {
        setNewPayment(prev => ({ 
          ...prev, 
          method: availableMethod.type 
        }));
      }
    }
  }, [currentDrawer, newPayment.method, purchasePaymentMethods]);

  const handleAddPayment = async () => {
    if (!newPayment.method || newPayment.amount <= 0) {
      toast({
        title: "Invalid Payment",
        description: "Please select a payment method and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Check if reference is required and provided
    const selectedMethod = purchasePaymentMethods.find(m => m.type === newPayment.method);
    if (selectedMethod?.requires_reference && !newPayment.reference.trim()) {
      toast({
        title: "Reference Required",
        description: "This payment method requires a reference number",
        variant: "destructive",
      });
      return;
    }

    // Check if cash drawer is open for cash payments
    if (newPayment.method === 'cash' && (!currentDrawer || currentDrawer.status !== 'open')) {
      toast({
        title: "Cash Drawer Closed",
        description: "Please open the cash drawer before processing cash payments",
        variant: "destructive",
      });
      return;
    }

    // Check if reference is unique (if provided)
    if (newPayment.reference.trim()) {
      const isDuplicate = payments.some(payment => 
        payment.reference?.toLowerCase() === newPayment.reference.toLowerCase()
      );

      if (isDuplicate) {
        toast({
          title: "Duplicate Reference",
          description: "This reference number is already used in this transaction",
          variant: "destructive",
        });
        return;
      }
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
      method: purchasePaymentMethods.length > 0 ? purchasePaymentMethods[0].type : '',
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

  if (isLoadingMethods) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading payment methods...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              {formatCurrency(totalAmount)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Paid Amount</div>
            <div className="text-lg font-semibold flex items-center justify-center gap-1">
              <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-4 w-4" />
              {formatCurrency(totalPaid)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Remaining</div>
            <div className={`text-lg font-semibold flex items-center justify-center gap-1 ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-4 w-4" />
              {formatCurrency(remainingAmount)}
            </div>
          </div>
        </div>

        {/* Add Payment Form */}
        {!isFullyPaid && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Add Payment</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={newPayment.method} onValueChange={(value) => setNewPayment(prev => ({ ...prev, method: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasePaymentMethods.map((method) => {
                      const isCashMethod = method.type === 'cash';
                      const isCashDisabled = isCashMethod && (!currentDrawer || currentDrawer.status !== 'open');
                      
                      return (
                        <SelectItem 
                          key={method.id} 
                          value={method.type}
                          disabled={isCashDisabled}
                          className={isCashDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(method.type)}
                            <span>{method.name}</span>
                            {isCashDisabled && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                (Drawer Closed)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-reference">Reference Number</Label>
                <Input
                  id="payment-reference"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Receipt number, transaction ID, etc."
                />
              </div>
              <div>
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Textarea
                id="payment-notes"
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional payment details..."
                rows={2}
              />
            </div>
            
            <Button 
              onClick={handleAddPayment} 
              disabled={disabled || !newPayment.method || newPayment.amount <= 0}
              className="w-full"
            >
              Add Payment
            </Button>
          </div>
        )}

        {/* Payment List */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Payment History</h4>
            <div className="space-y-2">
              {payments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPaymentMethodIcon(payment.method)}
                    <div>
                      <div className="font-medium">
                        {purchasePaymentMethods.find(m => m.type === payment.method)?.name || payment.method}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {payment.reference && `Ref: ${payment.reference} • `}
                        {payment.date} • {payment.notes}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-medium flex items-center gap-1">
                        <CurrencyIcon currency={tenantCurrency || 'USD'} className="h-4 w-4" />
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(payment.status)}`}></div>
                        <span className="text-xs text-muted-foreground capitalize">{payment.status}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRemovePayment(payment.id)}
                      disabled={disabled}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Status */}
        {isFullyPaid && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Payment Complete</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              All payments have been received. Total paid: {formatCurrency(totalPaid)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
