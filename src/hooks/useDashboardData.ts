import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleError } from '@/utils/errorHandler';

export function useDashboardData() {
  const { tenantId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      debugLog('Fetching dashboard data for tenant:', tenantId);
      
      // Fetch all dashboard data in parallel
      const [salesData, customersData, productsData] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount, created_at')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('created_at', new Date().toISOString().split('T')[0]),
        
        supabase
          .from('contacts')
          .select('id', { count: 'exact' })
          .eq('tenant_id', tenantId)
          .eq('type', 'customer')
          .eq('is_active', true),
        
        supabase
          .from('products')
          .select('id, name, stock_quantity, min_stock_level')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
      ]);

      const dashboardData = {
        todaySales: salesData.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
        totalCustomers: customersData.count || 0,
        lowStockProducts: productsData.data?.filter(p => p.stock_quantity <= (p.min_stock_level || 0)) || []
      };

      setData(dashboardData);
      setError(null);
    } catch (err) {
      handleError(err, 'useDashboardData');
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!tenantId) return;

    fetchData();
    
    const interval = setInterval(fetchData, 120000); // 2 minutes
    
    return () => clearInterval(interval);
  }, [tenantId, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
