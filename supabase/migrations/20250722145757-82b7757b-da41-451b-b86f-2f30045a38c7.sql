-- Enable RLS on returns table if not already enabled
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

-- Ensure the returns table has the proper tenant_id column
ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Update constraint to include tenant_id requirement for returns
ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS check_customer_or_supplier;
ALTER TABLE public.returns ADD CONSTRAINT check_customer_or_supplier 
CHECK (
  (customer_id IS NOT NULL AND supplier_id IS NULL AND tenant_id IS NOT NULL) OR 
  (customer_id IS NULL AND supplier_id IS NOT NULL AND tenant_id IS NOT NULL)
);

-- Recreate RLS policies for returns table to handle both purchase and sales returns
DROP POLICY IF EXISTS "Tenant staff can manage tenant returns" ON public.returns;
DROP POLICY IF EXISTS "Tenant users can view tenant returns" ON public.returns;

CREATE POLICY "Tenant staff can manage returns"
ON public.returns
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])));

CREATE POLICY "Tenant users can view returns"
ON public.returns
FOR SELECT
USING (tenant_id = get_user_tenant_id());