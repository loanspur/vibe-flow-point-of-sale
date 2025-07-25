-- Check if stock_taking_sessions and stock_taking_items tables exist
-- If they don't exist, create them with proper relationships

-- Create stock_taking_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stock_taking_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  session_number TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  total_products INTEGER DEFAULT 0,
  products_counted INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock_taking_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stock_taking_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.stock_taking_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  system_quantity INTEGER NOT NULL DEFAULT 0,
  counted_quantity INTEGER,
  variance_quantity INTEGER,
  variance_value NUMERIC,
  unit_cost NUMERIC DEFAULT 0,
  is_counted BOOLEAN DEFAULT false,
  counted_by UUID,
  counted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.stock_taking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_taking_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stock_taking_sessions
CREATE POLICY "Tenant managers can manage stock taking sessions" 
ON public.stock_taking_sessions 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view stock taking sessions" 
ON public.stock_taking_sessions 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create RLS policies for stock_taking_items
CREATE POLICY "Tenant staff can manage stock taking items" 
ON public.stock_taking_items 
FOR ALL 
USING (session_id IN (SELECT id FROM public.stock_taking_sessions WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

CREATE POLICY "Tenant users can view stock taking items" 
ON public.stock_taking_items 
FOR SELECT 
USING (session_id IN (SELECT id FROM public.stock_taking_sessions WHERE tenant_id = get_user_tenant_id()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_taking_sessions_tenant_id ON public.stock_taking_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_taking_sessions_status ON public.stock_taking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_stock_taking_items_session_id ON public.stock_taking_items(session_id);
CREATE INDEX IF NOT EXISTS idx_stock_taking_items_product_id ON public.stock_taking_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_taking_items_variant_id ON public.stock_taking_items(variant_id);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_taking_sessions_updated_at
  BEFORE UPDATE ON public.stock_taking_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_taking_items_updated_at
  BEFORE UPDATE ON public.stock_taking_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();