import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, CreditCard, Banknote, Smartphone, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  method: string;
  amount: number;
  reference?: string;
}

interface PaymentProcessorProps {
  totalAmount: number;
  onPaymentsChange: (payments: Payment[], remainingBalance: number) => void;
  isProcessing?: boolean;
}

export function PaymentProcessor({ totalAmount, onPaymentsChange, isProcessing }: PaymentProcessorProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPayment, setNewPayment] = useState({
    method: "cash",
    amount: 0,
    reference: "",
  });
  const { toast } = useToast();

  const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingBalance = totalAmount - paidAmount;

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "card", label: "Card", icon: CreditCard },
    { value: "digital", label: "Digital Wallet", icon: Smartphone },
    { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
    { value: "check", label: "Check", icon: CreditCard },
    { value: "gift_card", label: "Gift Card", icon: CreditCard },
    { value: "credit", label: "Credit Sale (Pay Later)", icon: Building2 },
  ];

  const addPayment = () => {
    if (newPayment.amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Payment amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // For credit sales, allow the full amount to be "paid" (but as credit)
    if (newPayment.method !== "credit" && newPayment.amount > remainingBalance) {
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
      description: `${paymentTypeText} payment of $${payment.amount.toFixed(2)} added`,
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
    const paymentMethod = paymentMethods.find(pm => pm.value === method);
    const Icon = paymentMethod?.icon || CreditCard;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (remainingBalance === 0) return "text-green-600";
    if (remainingBalance < 0) return "text-red-600";
    return "text-yellow-600";
  };

  const getStatusText = () => {
    if (remainingBalance === 0) return "Fully Paid";
    if (remainingBalance < 0) return `Overpaid by $${Math.abs(remainingBalance).toFixed(2)}`;
    return `Balance Due: $${remainingBalance.toFixed(2)}`;
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
            <p className="font-bold">${totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="font-bold text-green-600">${paidAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className={`font-bold ${getStatusColor()}`}>${remainingBalance.toFixed(2)}</p>
          </div>
        </div>

        <Separator />

        {/* Add New Payment */}
        {remainingBalance > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Add Payment</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Method</label>
                <Select 
                  value={newPayment.method} 
                  onValueChange={(value) => setNewPayment(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
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

            {(newPayment.method === "card" || newPayment.method === "bank_transfer" || newPayment.method === "check" || newPayment.method === "credit") && (
              <div>
                <label className="text-sm font-medium">
                  {newPayment.method === "credit" ? "Customer Reference" : "Reference/Authorization"}
                </label>
                <Input
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder={newPayment.method === "credit" ? "Customer PO or reference..." : "Enter reference number..."}
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
                    <p className="font-medium">{payment.method.replace('_', ' ').toUpperCase()}</p>
                    {payment.reference && (
                      <p className="text-sm text-muted-foreground">Ref: {payment.reference}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">${payment.amount.toFixed(2)}</span>
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
              Change Due: ${Math.abs(remainingBalance).toFixed(2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}