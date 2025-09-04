import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';

interface BalanceCheckData {
  assetsTotal: number;
  liabilitiesTotal: number;
  equityTotal: number;
  revenueTotal: number;
  expensesTotal: number;
  totalDebits: number;
  totalCredits: number;
  accountingEquationBalance: number;
  journalBalance: number;
}

export default function AccountingBalanceCheck() {
  const { tenantId } = useAuth();
  const { tenantCurrency, formatCurrency } = useApp();
  const { toast } = useToast();
  const [balanceData, setBalanceData] = useState<BalanceCheckData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalanceData = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      // Get account balances by category
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          balance,
          account_types (category)
        `)
        .eq('tenant_id', tenantId);

      if (accountsError) throw accountsError;

      // Calculate totals by category
      const assetsTotal = accounts
        ?.filter(acc => acc.account_types?.category === 'assets')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      const liabilitiesTotal = accounts
        ?.filter(acc => acc.account_types?.category === 'liabilities')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      const equityTotal = accounts
        ?.filter(acc => acc.account_types?.category === 'equity')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      const revenueTotal = accounts
        ?.filter(acc => acc.account_types?.category === 'income')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      const expensesTotal = accounts
        ?.filter(acc => acc.account_types?.category === 'expenses')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      // Get journal entry totals
      const { data: journalData, error: journalError } = await supabase
        .from('accounting_entries')
        .select(`
          debit_amount,
          credit_amount,
          accounting_transactions!inner (
            tenant_id,
            is_posted
          )
        `)
        .eq('accounting_transactions.tenant_id', tenantId)
        .eq('accounting_transactions.is_posted', true);

      if (journalError) throw journalError;

      const totalDebits = journalData?.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0) || 0;
      const totalCredits = journalData?.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0) || 0;

      setBalanceData({
        assetsTotal,
        liabilitiesTotal,
        equityTotal,
        revenueTotal,
        expensesTotal,
        totalDebits,
        totalCredits,
        accountingEquationBalance: assetsTotal - liabilitiesTotal - equityTotal + revenueTotal - expensesTotal,
        journalBalance: totalDebits - totalCredits
      });

    } catch (error) {
      console.error('Error fetching balance data:', error);
      toast({ title: "Error", description: "Failed to fetch balance data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const syncAccountBalances = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc('update_account_balances_from_entries');
      if (error) throw error;

      toast({ title: "Success", description: "Account balances synchronized successfully" });
      await fetchBalanceData();
    } catch (error) {
      console.error('Error syncing balances:', error);
      toast({ title: "Error", description: "Failed to sync account balances", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchBalanceData();
    }
  }, [tenantId]);

  // Use centralized formatCurrency from AppContext instead of local implementation
  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: tenantCurrency || 'USD'
  //   }).format(amount);
  // };

  const isJournalBalanced = balanceData?.journalBalance === 0;
  const isEquationBalanced = Math.abs(balanceData?.accountingEquationBalance || 0) < 0.01;

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
          <p className="text-muted-foreground text-center">
            Balance checking requires an active tenant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Accounting Balance Check</h3>
          <p className="text-sm text-muted-foreground">Verify accounting integrity and balance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBalanceData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={syncAccountBalances} disabled={loading}>
            Sync Balances
          </Button>
        </div>
      </div>

      {/* Balance Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Journal Balance</CardTitle>
            {isJournalBalanced ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isJournalBalanced ? "Balanced" : "Unbalanced"}
            </div>
            <p className="text-xs text-muted-foreground">
              Debits: {formatCurrency(balanceData?.totalDebits || 0)} | 
              Credits: {formatCurrency(balanceData?.totalCredits || 0)}
            </p>
            {!isJournalBalanced && (
              <p className="text-xs text-red-600 mt-1">
                Difference: {formatCurrency(balanceData?.journalBalance || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounting Equation</CardTitle>
            {isEquationBalanced ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isEquationBalanced ? "Balanced" : "Check Required"}
            </div>
            <p className="text-xs text-muted-foreground">
              Assets = Liabilities + Equity
            </p>
            {!isEquationBalanced && (
              <p className="text-xs text-orange-600 mt-1">
                Difference: {formatCurrency(balanceData?.accountingEquationBalance || 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Account Category Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-blue-600">Assets</h4>
              <p className="text-2xl font-bold">{formatCurrency(balanceData?.assetsTotal || 0)}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-red-600">Liabilities</h4>
              <p className="text-2xl font-bold">{formatCurrency(balanceData?.liabilitiesTotal || 0)}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-green-600">Equity</h4>
              <p className="text-2xl font-bold">{formatCurrency(balanceData?.equityTotal || 0)}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-emerald-600">Revenue</h4>
              <p className="text-2xl font-bold">{formatCurrency(Math.abs(balanceData?.revenueTotal || 0))}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-orange-600">Expenses</h4>
              <p className="text-2xl font-bold">{formatCurrency(balanceData?.expensesTotal || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}