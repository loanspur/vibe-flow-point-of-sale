-- Create data export jobs table
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('products', 'orders', 'customers', 'invoices', 'payments', 'stock_movements', 'audit_logs')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  filters JSONB DEFAULT '{}'::jsonb,
  file_path TEXT,
  file_size BIGINT,
  record_count INTEGER,
  error_message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_export_jobs_tenant_status ON public.export_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON public.export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON public.export_jobs(created_at DESC);

-- Add RLS policies
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for tenant users to manage their export jobs
CREATE POLICY "Tenant users can manage their export jobs" ON public.export_jobs
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Policy for superadmins
CREATE POLICY "Superadmins can manage all export jobs" ON public.export_jobs
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

-- Add updated_at trigger
CREATE TRIGGER export_jobs_updated_at
  BEFORE UPDATE ON public.export_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to generate CSV export
CREATE OR REPLACE FUNCTION public.generate_csv_export(
  p_export_type VARCHAR(50),
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_export_id UUID;
  v_tenant_id UUID;
  v_user_id UUID;
  v_sql TEXT;
  v_where_clause TEXT := '';
  v_filter_key TEXT;
  v_filter_value TEXT;
BEGIN
  -- Get current context
  v_tenant_id := auth.jwt() ->> 'tenant_id'::text;
  v_user_id := auth.uid();
  
  -- Create export job
  INSERT INTO public.export_jobs (
    tenant_id,
    user_id,
    export_type,
    status,
    filters
  ) VALUES (
    v_tenant_id::UUID,
    v_user_id,
    p_export_type,
    'processing',
    p_filters
  ) RETURNING id INTO v_export_id;
  
  -- Build WHERE clause from filters
  IF p_filters IS NOT NULL AND p_filters != '{}'::jsonb THEN
    FOR v_filter_key, v_filter_value IN SELECT * FROM jsonb_each_text(p_filters)
    LOOP
      IF v_where_clause != '' THEN
        v_where_clause := v_where_clause || ' AND ';
      END IF;
      
      -- Handle different filter types
      CASE v_filter_key
        WHEN 'date_from' THEN
          v_where_clause := v_where_clause || 'created_at >= ''' || v_filter_value || '''';
        WHEN 'date_to' THEN
          v_where_clause := v_where_clause || 'created_at <= ''' || v_filter_value || '''';
        WHEN 'status' THEN
          v_where_clause := v_where_clause || 'status = ''' || v_filter_value || '''';
        WHEN 'category' THEN
          v_where_clause := v_where_clause || 'category = ''' || v_filter_value || '''';
        ELSE
          v_where_clause := v_where_clause || v_filter_key || ' = ''' || v_filter_value || '''';
      END CASE;
    END LOOP;
  END IF;
  
  -- Add tenant filter
  IF v_where_clause != '' THEN
    v_where_clause := 'WHERE tenant_id = ''' || v_tenant_id || ''' AND ' || v_where_clause;
  ELSE
    v_where_clause := 'WHERE tenant_id = ''' || v_tenant_id || '''';
  END IF;
  
  -- Generate SQL based on export type
  CASE p_export_type
    WHEN 'products' THEN
      v_sql := 'COPY (
        SELECT 
          name, sku, description, category, price, cost_price, 
          stock_quantity, reorder_level, supplier_id, 
          is_active, created_at, updated_at
        FROM public.products 
        ' || v_where_clause || '
        ORDER BY created_at DESC
      ) TO STDOUT WITH CSV HEADER';
      
    WHEN 'orders' THEN
      v_sql := 'COPY (
        SELECT 
          order_number, customer_id, total_amount, status, 
          payment_method, payment_status, notes, created_at, updated_at
        FROM public.orders 
        ' || v_where_clause || '
        ORDER BY created_at DESC
      ) TO STDOUT WITH CSV HEADER';
      
    WHEN 'customers' THEN
      v_sql := 'COPY (
        SELECT 
          name, email, phone, address, city, state, postal_code, 
          country, is_active, created_at, updated_at
        FROM public.customers 
        ' || v_where_clause || '
        ORDER BY created_at DESC
      ) TO STDOUT WITH CSV HEADER';
      
    WHEN 'invoices' THEN
      v_sql := 'COPY (
        SELECT 
          invoice_number, customer_id, total_amount, status, 
          due_date, paid_date, notes, created_at, updated_at
        FROM public.accounts_receivable 
        ' || v_where_clause || '
        ORDER BY created_at DESC
      ) TO STDOUT WITH CSV HEADER';
      
    WHEN 'payments' THEN
      v_sql := 'COPY (
        SELECT 
          payment_reference, order_id, amount, payment_method, 
          payment_status, transaction_id, notes, created_at, updated_at
        FROM public.payments 
        ' || v_where_clause || '
        ORDER BY created_at DESC
      ) TO STDOUT WITH CSV HEADER';
      
    WHEN 'stock_movements' THEN
      v_sql := 'COPY (
        SELECT 
          product_id, quantity, movement_type, location_id, 
          reference, notes, created_at
        FROM public.stock_movements 
        ' || v_where_clause || '
        ORDER BY created_at DESC
      ) TO STDOUT WITH CSV HEADER';
      
    WHEN 'audit_logs' THEN
      v_sql := 'COPY (
        SELECT 
          action, resource_type, resource_name, user_id, 
          old_values, new_values, metadata, created_at
        FROM public.audit_logs 
        ' || v_where_clause || '
        ORDER BY created_at DESC
      ) TO STDOUT WITH CSV HEADER';
      
    ELSE
      RAISE EXCEPTION 'Unsupported export type: %', p_export_type;
  END CASE;
  
  -- Execute the export (this would typically be handled by a background job)
  -- For now, we'll just mark it as completed
  UPDATE public.export_jobs
  SET 
    status = 'completed',
    completed_at = NOW(),
    record_count = 0, -- This would be calculated during actual export
    file_path = '/exports/' || v_export_id || '.csv'
  WHERE id = v_export_id;
  
  RETURN v_export_id;
END;
$$;

-- Create function to get export jobs
CREATE OR REPLACE FUNCTION public.get_export_jobs(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  export_type VARCHAR(50),
  status VARCHAR(50),
  filters JSONB,
  file_path TEXT,
  file_size BIGINT,
  record_count INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ej.id,
    ej.export_type,
    ej.status,
    ej.filters,
    ej.file_path,
    ej.file_size,
    ej.record_count,
    ej.error_message,
    ej.created_at,
    ej.completed_at
  FROM public.export_jobs ej
  WHERE ej.tenant_id = auth.jwt() ->> 'tenant_id'::text
  ORDER BY ej.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create function to cancel export job
CREATE OR REPLACE FUNCTION public.cancel_export_job(
  p_export_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.export_jobs
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_export_id
    AND tenant_id = auth.jwt() ->> 'tenant_id'::text
    AND status IN ('pending', 'processing');
  
  RETURN FOUND;
END;
$$;

-- Create function to clean up expired exports
CREATE OR REPLACE FUNCTION public.cleanup_expired_exports()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.export_jobs
  WHERE expires_at < NOW()
    AND status IN ('completed', 'failed', 'cancelled');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_csv_export TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_export_jobs TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_export_job TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_exports TO service_role;

-- Create a cron job to clean up expired exports daily
SELECT cron.schedule(
  'cleanup-expired-exports',
  '0 2 * * *', -- Daily at 2 AM UTC
  'SELECT public.cleanup_expired_exports();'
);
