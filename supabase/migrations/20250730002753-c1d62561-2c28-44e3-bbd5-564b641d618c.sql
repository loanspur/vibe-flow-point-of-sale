-- Fix cash_drawers foreign key relationship issue
-- The error was about cash_drawers_user_id_fkey relationship not found

-- Check current foreign key constraints on cash_drawers
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name 
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'cash_drawers';

-- Also fix customers table to prevent foreign key violations
-- Ensure RLS is enabled on customers table  
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_update_policy" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON public.customers;

CREATE POLICY "Users can view customers from their tenant" 
ON public.customers 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create customers for their tenant" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update customers from their tenant" 
ON public.customers 
FOR UPDATE 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete customers from their tenant" 
ON public.customers 
FOR DELETE 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Fix contacts table RLS as well since it might be related
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_policy" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_policy" ON public.contacts;

CREATE POLICY "Users can view contacts from their tenant" 
ON public.contacts 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create contacts for their tenant" 
ON public.contacts 
FOR INSERT 
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update contacts from their tenant" 
ON public.contacts 
FOR UPDATE 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete contacts from their tenant" 
ON public.contacts 
FOR DELETE 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);