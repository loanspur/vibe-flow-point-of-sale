-- Check if store_locations table exists and create if needed
CREATE TABLE IF NOT EXISTS public.store_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state_province TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  manager_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for store locations
CREATE POLICY "Tenant users can view their store locations" 
ON public.store_locations 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage store locations" 
ON public.store_locations 
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_store_locations_tenant_id ON public.store_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_is_primary ON public.store_locations(tenant_id, is_primary) WHERE is_primary = true;