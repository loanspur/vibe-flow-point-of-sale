-- Phase 4: Performance and Scale Optimizations
-- This migration implements server-side aggregation, query optimization, and caching improvements

-- Enable required extensions for performance
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_repack;

-- Create materialized views for dashboard aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_metrics AS
SELECT 
  tenant_id,
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value,
  COUNT(DISTINCT customer_id) as unique_customers
FROM public.orders 
WHERE status = 'completed'
GROUP BY tenant_id, DATE(created_at);

-- Create materialized view for stock aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS public.stock_metrics AS
SELECT 
  tenant_id,
  location_id,
  COUNT(*) as total_products,
  SUM(stock_quantity) as total_stock,
  COUNT(CASE WHEN stock_quantity <= min_stock_level THEN 1 END) as low_stock_count,
  AVG(cost_price) as avg_cost_price
FROM public.products
WHERE is_active = true
GROUP BY tenant_id, location_id;

-- Create materialized view for customer metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.customer_metrics AS
SELECT 
  tenant_id,
  COUNT(*) as total_customers,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_customers_30d,
  COUNT(CASE WHEN last_purchase_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_customers_30d
FROM public.customers
GROUP BY tenant_id;

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_date_status ON public.orders(tenant_id, created_at, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_date ON public.orders(customer_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_stock ON public.products(tenant_id, stock_quantity, min_stock_level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_active ON public.products(tenant_id, is_active, updated_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_created ON public.customers(tenant_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_tenant_last_purchase ON public.customers(tenant_id, last_purchase_date);

-- Create partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_completed_recent ON public.orders(tenant_id, created_at) 
WHERE status = 'completed' AND created_at >= CURRENT_DATE - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_low_stock ON public.products(tenant_id, stock_quantity, min_stock_level)
WHERE stock_quantity <= min_stock_level AND is_active = true;

-- Create function for server-side dashboard aggregation
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_tenant_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_revenue DECIMAL(12,2),
  total_orders INTEGER,
  avg_order_value DECIMAL(10,2),
  unique_customers INTEGER,
  low_stock_items INTEGER,
  total_products INTEGER,
  new_customers INTEGER,
  active_customers INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(o.total_amount), 0) as total_revenue,
    COUNT(o.id) as total_orders,
    CASE WHEN COUNT(o.id) > 0 THEN AVG(o.total_amount) ELSE 0 END as avg_order_value,
    COUNT(DISTINCT o.customer_id) as unique_customers,
    (SELECT COUNT(*) FROM public.products p 
     WHERE p.tenant_id = p_tenant_id 
     AND p.stock_quantity <= p.min_stock_level 
     AND p.is_active = true) as low_stock_items,
    (SELECT COUNT(*) FROM public.products p 
     WHERE p.tenant_id = p_tenant_id 
     AND p.is_active = true) as total_products,
    (SELECT COUNT(*) FROM public.customers c 
     WHERE c.tenant_id = p_tenant_id 
     AND c.created_at >= p_date_from) as new_customers,
    (SELECT COUNT(*) FROM public.customers c 
     WHERE c.tenant_id = p_tenant_id 
     AND c.last_purchase_date >= p_date_from) as active_customers
  FROM public.orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.status = 'completed'
    AND o.created_at >= p_date_from
    AND o.created_at <= p_date_to;
END;
$$;

-- Create function for server-side sales aggregation
CREATE OR REPLACE FUNCTION public.get_sales_aggregation(
  p_tenant_id UUID,
  p_granularity VARCHAR(10) DEFAULT 'day',
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  period VARCHAR(20),
  revenue DECIMAL(12,2),
  orders INTEGER,
  customers INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p_granularity = 'day' THEN TO_CHAR(o.created_at, 'YYYY-MM-DD')
      WHEN p_granularity = 'week' THEN TO_CHAR(o.created_at, 'IYYY-IW')
      WHEN p_granularity = 'month' THEN TO_CHAR(o.created_at, 'YYYY-MM')
      ELSE TO_CHAR(o.created_at, 'YYYY-MM-DD')
    END as period,
    SUM(o.total_amount) as revenue,
    COUNT(o.id) as orders,
    COUNT(DISTINCT o.customer_id) as customers
  FROM public.orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.status = 'completed'
    AND o.created_at >= p_date_from
    AND o.created_at <= p_date_to
  GROUP BY 
    CASE 
      WHEN p_granularity = 'day' THEN TO_CHAR(o.created_at, 'YYYY-MM-DD')
      WHEN p_granularity = 'week' THEN TO_CHAR(o.created_at, 'IYYY-IW')
      WHEN p_granularity = 'month' THEN TO_CHAR(o.created_at, 'YYYY-MM')
      ELSE TO_CHAR(o.created_at, 'YYYY-MM-DD')
    END
  ORDER BY period;
END;
$$;

-- Create function for server-side product performance
CREATE OR REPLACE FUNCTION public.get_product_performance(
  p_tenant_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days'
)
RETURNS TABLE(
  product_id UUID,
  product_name VARCHAR(255),
  sku VARCHAR(100),
  total_sold INTEGER,
  total_revenue DECIMAL(12,2),
  avg_price DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as product_id,
    p.name as product_name,
    p.sku,
    COALESCE(SUM(oi.quantity), 0) as total_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
    CASE WHEN SUM(oi.quantity) > 0 THEN AVG(oi.unit_price) ELSE 0 END as avg_price
  FROM public.products p
  LEFT JOIN public.order_items oi ON p.id = oi.product_id
  LEFT JOIN public.orders o ON oi.order_id = o.id
  WHERE p.tenant_id = p_tenant_id
    AND (o.id IS NULL OR (o.status = 'completed' AND o.created_at >= p_date_from))
  GROUP BY p.id, p.name, p.sku
  ORDER BY total_sold DESC
  LIMIT p_limit;
END;
$$;

-- Create function for server-side customer analytics
CREATE OR REPLACE FUNCTION public.get_customer_analytics(
  p_tenant_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '90 days'
)
RETURNS TABLE(
  customer_id UUID,
  customer_name VARCHAR(255),
  total_orders INTEGER,
  total_spent DECIMAL(12,2),
  avg_order_value DECIMAL(10,2),
  last_order_date TIMESTAMP WITH TIME ZONE,
  days_since_last_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.name as customer_name,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    CASE WHEN COUNT(o.id) > 0 THEN AVG(o.total_amount) ELSE 0 END as avg_order_value,
    MAX(o.created_at) as last_order_date,
    EXTRACT(DAY FROM (CURRENT_DATE - MAX(o.created_at)::DATE)) as days_since_last_order
  FROM public.customers c
  LEFT JOIN public.orders o ON c.id = o.customer_id
  WHERE c.tenant_id = p_tenant_id
    AND (o.id IS NULL OR (o.status = 'completed' AND o.created_at >= p_date_from))
  GROUP BY c.id, c.name
  ORDER BY total_spent DESC;
END;
$$;

-- Create function for server-side inventory analytics
CREATE OR REPLACE FUNCTION public.get_inventory_analytics(
  p_tenant_id UUID,
  p_location_id UUID DEFAULT NULL
)
RETURNS TABLE(
  location_id UUID,
  location_name VARCHAR(255),
  total_products INTEGER,
  total_stock_value DECIMAL(12,2),
  low_stock_items INTEGER,
  out_of_stock_items INTEGER,
  avg_stock_level DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as location_id,
    l.name as location_name,
    COUNT(p.id) as total_products,
    COALESCE(SUM(p.stock_quantity * p.cost_price), 0) as total_stock_value,
    COUNT(CASE WHEN p.stock_quantity <= p.min_stock_level THEN 1 END) as low_stock_items,
    COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) as out_of_stock_items,
    AVG(p.stock_quantity) as avg_stock_level
  FROM public.store_locations l
  LEFT JOIN public.products p ON l.id = p.location_id
  WHERE l.tenant_id = p_tenant_id
    AND (p_location_id IS NULL OR l.id = p_location_id)
    AND (p.id IS NULL OR p.is_active = true)
  GROUP BY l.id, l.name
  ORDER BY total_stock_value DESC;
END;
$$;

-- Create function for server-side financial metrics
CREATE OR REPLACE FUNCTION public.get_financial_metrics(
  p_tenant_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_revenue DECIMAL(12,2),
  total_cost DECIMAL(12,2),
  gross_profit DECIMAL(12,2),
  gross_margin DECIMAL(5,2),
  total_orders INTEGER,
  avg_order_value DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_revenue DECIMAL(12,2);
  v_cost DECIMAL(12,2);
  v_orders INTEGER;
BEGIN
  -- Calculate revenue and orders
  SELECT 
    COALESCE(SUM(o.total_amount), 0),
    COUNT(o.id)
  INTO v_revenue, v_orders
  FROM public.orders o
  WHERE o.tenant_id = p_tenant_id
    AND o.status = 'completed'
    AND o.created_at >= p_date_from
    AND o.created_at <= p_date_to;

  -- Calculate cost of goods sold
  SELECT COALESCE(SUM(oi.quantity * p.cost_price), 0)
  INTO v_cost
  FROM public.orders o
  JOIN public.order_items oi ON o.id = oi.order_id
  JOIN public.products p ON oi.product_id = p.id
  WHERE o.tenant_id = p_tenant_id
    AND o.status = 'completed'
    AND o.created_at >= p_date_from
    AND o.created_at <= p_date_to;

  RETURN QUERY
  SELECT 
    v_revenue as total_revenue,
    v_cost as total_cost,
    (v_revenue - v_cost) as gross_profit,
    CASE WHEN v_revenue > 0 THEN ((v_revenue - v_cost) / v_revenue * 100) ELSE 0 END as gross_margin,
    v_orders as total_orders,
    CASE WHEN v_orders > 0 THEN (v_revenue / v_orders) ELSE 0 END as avg_order_value;
END;
$$;

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_dashboard_materialized_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.stock_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.customer_metrics;
END;
$$;

-- Create function for query performance monitoring
CREATE OR REPLACE FUNCTION public.get_slow_queries(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  query TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  mean_time DOUBLE PRECISION,
  rows BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
  FROM pg_stat_statements
  WHERE mean_time > 100 -- Queries taking more than 100ms on average
  ORDER BY mean_time DESC
  LIMIT p_limit;
END;
$$;

-- Create function for table size monitoring
CREATE OR REPLACE FUNCTION public.get_table_sizes()
RETURNS TABLE(
  table_name TEXT,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT,
  row_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) + pg_indexes_size(schemaname||'.'||tablename)) as total_size,
    n_tup_ins + n_tup_upd + n_tup_del as row_count
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_sales_aggregation TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_product_performance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_analytics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_inventory_analytics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_metrics TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_materialized_views TO service_role;
GRANT EXECUTE ON FUNCTION public.get_slow_queries TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_sizes TO service_role;

-- Create RLS policies for materialized views
ALTER MATERIALIZED VIEW public.dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW public.stock_metrics ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW public.customer_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view dashboard metrics" ON public.dashboard_metrics
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Tenant users can view stock metrics" ON public.stock_metrics
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Tenant users can view customer metrics" ON public.customer_metrics
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Create cron job to refresh materialized views daily
SELECT cron.schedule(
  'refresh-dashboard-metrics',
  '0 2 * * *', -- Daily at 2 AM UTC
  'SELECT public.refresh_dashboard_materialized_views();'
);

-- Create cron job to analyze table statistics weekly
SELECT cron.schedule(
  'analyze-tables',
  '0 3 * * 0', -- Weekly on Sunday at 3 AM UTC
  'ANALYZE;'
);

-- Create function to clean up old data for performance
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Clean up old audit logs (keep last 90 days)
  DELETE FROM public.audit_logs 
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Clean up old notification queue (keep last 30 days)
  DELETE FROM public.notification_queue 
  WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
  
  -- Clean up old export jobs (keep last 7 days)
  DELETE FROM public.export_jobs 
  WHERE created_at < CURRENT_DATE - INTERVAL '7 days';
  
  -- Clean up old subscription alerts (keep last 60 days)
  DELETE FROM public.subscription_alerts 
  WHERE created_at < CURRENT_DATE - INTERVAL '60 days';
  
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_data TO service_role;

-- Schedule cleanup job monthly
SELECT cron.schedule(
  'cleanup-old-data',
  '0 4 1 * *', -- Monthly on 1st at 4 AM UTC
  'SELECT public.cleanup_old_data();'
);

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metric_unit VARCHAR(20),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, metric_name, recorded_at)
);

-- Add indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant_time ON public.performance_metrics(tenant_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time ON public.performance_metrics(metric_name, recorded_at);

-- Add RLS policies for performance metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their performance metrics" ON public.performance_metrics
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY "Service role can manage performance metrics" ON public.performance_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to record performance metrics
CREATE OR REPLACE FUNCTION public.record_performance_metric(
  p_tenant_id UUID,
  p_metric_name VARCHAR(100),
  p_metric_value DECIMAL(15,4),
  p_metric_unit VARCHAR(20) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO public.performance_metrics (
    tenant_id,
    metric_name,
    metric_value,
    metric_unit
  ) VALUES (
    p_tenant_id,
    p_metric_name,
    p_metric_value,
    p_metric_unit
  ) RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_performance_metric TO authenticated, service_role;

-- Create function to get performance metrics
CREATE OR REPLACE FUNCTION public.get_performance_metrics(
  p_tenant_id UUID DEFAULT NULL,
  p_metric_name VARCHAR(100) DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
  metric_name VARCHAR(100),
  metric_value DECIMAL(15,4),
  metric_unit VARCHAR(20),
  recorded_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.metric_name,
    pm.metric_value,
    pm.metric_unit,
    pm.recorded_at
  FROM public.performance_metrics pm
  WHERE (p_tenant_id IS NULL OR pm.tenant_id = p_tenant_id)
    AND (p_metric_name IS NULL OR pm.metric_name = p_metric_name)
    AND pm.recorded_at >= NOW() - INTERVAL '1 hour' * p_hours
  ORDER BY pm.recorded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_performance_metrics TO authenticated, service_role;
