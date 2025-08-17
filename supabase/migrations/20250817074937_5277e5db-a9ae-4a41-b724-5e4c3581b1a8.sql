-- Fix quote_items table by adding tenant_id and updating RLS policies

-- Add tenant_id column to quote_items table
ALTER TABLE quote_items ADD COLUMN tenant_id uuid;

-- Update tenant_id for existing quote_items based on the quotes table
UPDATE quote_items 
SET tenant_id = q.tenant_id 
FROM quotes q 
WHERE quote_items.quote_id = q.id;

-- Make tenant_id not null
ALTER TABLE quote_items ALTER COLUMN tenant_id SET NOT NULL;

-- Now create the RLS policies for quote_items with the correct structure
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