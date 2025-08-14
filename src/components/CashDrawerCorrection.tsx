import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function CashDrawerCorrection() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const correctMissingCashTransaction = async () => {
    if (!tenantId || !user?.id) return;

    setIsProcessing(true);
    try {
      // Get current cash drawer
      const { data: drawer } = await supabase
        .from('cash_drawers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .eq('status', 'open')
        .eq('is_active', true)
        .single();

      if (!drawer) {
        toast({
          title: "Error",
          description: "No open cash drawer found",
          variant: "destructive",
        });
        return;
      }

      // Calculate correct balance (current balance - supplier payment)
      const supplierPaymentAmount = 9000;
      const correctedBalance = drawer.current_balance - supplierPaymentAmount;

      // Update cash drawer balance
      const { error: drawerError } = await supabase
        .from('cash_drawers')
        .update({ 
          current_balance: correctedBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', drawer.id);

      if (drawerError) throw drawerError;

      // Create the missing cash transaction record
      const { error: transactionError } = await supabase
        .from('cash_transactions')
        .insert({
          tenant_id: tenantId,
          cash_drawer_id: drawer.id,
          transaction_type: 'ap_payment',
          amount: -supplierPaymentAmount,
          balance_after: correctedBalance,
          description: 'Supplier payment - Corrected missing transaction (JE-1755168584677-0RKZD)',
          reference_id: 'e5fccb62-a95b-4f5c-815e-cfa098f08c6c',
          reference_type: 'accounts_payable',
          performed_by: user.id,
          transaction_date: '2025-08-14T10:49:45.000Z'
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Correction Applied",
        description: `Cash drawer corrected. Balance updated from KES 6,195 to KES ${correctedBalance.toLocaleString()}`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply correction",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Cash Drawer Correction Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-orange-700">
          <p className="font-medium">Issue Detected:</p>
          <p>Supplier payment of KES 9,000 (Reference: JE-1755168584677-0RKZD) was recorded but the cash drawer wasn't updated.</p>
        </div>
        
        <div className="bg-white p-3 rounded border border-orange-200">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-orange-600" />
            <span>Current Balance: KES 6,195.00</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span>Correct Balance: KES -2,805.00</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Payment Time: Aug 14, 2025 at 10:49 AM</span>
          </div>
        </div>

        <Button 
          onClick={correctMissingCashTransaction}
          disabled={isProcessing}
          className="w-full"
          variant="outline"
        >
          {isProcessing ? "Applying Correction..." : "Apply Cash Drawer Correction"}
        </Button>
      </CardContent>
    </Card>
  );
}