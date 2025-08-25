import { supabase } from '@/integrations/supabase/client';

// Common query patterns to reduce duplication
export const commonQueries = {
  // Get basic tenant profile info
  getTenantProfile: () =>
    supabase.from('profiles').select('tenant_id').single(),

  // Get tenant ID and user in one call
  getTenantAndUser: async () => {
    const [profileResult, userResult] = await Promise.all([
      supabase.from('profiles').select('tenant_id').single(),
      supabase.auth.getUser()
    ]);
    return {
      profile: profileResult.data,
      user: userResult.data.user,
      error: profileResult.error || userResult.error
    };
  },

  // Optimized customer list query
  getCustomers: (tenantId: string) =>
    supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('tenant_id', tenantId)
      .order('name'),

  // Optimized supplier list query
  getSuppliers: (tenantId: string) =>
    supabase
      .from('contacts')
      .select('id, name, email, phone')
      .eq('tenant_id', tenantId)
      .eq('type', 'supplier')
      .order('name'),

  // Get product categories for tenant
  getProductCategories: (tenantId: string) =>
    supabase
      .from('product_categories')
      .select('id, name, color')
      .eq('tenant_id', tenantId)
      .order('name'),

  // Get payment methods for tenant
  getPaymentMethods: (tenantId: string) =>
    supabase
      .from('payment_methods')
      .select('id, name, type, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order'),

  // Get user roles for tenant
  getUserRoles: (tenantId: string) =>
    supabase
      .from('user_roles')
      .select('id, name, description')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),

  // Batch query for common reference data
  getReferenceData: async (tenantId: string) => {
    const [
      categoriesResult,
      paymentMethodsResult,
      rolesResult
    ] = await Promise.all([
      commonQueries.getProductCategories(tenantId),
      commonQueries.getPaymentMethods(tenantId),
      commonQueries.getUserRoles(tenantId)
    ]);

    return {
      categories: categoriesResult.data || [],
      paymentMethods: paymentMethodsResult.data || [],
      roles: rolesResult.data || [],
      errors: [
        categoriesResult.error,
        paymentMethodsResult.error,
        rolesResult.error
      ].filter(Boolean)
    };
  }
};

// Field selection helpers to avoid selecting unnecessary data
export const fieldSelectors = {
  // Minimal product fields for listings
  productList: `
    id,
    name,
    sku,
    price,
    stock_quantity,
    min_stock_level,
    image_url,
    is_active,
    category_id,
    product_categories!left(name)
  `,

  // Product with variants for detailed view
  productWithVariants: `
    id,
    name,
    sku,
    price,
    cost,
    stock_quantity,
    min_stock_level,
    description,
    barcode,
    image_url,
    is_active,
    category_id,
    subcategory_id,
    product_categories!left(name),
    product_subcategories!left(name),
    product_variants!left(id, name, value, stock_quantity, price, sku)
  `,

  // Sales summary fields
  salesSummary: `
    id,
    sale_number,
    total_amount,
    status,
    created_at,
    customers!left(name)
  `,

  // Purchase summary fields
  purchaseSummary: `
    id,
    purchase_number,
    total_amount,
    status,
    created_at,
    contacts!left(name)
  `,

  // User profile minimal
  userProfile: `
    user_id,
    full_name,
    role
  `,

  // Transaction minimal
  transactionMinimal: `
    id,
    transaction_number,
    description,
    total_amount,
    transaction_date,
    is_posted
  `
};

// Query optimization helpers
export const queryOptimizations = {
  // Add common filters for tenant-based queries
  addTenantFilter: (query: any, tenantId: string) =>
    query.eq('tenant_id', tenantId),

  // Add pagination
  addPagination: (query: any, page: number = 1, limit: number = 10) => {
    const offset = (page - 1) * limit;
    return query.range(offset, offset + limit - 1);
  },

  // Add search filters
  addSearch: (query: any, searchTerm: string, fields: string[]) => {
    if (!searchTerm) return query;
    const searchPattern = fields.map(field => `${field}.ilike.%${searchTerm}%`).join(',');
    return query.or(searchPattern);
  },

  // Add date range filter
  addDateRange: (query: any, field: string, startDate?: string, endDate?: string) => {
    if (startDate) query = query.gte(field, startDate);
    if (endDate) query = query.lte(field, endDate);
    return query;
  },

  // Add ordering with fallback
  addOrdering: (query: any, orderBy: string = 'created_at', ascending: boolean = false) =>
    query.order(orderBy, { ascending }),

  // Combine common query patterns
  buildListQuery: (
    query: any,
    tenantId: string,
    options: {
      search?: string;
      searchFields?: string[];
      page?: number;
      limit?: number;
      orderBy?: string;
      ascending?: boolean;
    } = {}
  ) => {
    let finalQuery = queryOptimizations.addTenantFilter(query, tenantId);
    
    if (options.search && options.searchFields) {
      finalQuery = queryOptimizations.addSearch(finalQuery, options.search, options.searchFields);
    }
    
    if (options.page && options.limit) {
      finalQuery = queryOptimizations.addPagination(finalQuery, options.page, options.limit);
    }
    
    finalQuery = queryOptimizations.addOrdering(
      finalQuery, 
      options.orderBy, 
      options.ascending
    );
    
    return finalQuery;
  }
};

// Error handling utilities
export const queryErrorHandler = {
  handleError: (error: any, fallback: any = null) => {
    if (error) {
      console.error('Query error:', error);
      return { data: fallback, error };
    }
    return { data: null, error: null };
  },

  logQueryPerformance: (queryName: string, startTime: number) => {
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }
  }
};

// Simple retry/backoff helper for transient errors (e.g., HTTP 429)
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelayMs = 300): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (attempt >= retries || (status && status !== 429)) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }
  }
}

// Client-side pagination helper with sane defaults
export function ensurePaginated<T>(list: T[], page = 1, limit = 20): { data: T[]; page: number; limit: number; total: number } {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const start = (Math.max(page, 1) - 1) * safeLimit;
  const data = (Array.isArray(list) ? list : []).slice(start, start + safeLimit);
  return { data, page: Math.max(page, 1), limit: safeLimit, total: list?.length || 0 };
}

// Sanitize numeric series to avoid NaN/null in charts
export function sanitizeSeries<T extends Record<string, any>>(rows: T[], numericKeys: string[]): T[] {
  if (!Array.isArray(rows)) return [] as T[];
  return rows.map((row) => {
    const copy: any = { ...row };
    for (const key of numericKeys) {
      const value = Number(copy[key]);
      copy[key] = Number.isFinite(value) ? value : 0;
    }
    return copy as T;
  });
}