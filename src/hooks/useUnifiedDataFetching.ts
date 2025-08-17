import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedQuery } from './useOptimizedQuery';
import { performanceUtils } from '@/lib/performance-config';

/**
 * Unified data fetching patterns to reduce code duplication
 */

interface UnifiedFetchOptions {
  select?: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  enabled?: boolean;
  cacheTime?: number;
}

export function useUnifiedFetch<T = any>(
  tableName: string,
  options: UnifiedFetchOptions = {}
) {
  const { tenantId } = useAuth();
  
  const {
    select = '*',
    filters = {},
    orderBy = { column: 'created_at', ascending: false },
    limit,
    enabled = true,
    cacheTime = 5 * 60 * 1000 // 5 minutes default
  } = options;

  const fetchData = useCallback(async () => {
    if (!tenantId) return { data: [], error: null };

    let query = supabase.from(tableName as any).select(select);

    // Add tenant filter
    query = query.eq('tenant_id', tenantId);

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value.operator) {
          // Support complex filters like { operator: 'gte', value: date }
          query = query[value.operator](key, value.value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply ordering
    query = query.order(orderBy.column, { ascending: orderBy.ascending });

    // Apply limit
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [], error: null };
  }, [tenantId, tableName, select, JSON.stringify(filters), orderBy, limit]);

  const cacheKey = `${tableName}-${tenantId}-${JSON.stringify(filters)}-${orderBy.column}-${orderBy.ascending}-${limit}`;

  return useOptimizedQuery(
    fetchData,
    [tenantId, JSON.stringify(filters), orderBy, limit],
    {
      enabled: enabled && !!tenantId,
      staleTime: cacheTime,
      cacheKey,
      ...performanceUtils.getQueryOptions()
    }
  );
}

// Specialized hooks for common entities
export function useProducts(options: Omit<UnifiedFetchOptions, 'select'> = {}) {
  return useUnifiedFetch('products', {
    ...options,
    select: `
      *,
      product_categories(name),
      product_subcategories(name),
      product_units(name, abbreviation),
      store_locations(name),
      product_variants(
        id, name, value, stock_quantity, price_adjustment, is_active
      )
    `
  });
}

export function useSales(options: Omit<UnifiedFetchOptions, 'select'> = {}) {
  return useUnifiedFetch('sales', {
    ...options,
    select: `
      *,
      sale_items(
        id, product_id, quantity, unit_price, total_price,
        products(name, sku, image_url)
      ),
      store_locations(name)
    `
  });
}

export function usePurchases(options: Omit<UnifiedFetchOptions, 'select'> = {}) {
  return useUnifiedFetch('purchases', {
    ...options,
    select: `
      *,
      purchase_items(
        id, product_id, quantity, unit_cost, total_cost,
        products(name, sku)
      ),
      contacts!purchases_supplier_id_fkey(name, email, phone)
    `
  });
}

export function useContacts(type?: 'customer' | 'supplier' | 'vendor') {
  const filters = type ? { type } : {};
  
  return useUnifiedFetch('contacts', {
    filters,
    select: 'id, name, email, phone, company, type, is_active',
    orderBy: { column: 'name', ascending: true }
  });
}

export function useBusinessSettings() {
  return useUnifiedFetch('business_settings', {
    limit: 1,
    cacheTime: 10 * 60 * 1000 // Cache for 10 minutes
  });
}

// Dashboard aggregated data hook
export function useDashboardData() {
  const { tenantId } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    if (!tenantId) return { data: null, error: null };

    const today = new Date().toISOString().split('T')[0];

    const [
      todaySalesRes,
      totalCustomersRes,
      lowStockRes,
      recentSalesRes
    ] = await Promise.all([
      supabase
        .from('sales')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', today)
        .lt('created_at', `${today}T23:59:59`),
      
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
        .eq('is_active', true),
      
      supabase
        .from('sales')
        .select(`
          id, receipt_number, total_amount, payment_method, created_at,
          customer_name, status
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    const todaysSales = todaySalesRes.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const totalCustomers = totalCustomersRes.count || 0;
    
    const lowStockProducts = lowStockRes.data?.filter(
      product => product.stock_quantity <= (product.min_stock_level || 0)
    ) || [];

    return {
      data: {
        todaysSales,
        totalCustomers,
        lowStockCount: lowStockProducts.length,
        recentSales: recentSalesRes.data || []
      },
      error: null
    };
  }, [tenantId]);

  return useOptimizedQuery(
    fetchDashboardData,
    [tenantId],
    {
      enabled: !!tenantId,
      staleTime: 2 * 60 * 1000, // 2 minutes cache for dashboard
      cacheKey: `dashboard-${tenantId}`,
      refetchOnWindowFocus: false
    }
  );
}