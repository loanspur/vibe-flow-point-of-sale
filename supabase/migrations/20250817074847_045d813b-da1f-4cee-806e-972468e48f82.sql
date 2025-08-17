-- Add a more permissive RLS policy for quotes table to help with debugging
-- This will allow authenticated users to view quotes from their tenant

-- Add a policy for general users to view quotes
CREATE POLICY "Users can view quotes from their tenant" ON public.quotes
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Add a policy for users to create quotes
CREATE POLICY "Users can create quotes for their tenant" ON public.quotes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  ) AND
  cashier_id = auth.uid()
);

-- Add a policy for users to update quotes
CREATE POLICY "Users can update quotes from their tenant" ON public.quotes
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Also ensure the quote_items table has proper RLS policies
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quote items from their tenant" ON public.quote_items
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create quote items for their tenant" ON public.quote_items
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update quote items from their tenant" ON public.quote_items
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete quote items from their tenant" ON public.quote_items
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND 
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);