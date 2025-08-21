-- Create product_units table with proper RLS policies
CREATE TABLE IF NOT EXISTS public.product_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  code TEXT NOT NULL,
  base_unit_id UUID REFERENCES public.product_units(id),
  conversion_factor NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code),
  UNIQUE(tenant_id, abbreviation)
);

-- Enable RLS
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_units
CREATE POLICY "Tenant managers can manage product units" 
ON public.product_units 
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

CREATE POLICY "Tenant users can view product units" 
ON public.product_units 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert base units for their tenant" 
ON public.product_units 
FOR INSERT 
WITH CHECK (
  tenant_id = get_user_tenant_id()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_product_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_units_updated_at
  BEFORE UPDATE ON public.product_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_units_updated_at();