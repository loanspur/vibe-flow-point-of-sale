-- Create RLS policies for quote_items table (if they don't already exist)

-- Check if RLS is enabled, enable it if not
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view quote items from their tenant" ON quote_items;
DROP POLICY IF EXISTS "Users can create quote items for their tenant" ON quote_items;
DROP POLICY IF EXISTS "Users can update quote items from their tenant" ON quote_items;
DROP POLICY IF EXISTS "Users can delete quote items from their tenant" ON quote_items;

-- Create the RLS policies for quote_items
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