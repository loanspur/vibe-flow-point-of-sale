-- Fix products table RLS policies to handle cases where tenant_id might be null
-- Drop existing policies
DROP POLICY IF EXISTS "Tenant users can view tenant products" ON public.products;
DROP POLICY IF EXISTS "Tenant managers can manage tenant products" ON public.products;

-- Create more robust policies that handle tenant assignment better
CREATE POLICY "Tenant users can view their products" 
ON public.products 
FOR SELECT 
USING (
  tenant_id = get_user_tenant_id() 
  OR get_current_user_role() = 'superadmin'::user_role
);

CREATE POLICY "Tenant managers can manage their products" 
ON public.products 
FOR ALL 
USING (
  (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
  OR get_current_user_role() = 'superadmin'::user_role
)
WITH CHECK (
  (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
  OR get_current_user_role() = 'superadmin'::user_role
);

-- Also fix the product_variants table policies
DROP POLICY IF EXISTS "Tenant users can view product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Tenant managers can manage product variants" ON public.product_variants;

CREATE POLICY "Tenant users can view their product variants" 
ON public.product_variants 
FOR SELECT 
USING (
  product_id IN (
    SELECT id FROM public.products WHERE tenant_id = get_user_tenant_id()
  )
  OR get_current_user_role() = 'superadmin'::user_role
);

CREATE POLICY "Tenant managers can manage their product variants" 
ON public.product_variants 
FOR ALL 
USING (
  (product_id IN (
    SELECT id FROM public.products WHERE tenant_id = get_user_tenant_id()
  ) AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
  OR get_current_user_role() = 'superadmin'::user_role
)
WITH CHECK (
  (product_id IN (
    SELECT id FROM public.products WHERE tenant_id = get_user_tenant_id()
  ) AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
  OR get_current_user_role() = 'superadmin'::user_role
);