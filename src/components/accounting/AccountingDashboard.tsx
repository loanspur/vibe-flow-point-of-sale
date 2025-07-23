import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useApp } from '@/contexts/AppContext';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
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
  const { formatCurrency } = useApp();

  // Optimized metrics fetching with caching
  const { data: metrics, loading, refetch: refetchMetrics } = useOptimizedQuery(
    async () => {
      if (!tenantId) return { data: null, error: null };

      try {
        // Fetch all data in parallel for better performance
        const [accountsResponse, profitLossResponse, unpostedResponse] = await Promise.all([
          supabase
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
            .eq('is_active', true),
          supabase
            .rpc('calculate_profit_loss', {
              tenant_id_param: tenantId,
              start_date_param: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
              end_date_param: format(endOfMonth(new Date()), 'yyyy-MM-dd')
            }),
          supabase
            .from('accounting_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_posted', false)
        ]);

        if (accountsResponse.error) throw accountsResponse.error;
        if (profitLossResponse.error) throw profitLossResponse.error;
        if (unpostedResponse.error) throw unpostedResponse.error;

        // Calculate totals by category
        const totalAssets = accountsResponse.data
          ?.filter(acc => acc.account_types?.category === 'assets')
          .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

        const totalLiabilities = accountsResponse.data
          ?.filter(acc => acc.account_types?.category === 'liabilities')
          .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

        const totalEquity = accountsResponse.data
          ?.filter(acc => acc.account_types?.category === 'equity')
          .reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

        const monthlyIncome = profitLossResponse.data?.[0]?.income || 0;
        const monthlyExpenses = profitLossResponse.data?.[0]?.expenses || 0;
        const netIncome = profitLossResponse.data?.[0]?.profit_loss || 0;

        return {
          data: {
            totalAssets,
            totalLiabilities,
            totalEquity,
            monthlyIncome,
            monthlyExpenses,
            netIncome,
            unpostedTransactions: unpostedResponse.count || 0,
            totalAccounts: accountsResponse.data?.length || 0
          },
          error: null
        };
      } catch (error) {
        console.error('Error fetching accounting metrics:', error);
        throw error;
      }
    },
    [tenantId],
    {
      enabled: !!tenantId,
      staleTime: 2 * 60 * 1000, // 2 minutes cache
      cacheKey: `accounting-metrics-${tenantId}`
    }
  );

  // Set up real-time subscriptions for accounting tables
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('accounting-realtime-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounting_transactions',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          refetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounting_entries'
        },
        () => {
          refetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          refetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, refetchMetrics]);


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
                <p className="text-2xl font-bold">{formatCurrency(metrics?.totalAssets || 0)}</p>
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
                <p className="text-2xl font-bold">{formatCurrency(metrics?.totalLiabilities || 0)}</p>
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
                <p className="text-2xl font-bold">{formatCurrency(metrics?.totalEquity || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg text-white ${(metrics?.netIncome || 0) >= 0 ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Income (MTD)</p>
                <p className={`text-2xl font-bold ${(metrics?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics?.netIncome || 0)}
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
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Income</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(metrics?.monthlyIncome || 0)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, ((metrics?.monthlyIncome || 0) / Math.max((metrics?.monthlyIncome || 0), (metrics?.monthlyExpenses || 0))) * 100)}%` 
                  }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Expenses</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(metrics?.monthlyExpenses || 0)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, ((metrics?.monthlyExpenses || 0) / Math.max((metrics?.monthlyIncome || 0), (metrics?.monthlyExpenses || 0))) * 100)}%` 
                  }}
                />
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Net Income</span>
                  <span className={`text-lg font-bold ${(metrics?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(metrics?.netIncome || 0)}
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
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Assets</span>
                <div className="text-right">
                  <span className="text-lg font-bold">{formatCurrency(metrics?.totalAssets || 0)}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage((metrics?.totalAssets || 0), (metrics?.totalAssets || 0) + (metrics?.totalLiabilities || 0) + (metrics?.totalEquity || 0))}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Liabilities</span>
                <div className="text-right">
                  <span className="text-lg font-bold">{formatCurrency(metrics?.totalLiabilities || 0)}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage((metrics?.totalLiabilities || 0), (metrics?.totalAssets || 0) + (metrics?.totalLiabilities || 0) + (metrics?.totalEquity || 0))}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Equity</span>
                <div className="text-right">
                  <span className="text-lg font-bold">{formatCurrency(metrics?.totalEquity || 0)}</span>
                  <p className="text-xs text-muted-foreground">
                    {formatPercentage((metrics?.totalEquity || 0), (metrics?.totalAssets || 0) + (metrics?.totalLiabilities || 0) + (metrics?.totalEquity || 0))}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Debt-to-Equity Ratio</span>
                  <span className="text-lg font-bold">
                    {(metrics?.totalEquity || 0) !== 0 ? ((metrics?.totalLiabilities || 0) / (metrics?.totalEquity || 1)).toFixed(2) : 'N/A'}
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
                <p className="text-2xl font-bold">{metrics?.totalAccounts || 0}</p>
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
                <p className="text-2xl font-bold">{metrics?.unpostedTransactions || 0}</p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${(metrics?.unpostedTransactions || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Ratio</p>
                <p className="text-2xl font-bold">
                  {(metrics?.totalLiabilities || 0) !== 0 ? ((metrics?.totalAssets || 0) / (metrics?.totalLiabilities || 1)).toFixed(2) : 'N/A'}
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