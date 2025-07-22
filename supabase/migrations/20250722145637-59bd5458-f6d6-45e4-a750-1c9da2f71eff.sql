-- Add supplier_id field to returns table for purchase returns
ALTER TABLE public.returns ADD COLUMN supplier_id UUID REFERENCES public.contacts(id);

-- Add constraint to ensure either customer_id or supplier_id is set, but not both
ALTER TABLE public.returns ADD CONSTRAINT check_customer_or_supplier 
CHECK (
  (customer_id IS NOT NULL AND supplier_id IS NULL) OR 
  (customer_id IS NULL AND supplier_id IS NOT NULL)
);

-- Update the RLS policies to handle both customers and suppliers
DROP POLICY IF EXISTS "Tenant staff can manage tenant returns" ON public.returns;
CREATE POLICY "Tenant staff can manage tenant returns"
ON public.returns
FOR ALL
USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])));

DROP POLICY IF EXISTS "Tenant users can view tenant returns" ON public.returns;
CREATE POLICY "Tenant users can view tenant returns"
ON public.returns
FOR SELECT
USING (tenant_id = get_user_tenant_id());