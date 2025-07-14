-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  plan_type TEXT NOT NULL DEFAULT 'basic',
  max_users INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant_users junction table for user-tenant relationships
CREATE TABLE public.tenant_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Add tenant_id to existing tables
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.products ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_categories ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.customers ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.sales ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- Enable RLS on new tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Create function to get user's tenant ID
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.tenant_users 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- Create function to check if user is tenant admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner') 
    AND is_active = true
  );
$$;

-- RLS policies for tenants table
CREATE POLICY "Users can view their tenant" 
ON public.tenants 
FOR SELECT 
USING (id = get_user_tenant_id());

CREATE POLICY "Tenant admins can update their tenant" 
ON public.tenants 
FOR UPDATE 
USING (id = get_user_tenant_id() AND is_tenant_admin());

-- RLS policies for tenant_users table
CREATE POLICY "Users can view their tenant memberships" 
ON public.tenant_users 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Tenant admins can manage tenant users" 
ON public.tenant_users 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Update existing RLS policies to include tenant isolation
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;
CREATE POLICY "Tenant users can view tenant products" 
ON public.products 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Managers can manage products" ON public.products;
CREATE POLICY "Tenant managers can manage tenant products" 
ON public.products 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

DROP POLICY IF EXISTS "Everyone can view categories" ON public.product_categories;
CREATE POLICY "Tenant users can view tenant categories" 
ON public.product_categories 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Managers can manage categories" ON public.product_categories;
CREATE POLICY "Tenant managers can manage tenant categories" 
ON public.product_categories 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
CREATE POLICY "Tenant staff can view tenant customers" 
ON public.customers 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
CREATE POLICY "Tenant staff can manage tenant customers" 
ON public.customers 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

DROP POLICY IF EXISTS "Staff can view sales" ON public.sales;
CREATE POLICY "Tenant staff can view tenant sales" 
ON public.sales 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Staff can create sales" ON public.sales;
CREATE POLICY "Tenant staff can create tenant sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]) AND auth.uid() = cashier_id);

DROP POLICY IF EXISTS "Managers can update sales" ON public.sales;
CREATE POLICY "Tenant managers can update tenant sales" 
ON public.sales 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

-- Add triggers for updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample tenant data
INSERT INTO public.tenants (name, subdomain, contact_email, plan_type) VALUES
('Demo Restaurant', 'demo-restaurant', 'admin@demo-restaurant.com', 'premium'),
('Coffee Shop Plus', 'coffee-shop', 'owner@coffeeshop.com', 'basic');

-- Update sample data with tenant associations (using first tenant)
UPDATE public.products SET tenant_id = (SELECT id FROM public.tenants LIMIT 1);
UPDATE public.product_categories SET tenant_id = (SELECT id FROM public.tenants LIMIT 1);
UPDATE public.customers SET tenant_id = (SELECT id FROM public.tenants LIMIT 1);