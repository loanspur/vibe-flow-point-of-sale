import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, DollarSign, FileText, Calendar, User, Building } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createPaymentJournalEntry } from '@/lib/accounting-integration';
import { format } from 'date-fns';

interface ARAPItem {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  original_amount: number;
  outstanding_amount: number;
  status: string;
  customer_name?: string;
  supplier_name?: string;
  reference_type: string;
  reference_id: string;
}

interface ARAPPaymentProcessorProps {
  type: 'receivable' | 'payable';
}

export function ARAPPaymentProcessor({ type }: ARAPPaymentProcessorProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<ARAPItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ARAPItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchItems();
    }
  }, [tenantId, type]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const tableName = type === 'receivable' ? 'accounts_receivable' : 'accounts_payable';
      const contactType = type === 'receivable' ? 'customer' : 'supplier';
      
      const { data, error } = await supabase
        .from(tableName)
        .select(`*`)
        .eq('tenant_id', tenantId)
        .in('status', ['outstanding', 'partial', 'overdue'])
        .gt('outstanding_amount', 0)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Fetch contact names separately
      const contactIds = (data || []).map((item: any) => 
        type === 'receivable' ? item.customer_id : item.supplier_id
      ).filter(Boolean);

      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name')
        .in('id', contactIds);

      const contactLookup = (contacts || []).reduce((acc: Record<string, string>, contact: any) => {
        acc[contact.id] = contact.name;
        return acc;
      }, {} as Record<string, string>);

      const formattedItems = (data || []).map((item: any) => ({
        id: item.id,
        invoice_number: item.invoice_number,
        invoice_date: item.invoice_date,
        due_date: item.due_date,
        original_amount: item.original_amount,
        outstanding_amount: item.outstanding_amount,
        status: item.status,
        customer_name: type === 'receivable' ? contactLookup[item.customer_id] : undefined,
        supplier_name: type === 'payable' ? contactLookup[item.supplier_id] : undefined,
        reference_type: item.reference_type,
        reference_id: item.reference_id,
      }));

      setItems(formattedItems);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to fetch ${type === 'receivable' ? 'receivables' : 'payables'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!selectedItem || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid Payment",
        description: "Please select an item and enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > selectedItem.outstanding_amount) {
      toast({
        title: "Invalid Amount",
        description: "Payment amount cannot exceed outstanding balance",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create payment record in ar_ap_payments
      const { error: paymentError } = await supabase
        .from('ar_ap_payments')
        .insert({
          tenant_id: tenantId,
          reference_id: selectedItem.id,
          payment_type: type,
          payment_method: paymentMethod,
          amount: amount,
          reference_number: paymentReference || null,
          payment_date: new Date().toISOString().split('T')[0],
          notes: paymentNotes || null,
        });

      if (paymentError) throw paymentError;

      // Update AR/AP record
      const newOutstandingAmount = selectedItem.outstanding_amount - amount;
      const newPaidAmount = selectedItem.original_amount - newOutstandingAmount;
      const newStatus = newOutstandingAmount === 0 ? 'paid' : 'partial';

      const tableName = type === 'receivable' ? 'accounts_receivable' : 'accounts_payable';
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          outstanding_amount: newOutstandingAmount,
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Update cash drawer for cash payments
      if (paymentMethod === 'cash') {
        try {
          const { data: drawer } = await supabase
            .from("cash_drawers")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("user_id", user.id)
            .eq("status", "open")
            .eq("is_active", true)
            .maybeSingle();

          if (drawer) {
            const balanceChange = type === 'receivable' ? amount : -amount;
            
            await supabase
              .from("cash_drawers")
              .update({ 
                current_balance: drawer.current_balance + balanceChange 
              })
              .eq("id", drawer.id);

            await supabase
              .from("cash_transactions")
              .insert({
                tenant_id: tenantId,
                cash_drawer_id: drawer.id,
                transaction_type: type === 'receivable' ? "ar_payment" : "ap_payment",
                amount: balanceChange,
                balance_after: drawer.current_balance + balanceChange,
                description: `${type === 'receivable' ? 'Customer' : 'Supplier'} payment - ${selectedItem.invoice_number}`,
                reference_id: selectedItem.reference_id,
                reference_type: selectedItem.reference_type,
                performed_by: user.id,
              });
          }
        } catch (drawerError) {
          console.error('Error updating cash drawer:', drawerError);
        }
      }

      // Create accounting journal entry
      try {
        await createPaymentJournalEntry(tenantId, {
          paymentId: selectedItem.id,
          paymentType: type,
          referenceId: selectedItem.reference_id,
          amount: amount,
          paymentMethod: paymentMethod,
          createdBy: user.id,
        });
      } catch (accountingError) {
        console.error('Accounting entry error:', accountingError);
        toast({
          title: "Warning",
          description: "Payment recorded but accounting entry failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Payment Processed",
        description: `Payment of ${amount} processed successfully for ${selectedItem.invoice_number}`,
      });

      // Reset form and refresh data
      setSelectedItem(null);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentReference('');
      setPaymentNotes('');
      fetchItems();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'outstanding':
        return <Badge variant="destructive">Outstanding</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partial</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {type === 'receivable' ? 'Accounts Receivable' : 'Accounts Payable'} Payments
        </h1>
        <Button onClick={fetchItems} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Outstanding {type === 'receivable' ? 'Invoices' : 'Bills'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No outstanding {type === 'receivable' ? 'receivables' : 'payables'} found
                </p>
              ) : (
                items.map(item => (
                  <Card 
                    key={item.id}
                    className={`cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{item.invoice_number}</h3>
                            {getStatusBadge(item.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {type === 'receivable' ? item.customer_name : item.supplier_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Due: {format(new Date(item.due_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${item.outstanding_amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            of ${item.original_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItem ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <h3 className="font-medium">{selectedItem.invoice_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {type === 'receivable' ? selectedItem.customer_name : selectedItem.supplier_name}
                  </p>
                  <p className="text-lg font-semibold">
                    Outstanding: ${selectedItem.outstanding_amount.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Payment Amount</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedItem.outstanding_amount}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_reference">Reference Number</Label>
                  <Input
                    id="payment_reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction reference (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_notes">Notes</Label>
                  <Textarea
                    id="payment_notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Additional notes (optional)"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={processPayment}
                  disabled={isSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full"
                >
                  {isSubmitting ? "Processing..." : "Record Payment"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Select an item from the list to record a payment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}