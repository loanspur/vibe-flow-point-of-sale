import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Building,
  CreditCard,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  DollarSign,
  BarChart3
} from 'lucide-react';

interface AccountingMetrics {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netIncome: number;
  unpostedTransactions: number;
  totalAccounts: number;
}

export default function AccountingDashboard() {
  const { tenantId } = useAuth();
  const { toast } = useToast();

  const [metrics, setMetrics] = useState<AccountingMetrics>({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    netIncome: 0,
    unpostedTransactions: 0,
    totalAccounts: 0
  });
  const [loading, setLoading] = useState(false);

  // Fetch accounting metrics
  const fetchMetrics = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      // Get account balances by category
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select(`
          id,
          balance,
          is_active,
          account_types (
            category
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      // Calculate totals by category
      const totalAssets = accounts
        ?.filter(acc => acc.account_types?.category === 'assets')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      const totalLiabilities = accounts
        ?.filter(acc => acc.account_types?.category === 'liabilities')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      const totalEquity = accounts
        ?.filter(acc => acc.account_types?.category === 'equity')
        .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

      // Get monthly income/expense data using the calculate_profit_loss function
      const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data: profitLossData, error: profitLossError } = await supabase
        .rpc('calculate_profit_loss', {
          tenant_id_param: tenantId,
          start_date_param: startDate,
          end_date_param: endDate
        });

      if (profitLossError) throw profitLossError;

      const monthlyIncome = profitLossData?.[0]?.income || 0;
      const monthlyExpenses = profitLossData?.[0]?.expenses || 0;
      const netIncome = profitLossData?.[0]?.profit_loss || 0;

      // Get unposted transactions count
      const { count: unpostedCount, error: unpostedError } = await supabase
        .from('accounting_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_posted', false);

      if (unpostedError) throw unpostedError;

      setMetrics({
        totalAssets,
        totalLiabilities,
        totalEquity,
        monthlyIncome,
        monthlyExpenses,
        netIncome,
        unpostedTransactions: unpostedCount || 0,
        totalAccounts: accounts?.length || 0
      });

    } catch (error) {
      console.error('Error fetching accounting metrics:', error);
      toast({ title: "Error", description: "Failed to fetch accounting metrics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchMetrics();
    }
  }, [tenantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (!tenantId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tenant Required</h3>
          <p className="text-muted-foreground text-center">
            Accounting dashboard requires an active tenant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Accounting Overview</h3>
        <p className="text-sm text-muted-foreground">Key financial metrics and business performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-500 text-white">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalAssets)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-500 text-white">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Liabilities</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalLiabilities)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-500 text-white">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Equity</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalEquity)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg text-white ${metrics.netIncome >= 0 ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income (MTD)</p>
                <p className={`text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.netIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span>Monthly Income & Expenses</span>
            </CardTitle>
            <CardDescription>Current month performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Income</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(metrics.monthlyIncome)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (metrics.monthlyIncome / Math.max(metrics.monthlyIncome, metrics.monthlyExpenses)) * 100)}%` 
                  }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Expenses</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(metrics.monthlyExpenses)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (metrics.monthlyExpenses / Math.max(metrics.monthlyIncome, metrics.monthlyExpenses)) * 100)}%` 
                  }}
                />
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Net Income</span>
                  <span className={`text-lg font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(metrics.netIncome)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <span>Balance Sheet Summary</span>
            </CardTitle>
            <CardDescription>Financial position overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Assets</span>
                <div className="text-right">
                  <span className="text-lg font-bold">{formatCurrency(metrics.totalAssets)}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(metrics.totalAssets, metrics.totalAssets + metrics.totalLiabilities + metrics.totalEquity)}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Liabilities</span>
                <div className="text-right">
                  <span className="text-lg font-bold">{formatCurrency(metrics.totalLiabilities)}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(metrics.totalLiabilities, metrics.totalAssets + metrics.totalLiabilities + metrics.totalEquity)}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Equity</span>
                <div className="text-right">
                  <span className="text-lg font-bold">{formatCurrency(metrics.totalEquity)}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage(metrics.totalEquity, metrics.totalAssets + metrics.totalLiabilities + metrics.totalEquity)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Debt-to-Equity Ratio</span>
                  <span className="text-lg font-bold">
                    {metrics.totalEquity !== 0 ? (metrics.totalLiabilities / metrics.totalEquity).toFixed(2) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{metrics.totalAccounts}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unposted Transactions</p>
                <p className="text-2xl font-bold">{metrics.unpostedTransactions}</p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${metrics.unpostedTransactions > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Ratio</p>
                <p className="text-2xl font-bold">
                  {metrics.totalLiabilities !== 0 ? (metrics.totalAssets / metrics.totalLiabilities).toFixed(2) : 'N/A'}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}