import { useState, useCallback, useMemo } from 'react';
import { useOptimizedQuery } from './useOptimizedQuery';
import { useAutoRefresh } from './useAutoRefresh';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardMetrics {
  todayRevenue: number;
  totalRevenue: number;
  todayTransactions: number;
  totalProductsSold: number;
  totalCustomers: number;
  todayBankedAmount: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  lowStockItems: number;
  todayPurchases: number;
}

export const useOptimizedDashboard = () => {
  const { tenantId } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    if (!tenantId) return { data: null, error: null };
    
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const monthStart = startOfMonth.toISOString().split('T')[0];

    try {
      // Batch all queries for maximum efficiency
      const [
        todaySalesResponse,
        allSalesResponse,
        weeklySalesResponse,
        monthlySalesResponse,
        customersResponse,
        saleItemsResponse,
        bankTransfersResponse,
        lowStockResponse,
        purchasesResponse
      ] = await Promise.all([
        // Today's sales
        supabase
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', today),
        
        // All sales ever made
        supabase
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenantId),
        
        // Weekly sales
        supabase
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', weekStart),
        
        // Monthly sales
        supabase
          .from('sales')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', monthStart),
        
        // Customer count
        supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId),
        
        // Products sold today
        supabase
          .from('sale_items')
          .select('quantity, sales!inner(tenant_id, created_at)')
          .eq('sales.tenant_id', tenantId)
          .gte('sales.created_at', today),
        
        // Bank transfers today
        supabase
          .from('transfer_requests')
          .select('amount')
          .eq('tenant_id', tenantId)
          .eq('transfer_type', 'account')
          .eq('status', 'approved')
          .gte('created_at', today),
        
        // Low stock items
        supabase
          .from('products')
          .select('id, stock_quantity, min_stock_level')
          .eq('tenant_id', tenantId)
          .neq('min_stock_level', null),
        
        // Purchases today
        supabase
          .from('purchases')
          .select('total_amount')
          .eq('tenant_id', tenantId)
          .gte('created_at', today)
      ]);

      // Process all data
      const todayRevenue = todaySalesResponse.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalRevenue = allSalesResponse.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const weeklyRevenue = weeklySalesResponse.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const monthlyRevenue = monthlySalesResponse.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const todayTransactions = todaySalesResponse.data?.length || 0;
      const totalProductsSold = saleItemsResponse.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalCustomers = customersResponse.count || 0;
      const bankTransferAmount = bankTransfersResponse.data?.reduce((sum, transfer) => sum + Number(transfer.amount), 0) || 0;
      const todayBankedAmount = bankTransferAmount;
      
      const lowStockItems = lowStockResponse.data?.filter((product: any) => 
        (product.stock_quantity || 0) <= (product.min_stock_level || 0)
      ).length || 0;
      
      const todayPurchases = purchasesResponse.data?.reduce((sum, purchase) => sum + Number(purchase.total_amount), 0) || 0;

      return {
        data: {
          todayRevenue,
          totalRevenue,
          todayTransactions,
          totalProductsSold,
          totalCustomers,
          todayBankedAmount,
          weeklyRevenue,
          monthlyRevenue,
          lowStockItems,
          todayPurchases
        } as DashboardMetrics,
        error: null
      };
    } catch (error: any) {
      console.error('Dashboard data fetch error:', error);
      return { data: null, error };
    }
  }, [tenantId, refreshKey]);

  // Use optimized query without caching for real-time updates
  const queryResult = useOptimizedQuery(
    fetchDashboardData,
    [tenantId, refreshKey],
    {
      enabled: !!tenantId,
      staleTime: 0, // No cache - always fresh data
      cacheKey: `dashboard-${tenantId}-${Date.now()}-${refreshKey}`
    }
  );

  const { data: dashboardData, loading, error, refetch } = queryResult;

  // Auto refresh every 30 seconds
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    refetch();
  }, [refetch]);

  useAutoRefresh({
    interval: 30000, // 30 seconds
    enabled: true,
    onRefresh: refresh,
    visibilityBased: true
  });

  // Calculate percentage changes
  const percentageChanges = useMemo(() => {
    if (!dashboardData) return {};

    const dailyVsWeekly = dashboardData.weeklyRevenue > 0 
      ? ((dashboardData.todayRevenue / (dashboardData.weeklyRevenue / 7)) - 1) * 100 
      : 0;
    
    const weeklyVsMonthly = dashboardData.monthlyRevenue > 0 
      ? ((dashboardData.weeklyRevenue / (dashboardData.monthlyRevenue / 4)) - 1) * 100 
      : 0;

    return {
      dailyVsWeekly: Math.round(dailyVsWeekly),
      weeklyVsMonthly: Math.round(weeklyVsMonthly)
    };
  }, [dashboardData]);

  return {
    data: dashboardData,
    loading,
    error,
    refresh,
    percentageChanges
  };
};