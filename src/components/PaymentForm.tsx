import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CreditCard, DollarSign, Receipt, Calendar } from 'lucide-react';
import { CurrencyIcon } from '@/components/ui/currency-icon';
import { useApp } from '@/contexts/AppContext';

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

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: DollarSign },
  { value: 'check', label: 'Check', icon: Receipt },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'trade_credit', label: 'Trade Credit', icon: Receipt },
];

export const PaymentForm: React.FC<PaymentFormProps> = ({
  totalAmount,
  remainingAmount,
  payments,
  onAddPayment,
  onRemovePayment,
  disabled = false
}) => {
  const { tenantCurrency, formatLocalCurrency } = useApp();
  const [newPayment, setNewPayment] = useState({
    method: '',
    amount: 0,
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'completed' as const
  });

  const handleAddPayment = () => {
    if (!newPayment.method || newPayment.amount <= 0) {
      return;
    }

    if (newPayment.amount > remainingAmount) {
      return;
    }

    onAddPayment(newPayment);
    setNewPayment({
      method: '',
      amount: 0,
      reference: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'completed'
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    const methodConfig = PAYMENT_METHODS.find(m => m.value === method);
    return methodConfig?.icon || DollarSign;
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
              return (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">
                        {PAYMENT_METHODS.find(m => m.value === payment.method)?.label}
                      </div>
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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <method.icon className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="payment-reference">Reference Number</Label>
                <Input
                  id="payment-reference"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Check #, Transaction ID, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
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
              <Button onClick={handleAddPayment} disabled={!newPayment.method || newPayment.amount <= 0}>
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
