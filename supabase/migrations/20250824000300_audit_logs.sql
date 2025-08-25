-- Create audit_logs table to capture key actions across the platform
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  resource_name VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_resource ON public.audit_logs(action, resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_type, resource_id);

-- Add RLS policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy for tenant users to view their own audit logs
CREATE POLICY "Tenant users can view their audit logs" ON public.audit_logs
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Policy for superadmins to view all audit logs
CREATE POLICY "Superadmins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (auth.jwt() ->> 'role' = 'superadmin');

-- Policy for system to insert audit logs (service role)
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Create audit log function for easy insertion
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action VARCHAR(100),
  p_resource_type VARCHAR(50),
  p_resource_id UUID DEFAULT NULL,
  p_resource_name VARCHAR(255) DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
  v_tenant_id UUID;
  v_user_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
BEGIN
  -- Get current context
  v_tenant_id := auth.jwt() ->> 'tenant_id'::text;
  v_user_id := auth.uid();
  
  -- Get IP and user agent from request context (if available)
  -- Note: These would need to be passed from the application layer
  -- For now, we'll capture what we can from the database context
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    resource_name,
    old_values,
    new_values,
    metadata
  ) VALUES (
    v_tenant_id::UUID,
    v_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_old_values,
    p_new_values,
    p_metadata
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated, service_role;

-- Create triggers for automatic audit logging on key tables

-- Products audit trigger
CREATE OR REPLACE FUNCTION public.audit_products_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'CREATE',
      'product',
      NEW.id,
      NEW.name,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('sku', NEW.sku, 'category', NEW.category)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'UPDATE',
      'product',
      NEW.id,
      NEW.name,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('sku', NEW.sku, 'category', NEW.category)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'DELETE',
      'product',
      OLD.id,
      OLD.name,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('sku', OLD.sku, 'category', OLD.category)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_products_changes();

-- Orders audit trigger
CREATE OR REPLACE FUNCTION public.audit_orders_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'CREATE',
      'order',
      NEW.id,
      'Order #' || NEW.order_number,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('order_number', NEW.order_number, 'total_amount', NEW.total_amount)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'UPDATE',
      'order',
      NEW.id,
      'Order #' || NEW.order_number,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('order_number', NEW.order_number, 'total_amount', NEW.total_amount)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'DELETE',
      'order',
      OLD.id,
      'Order #' || OLD.order_number,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('order_number', OLD.order_number, 'total_amount', OLD.total_amount)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_orders_changes();

-- Payments audit trigger
CREATE OR REPLACE FUNCTION public.audit_payments_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'CREATE',
      'payment',
      NEW.id,
      'Payment #' || NEW.payment_reference,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('payment_reference', NEW.payment_reference, 'amount', NEW.amount, 'method', NEW.payment_method)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event(
      'UPDATE',
      'payment',
      NEW.id,
      'Payment #' || NEW.payment_reference,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('payment_reference', NEW.payment_reference, 'amount', NEW.amount, 'method', NEW.payment_method)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'DELETE',
      'payment',
      OLD.id,
      'Payment #' || OLD.payment_reference,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('payment_reference', OLD.payment_reference, 'amount', OLD.amount, 'method', OLD.payment_method)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_payments_changes();

-- Stock movements audit trigger
CREATE OR REPLACE FUNCTION public.audit_stock_movements()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'STOCK_MOVEMENT',
      'stock',
      NEW.product_id,
      'Stock movement for product',
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('quantity', NEW.quantity, 'movement_type', NEW.movement_type, 'location_id', NEW.location_id)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movements_audit_trigger
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.audit_stock_movements();

-- Create RPC function to get audit logs with filtering
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_tenant_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_action VARCHAR(100) DEFAULT NULL,
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  user_id UUID,
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id UUID,
  resource_name VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_email TEXT,
  tenant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.tenant_id,
    al.user_id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.resource_name,
    al.old_values,
    al.new_values,
    al.metadata,
    al.ip_address,
    al.user_agent,
    al.created_at,
    u.email as user_email,
    t.name as tenant_name
  FROM public.audit_logs al
  LEFT JOIN auth.users u ON al.user_id = u.id
  LEFT JOIN public.tenants t ON al.tenant_id = t.id
  WHERE (p_tenant_id IS NULL OR al.tenant_id = p_tenant_id)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
    AND (p_resource_id IS NULL OR al.resource_id = p_resource_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (
      -- RLS: tenant users can only see their own logs
      (auth.jwt() ->> 'role' = 'tenant' AND al.tenant_id = auth.jwt() ->> 'tenant_id'::text)
      OR 
      -- Superadmins can see all logs
      (auth.jwt() ->> 'role' = 'superadmin')
    )
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_audit_logs TO authenticated, service_role;
