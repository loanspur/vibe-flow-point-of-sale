import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, CreditCard, Banknote, Smartphone, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentMethods, type PaymentMethod } from '@/hooks/usePaymentMethods';
import { useCashDrawer } from '@/hooks/useCashDrawer';

interface Payment {
  id: string;
  method: string;
  method_id: string;
  amount: number;
  reference: string;
}

interface EnhancedPaymentProcessorProps {
  totalAmount: number;
  payments: Payment[];
  onPaymentsChange: (payments: Payment[], remainingBalance: number) => void;
  selectedCustomer: any;
  onCashPayment?: (amount: number) => boolean;
  onMpesaPayment?: () => void;
  mpesaEnabled?: boolean;
}

export function EnhancedPaymentProcessor({
  totalAmount,
  payments,
  onPaymentsChange,
  selectedCustomer,
  onCashPayment,
  onMpesaPayment,
  mpesaEnabled = false
}: EnhancedPaymentProcessorProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const { currentDrawer } = useCashDrawer();
  
  // Use the payment methods hook instead of local state
  const { 
    paymentMethods: dbPaymentMethods, 
    loading: paymentMethodsLoading, 
    error: paymentMethodsError,
    getActivePaymentMethods,
    getDefaultPaymentMethods 
  } = usePaymentMethods();
  
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const remainingBalance = totalAmount - payments.reduce((sum, payment) => sum + payment.amount, 0);
  const isFullyPaid = remainingBalance <= 0;
  const hasCreditPayment = payments.some(p => p.method.toLowerCase().includes('credit'));

  // Get active payment methods or fallback to defaults
  const paymentMethods = dbPaymentMethods.length > 0 ? getActivePaymentMethods() : getDefaultPaymentMethods();

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedMethod]);

  // Auto-switch away from cash method if drawer is closed
  useEffect(() => {
    if (selectedMethod) {
      const selectedMethodDetails = paymentMethods.find(m => m.id === selectedMethod);
      const isCashMethod = selectedMethodDetails?.type === 'cash';
      const isCashDisabled = isCashMethod && (!currentDrawer || currentDrawer.status !== 'open');
      
      if (isCashDisabled) {
        // Switch to first available non-cash method
        const availableMethod = paymentMethods.find(m => m.type !== 'cash');
        if (availableMethod) {
          setSelectedMethod(availableMethod.id);
        }
      }
    }
  }, [currentDrawer, selectedMethod, paymentMethods]);

  // Show error if payment methods fail to load
  useEffect(() => {
    if (paymentMethodsError) {
      toast({
        title: "Payment Methods Error",
        description: "Failed to load payment methods. Using default options.",
        variant: "destructive",
      });
    }
  }, [paymentMethodsError, toast]);


  const getSelectedMethodDetails = () => {
    return paymentMethods.find(m => m.id === selectedMethod);
  };

  const validateCreditPayment = () => {
    const selectedMethodDetails = getSelectedMethodDetails();
    if (selectedMethodDetails && selectedMethodDetails.type === 'credit') {
      if (!selectedCustomer || selectedCustomer.id === 'walk-in') {
        toast({
          title: "Credit Payment Error",
          description: "Credit payments are only available for registered customers, not walk-in customers",
          variant: "destructive",
        });
        return false;
      }

      if (!selectedCustomer.credit_limit || selectedCustomer.credit_limit <= 0) {
        toast({
          title: "Credit Payment Error",
          description: "This customer does not have a credit limit set",
          variant: "destructive",
        });
        return false;
      }

      const currentCreditBalance = selectedCustomer.current_credit_balance || 0;
      const availableCredit = selectedCustomer.credit_limit - currentCreditBalance;

      if (paymentAmount > availableCredit) {
        toast({
          title: "Credit Limit Exceeded",
          description: `Available credit: ${formatCurrency(availableCredit)}, Payment amount: ${formatCurrency(paymentAmount)}`,
          variant: "destructive",
        });
        return false;
      }

      if (!paymentReference.trim()) {
        toast({
          title: "Reference Required",
          description: "Reference number is required for credit payments",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const addPayment = () => {
    if (paymentAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (paymentAmount > remainingBalance) {
      toast({
        title: "Amount Exceeds Balance",
        description: `Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`,
        variant: "destructive",
      });
      return;
    }

    if (!validateCreditPayment()) {
      return;
    }

    const methodDetails = getSelectedMethodDetails();
    if (!methodDetails) {
      toast({
        title: "Error",
        description: "Please select a valid payment method",
        variant: "destructive",
      });
      return;
    }

    // Handle special payment methods
    if (methodDetails.type === 'cash') {
      // Check if cash drawer is open
      if (!currentDrawer || currentDrawer.status !== 'open') {
        toast({
          title: "Cash Drawer Closed",
          description: "Please open the cash drawer before processing cash payments",
          variant: "destructive",
        });
        return;
      }
      
      if (onCashPayment) {
        const shouldProceed = onCashPayment(paymentAmount);
        if (!shouldProceed) return;
      }
    }

    if (methodDetails.type === 'mobile_money' && methodDetails.name.toLowerCase().includes('mpesa') && onMpesaPayment) {
      onMpesaPayment();
      return;
    }

    const newPayment: Payment = {
      id: Date.now().toString(),
      method: methodDetails.name,
      method_id: methodDetails.id,
      amount: paymentAmount,
      reference: paymentReference
    };

    const updatedPayments = [...payments, newPayment];
    const newRemainingBalance = totalAmount - updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    onPaymentsChange(updatedPayments, newRemainingBalance);
    
    // Reset form
    setPaymentAmount(0);
    setPaymentReference('');
    
    toast({
      title: "Payment Added",
      description: `${methodDetails.name} payment of ${formatCurrency(paymentAmount)} added successfully`,
    });
  };

  const removePayment = (paymentId: string) => {
    const updatedPayments = payments.filter(p => p.id !== paymentId);
    const newRemainingBalance = totalAmount - updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    onPaymentsChange(updatedPayments, newRemainingBalance);
    
    toast({
      title: "Payment Removed",
      description: "Payment has been removed from the sale",
    });
  };

  const getMethodIcon = (methodName: string) => {
    const method = paymentMethods.find(m => m.name === methodName);
    return method?.icon || '💳';
  };

  const getMethodColor = (methodName: string) => {
    const method = paymentMethods.find(m => m.name === methodName);
    return method?.color || '#000000';
  };

  // Show loading state while payment methods are being fetched
  if (paymentMethodsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading payment methods...</p>
            </div>
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
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <Label className="text-sm font-medium">Total Amount</Label>
            <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <div>
            <Label className="text-sm font-medium">Remaining Balance</Label>
            <p className={`text-lg font-bold ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remainingBalance)}
            </p>
          </div>
        </div>

        {/* Payment Status */}
        <div className="flex items-center justify-between">
          <Badge 
            variant={isFullyPaid ? "default" : "secondary"}
            className={`${isFullyPaid ? 'bg-green-500 text-white hover:bg-green-600 font-bold' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
          >
            {isFullyPaid ? 'Fully Paid' : 'Partially Paid'}
          </Badge>
          
          {hasCreditPayment && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              Credit Sale
            </Badge>
          )}
        </div>

        {/* Cash Drawer Status */}
        {currentDrawer && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              <span className="text-sm font-medium">Cash Drawer</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={currentDrawer.status === 'open' ? "default" : "destructive"}
                className={currentDrawer.status === 'open' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
              >
                {currentDrawer.status === 'open' ? 'Open' : 'Closed'}
              </Badge>
              {currentDrawer.status === 'open' && (
                <span className="text-sm text-muted-foreground">
                  Balance: {formatCurrency(currentDrawer.current_balance)}
                </span>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Add Payment Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => {
                    const isCashMethod = method.type === 'cash';
                    const isCashDisabled = isCashMethod && (!currentDrawer || currentDrawer.status !== 'open');
                    
                    return (
                      <SelectItem 
                        key={method.id} 
                        value={method.id}
                        disabled={isCashDisabled}
                        className={isCashDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <div className="flex items-center gap-2">
                          <span>{method.icon}</span>
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
              <Label htmlFor="payment-amount">Amount ({formatCurrency(0).replace('0.00', '')})</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                max={remainingBalance}
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {getSelectedMethodDetails()?.requires_reference && (
            <div>
              <Label htmlFor="payment-reference">
                Reference Number {getSelectedMethodDetails()?.type === 'credit' && '*'}
              </Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Enter reference number"
                required={getSelectedMethodDetails()?.type === 'credit'}
              />
            </div>
          )}

          <Button 
            onClick={addPayment}
            disabled={paymentAmount <= 0 || paymentAmount > remainingBalance}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </div>

        <Separator />

        {/* Payment List */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Payment Breakdown</Label>
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getMethodIcon(payment.method)}</span>
                  <div>
                    <p className="font-medium">{payment.method}</p>
                    {payment.reference && (
                      <p className="text-sm text-muted-foreground">Ref: {payment.reference}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatCurrency(payment.amount)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePayment(payment.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
