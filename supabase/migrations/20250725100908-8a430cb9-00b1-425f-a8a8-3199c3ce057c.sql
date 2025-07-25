-- Create stock adjustments table for manual stock corrections
CREATE TABLE public.stock_adjustments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    adjustment_number TEXT NOT NULL,
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'correction')),
    reason TEXT NOT NULL,
    reference_document TEXT,
    total_value NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock adjustment items table
CREATE TABLE public.stock_adjustment_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    adjustment_id UUID NOT NULL REFERENCES public.stock_adjustments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    location_id UUID REFERENCES public.store_locations(id),
    system_quantity INTEGER NOT NULL DEFAULT 0,
    physical_quantity INTEGER NOT NULL DEFAULT 0,
    adjustment_quantity INTEGER NOT NULL, -- calculated: physical - system
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0, -- adjustment_quantity * unit_cost
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock transfers table for moving stock between locations
CREATE TABLE public.stock_transfers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    transfer_number TEXT NOT NULL,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_location_id UUID NOT NULL REFERENCES public.store_locations(id),
    to_location_id UUID NOT NULL REFERENCES public.store_locations(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    total_items INTEGER NOT NULL DEFAULT 0,
    total_value NUMERIC NOT NULL DEFAULT 0,
    created_by UUID NOT NULL,
    received_by UUID,
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock transfer items table
CREATE TABLE public.stock_transfer_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    quantity_requested INTEGER NOT NULL,
    quantity_shipped INTEGER NOT NULL DEFAULT 0,
    quantity_received INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock taking sessions table
CREATE TABLE public.stock_taking_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    session_number TEXT NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    location_id UUID REFERENCES public.store_locations(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    total_products INTEGER NOT NULL DEFAULT 0,
    products_counted INTEGER NOT NULL DEFAULT 0,
    discrepancies_found INTEGER NOT NULL DEFAULT 0,
    total_variance_value NUMERIC NOT NULL DEFAULT 0,
    created_by UUID NOT NULL,
    completed_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock taking items table
CREATE TABLE public.stock_taking_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.stock_taking_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    system_quantity INTEGER NOT NULL DEFAULT 0,
    counted_quantity INTEGER,
    variance_quantity INTEGER, -- counted - system
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    variance_value NUMERIC NOT NULL DEFAULT 0, -- variance_quantity * unit_cost
    is_counted BOOLEAN NOT NULL DEFAULT false,
    counted_by UUID,
    counted_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for stock adjustments
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can manage stock adjustments" 
ON public.stock_adjustments 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view stock adjustments" 
ON public.stock_adjustments 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Add RLS policies for stock adjustment items
ALTER TABLE public.stock_adjustment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can manage stock adjustment items" 
ON public.stock_adjustment_items 
FOR ALL 
USING (adjustment_id IN (SELECT id FROM public.stock_adjustments WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view stock adjustment items" 
ON public.stock_adjustment_items 
FOR SELECT 
USING (adjustment_id IN (SELECT id FROM public.stock_adjustments WHERE tenant_id = get_user_tenant_id()));

-- Add RLS policies for stock transfers
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can manage stock transfers" 
ON public.stock_transfers 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view stock transfers" 
ON public.stock_transfers 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Add RLS policies for stock transfer items
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can manage stock transfer items" 
ON public.stock_transfer_items 
FOR ALL 
USING (transfer_id IN (SELECT id FROM public.stock_transfers WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view stock transfer items" 
ON public.stock_transfer_items 
FOR SELECT 
USING (transfer_id IN (SELECT id FROM public.stock_transfers WHERE tenant_id = get_user_tenant_id()));

-- Add RLS policies for stock taking sessions
ALTER TABLE public.stock_taking_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can manage stock taking sessions" 
ON public.stock_taking_sessions 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view stock taking sessions" 
ON public.stock_taking_sessions 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Add RLS policies for stock taking items
ALTER TABLE public.stock_taking_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can manage stock taking items" 
ON public.stock_taking_items 
FOR ALL 
USING (session_id IN (SELECT id FROM public.stock_taking_sessions WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view stock taking items" 
ON public.stock_taking_items 
FOR SELECT 
USING (session_id IN (SELECT id FROM public.stock_taking_sessions WHERE tenant_id = get_user_tenant_id()));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_adjustments_updated_at
  BEFORE UPDATE ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_transfers_updated_at
  BEFORE UPDATE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_taking_sessions_updated_at
  BEFORE UPDATE ON public.stock_taking_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();