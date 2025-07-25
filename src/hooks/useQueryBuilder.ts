import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QueryBuilderOptions {
  select?: string;
  filters?: Record<string, any>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  single?: boolean;
}

// Optimized query builder with field selection and filtering
export function useQueryBuilder() {
  const buildQuery = useCallback((
    tableName: string, 
    options: QueryBuilderOptions = {}
  ) => {
    const {
      select = '*',
      filters = {},
      order,
      limit,
      offset,
      single = false
    } = options;

    // Create the base query
    const query = supabase.from(tableName as any).select(select as any);

    // Apply filters
    let filteredQuery = query;
    Object.entries(filters).forEach(([column, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          filteredQuery = filteredQuery.in(column, value);
        } else {
          filteredQuery = filteredQuery.eq(column, value);
        }
      }
    });

    // Apply ordering
    if (order) {
      filteredQuery = filteredQuery.order(order.column, { ascending: order.ascending ?? true });
    }

    // Apply pagination
    if (limit) {
      filteredQuery = filteredQuery.limit(limit);
    }
    
    if (offset) {
      filteredQuery = filteredQuery.range(offset, offset + (limit || 10) - 1);
    }

    // Return single or multiple
    if (single) {
      return filteredQuery.maybeSingle();
    }

    return filteredQuery;
  }, []);

  // Optimized query for products with minimal fields for listing
  const buildProductListQuery = useCallback((tenantId: string, searchTerm?: string) => {
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        price,
        stock_quantity,
        min_stock_level,
        image_url,
        is_active,
        category_id,
        product_categories!inner(name),
        product_variants(id, stock_quantity)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
    }

    return query;
  }, []);

  // Optimized query for dashboard metrics
  const buildDashboardQuery = useCallback((tenantId: string, date: string) => {
    const todaySales = supabase
      .from('sales')
      .select('total_amount, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', date);

    const customerCount = supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const productsSold = supabase
      .from('sale_items')
      .select('quantity, sales!inner(created_at, tenant_id)')
      .eq('sales.tenant_id', tenantId)
      .gte('sales.created_at', date);

    return { todaySales, customerCount, productsSold };
  }, []);

  // Optimized query for accounting metrics
  const buildAccountingQuery = useCallback((tenantId: string) => {
    const accounts = supabase
      .from('accounts')
      .select('id, name, code, balance, account_type_id, account_types!inner(category)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const recentTransactions = supabase
      .from('accounting_transactions')
      .select(`
        id,
        transaction_number,
        description,
        total_amount,
        transaction_date,
        is_posted
      `)
      .eq('tenant_id', tenantId)
      .order('transaction_date', { ascending: false })
      .limit(10);

    return { accounts, recentTransactions };
  }, []);

  return {
    buildQuery,
    buildProductListQuery,
    buildDashboardQuery,
    buildAccountingQuery
  };
}