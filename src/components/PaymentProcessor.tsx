import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrencySettings } from "@/lib/currency";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, CreditCard, Banknote, Smartphone, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Payment {
  id: string;
  method: string;
  amount: number;
  reference?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  requires_reference: boolean;
  display_order: number;
}

interface PaymentProcessorProps {
  totalAmount: number;
  onPaymentsChange: (payments: Payment[], remainingBalance: number) => void;
  onCashPayment?: (paymentAmount: number, totalAmount: number) => boolean;
  isProcessing?: boolean;
}

export function PaymentProcessor({ totalAmount, onPaymentsChange, onCashPayment, isProcessing = false }: PaymentProcessorProps) {
  const { formatAmount } = useCurrencySettings();
  const { tenantId } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [newPayment, setNewPayment] = useState({
    method: "cash",
    amount: 0,
    reference: "",
  });
  const { toast } = useToast();

  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = totalAmount - paidAmount;

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
        setPaymentMethods(data);
        // Set first payment method as default
        setNewPayment(prev => ({ 
          ...prev, 
          method: data[0].type 
        }));
      } else {
        // Fallback to default methods if none configured
        setPaymentMethods([
          { id: 'default-cash', name: 'Cash', type: 'cash', is_active: true, requires_reference: false, display_order: 1 },
          { id: 'default-card', name: 'Card', type: 'card', is_active: true, requires_reference: true, display_order: 2 },
          { id: 'default-credit', name: 'Credit Sale', type: 'credit', is_active: true, requires_reference: true, display_order: 3 }
        ]);
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
        { id: 'default-card', name: 'Card', type: 'card', is_active: true, requires_reference: true, display_order: 2 }
      ]);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const addPayment = () => {
    const selectedMethod = paymentMethods.find(m => m.type === newPayment.method);
    
    // For non-credit payments, validate amount is greater than 0
    if (newPayment.method !== "credit" && newPayment.amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Payment amount must be greater than 0",
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

    // Handle cash payments with potential change
    if (newPayment.method === "cash" && newPayment.amount > remainingBalance) {
      if (onCashPayment && !onCashPayment(newPayment.amount, remainingBalance)) {
        return; // Payment was handled by parent component (change modal)
      }
    }

    // For non-cash and non-credit payments, prevent overpayment
    if (newPayment.method !== "credit" && newPayment.method !== "cash" && newPayment.amount > remainingBalance) {
      toast({
        title: "Amount Too High",
        description: "Payment amount cannot exceed remaining balance",
        variant: "destructive",
      });
      return;
    }

    // For credit sales, set amount to remaining balance
    const paymentAmount = newPayment.method === "credit" ? remainingBalance : newPayment.amount;

    const payment: Payment = {
      id: Date.now().toString(),
      method: newPayment.method,
      amount: paymentAmount,
      reference: newPayment.reference || undefined,
    };

    const updatedPayments = [...payments, payment];
    setPayments(updatedPayments);
    onPaymentsChange(updatedPayments, totalAmount - updatedPayments.reduce((sum, p) => sum + p.amount, 0));

    // Reset form
    setNewPayment({
      method: "cash",
      amount: Math.min(remainingBalance - paymentAmount, 0) === 0 ? 0 : remainingBalance - paymentAmount,
      reference: "",
    });

    const paymentTypeText = newPayment.method === "credit" ? "Credit sale" : payment.method.toUpperCase();
    toast({
      title: "Payment Added",
      description: `${paymentTypeText} payment of ${formatAmount(payment.amount)} added`,
    });
  };

  const removePayment = (paymentId: string) => {
    const updatedPayments = payments.filter(p => p.id !== paymentId);
    setPayments(updatedPayments);
    onPaymentsChange(updatedPayments, totalAmount - updatedPayments.reduce((sum, p) => sum + p.amount, 0));
  };

  const setFullAmount = () => {
    setNewPayment(prev => ({
      ...prev,
      amount: remainingBalance,
    }));
  };

  const getPaymentIcon = (method: string) => {
    // Map payment types to icons
    const iconMap: Record<string, any> = {
      cash: Banknote,
      card: CreditCard,
      digital: Smartphone,
      bank_transfer: Building2,
      check: CreditCard,
      gift_card: CreditCard,
      credit: Building2,
    };
    const Icon = iconMap[method] || CreditCard;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (remainingBalance === 0) return "text-green-600";
    if (remainingBalance < 0) return "text-red-600";
    return "text-yellow-600";
  };

  const getStatusText = () => {
    if (remainingBalance === 0) return "Fully Paid";
    if (remainingBalance < 0) return `Overpaid by ${formatAmount(Math.abs(remainingBalance))}`;
    return `Balance Due: ${formatAmount(remainingBalance)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Processing</span>
          <Badge variant={remainingBalance === 0 ? "default" : "secondary"} className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
         <div className="grid grid-cols-3 gap-4 text-center">
           <div>
             <p className="text-sm text-muted-foreground">Total</p>
             <p className="font-bold">{formatAmount(totalAmount)}</p>
           </div>
           <div>
             <p className="text-sm text-muted-foreground">Paid</p>
             <p className="font-bold text-green-600">{formatAmount(paidAmount)}</p>
           </div>
           <div>
             <p className="text-sm text-muted-foreground">Balance</p>
             <p className={`font-bold ${getStatusColor()}`}>{formatAmount(remainingBalance)}</p>
           </div>
         </div>

        <Separator />

        {/* Add New Payment */}
        {remainingBalance > 0 && !isLoadingMethods && (
          <div className="space-y-3">
            <h4 className="font-medium">Add Payment</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Method</label>
                <Select 
                  value={newPayment.method} 
                  onValueChange={(value) => setNewPayment(prev => ({ ...prev, method: value }))}
                  disabled={isLoadingMethods}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.type}>
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(method.type)}
                          {method.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingMethods && (
                  <p className="text-xs text-muted-foreground mt-1">Loading payment methods...</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Amount</label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={newPayment.method === "credit" ? remainingBalance : remainingBalance}
                    value={newPayment.method === "credit" ? remainingBalance : (newPayment.amount || "")}
                    onChange={(e) => {
                      if (newPayment.method !== "credit") {
                        setNewPayment(prev => ({ 
                          ...prev, 
                          amount: parseFloat(e.target.value) || 0 
                        }));
                      }
                    }}
                    placeholder="0.00"
                    disabled={newPayment.method === "credit"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setFullAmount}
                    disabled={remainingBalance <= 0 || newPayment.method === "credit"}
                  >
                    Full
                  </Button>
                </div>
                {newPayment.method === "credit" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Credit sales will create an accounts receivable record
                  </p>
                )}
              </div>
            </div>

            {paymentMethods.find(m => m.type === newPayment.method)?.requires_reference && (
              <div>
                <label className="text-sm font-medium">
                  {newPayment.method === "credit" ? "Customer Reference" : "Reference/Authorization"}
                </label>
                <Input
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder={newPayment.method === "credit" ? "Customer PO or reference..." : "Enter reference number..."}
                  required={paymentMethods.find(m => m.type === newPayment.method)?.requires_reference}
                />
              </div>
            )}

            <Button 
              onClick={addPayment}
              disabled={(newPayment.method !== "credit" && newPayment.amount <= 0) || isProcessing}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {newPayment.method === "credit" ? "Create Credit Sale" : "Add Payment"}
            </Button>
          </div>
        )}

        {/* Payment List */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Payment Methods ({payments.length})</h4>
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getPaymentIcon(payment.method)}
                  <div>
                     <p className="font-medium">{paymentMethods.find(m => m.type === payment.method)?.name || payment.method.replace('_', ' ').toUpperCase()}</p>
                    {payment.reference && (
                      <p className="text-sm text-muted-foreground">Ref: {payment.reference}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatAmount(payment.amount)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removePayment(payment.id)}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Change Due */}
        {remainingBalance < 0 && (
           <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
             <p className="text-center font-bold text-green-700 dark:text-green-300">
               Change Due: {formatAmount(Math.abs(remainingBalance))}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}