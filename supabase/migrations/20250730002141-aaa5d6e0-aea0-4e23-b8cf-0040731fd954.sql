-- Check current RLS policies for sales table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'sales' AND schemaname = 'public';

-- Ensure RLS is enabled on sales table
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_update_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_delete_policy" ON public.sales;

-- Create comprehensive RLS policies for sales table
CREATE POLICY "Users can view sales from their tenant" 
ON public.sales 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create sales for their tenant" 
ON public.sales 
FOR INSERT 
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sales from their tenant" 
ON public.sales 
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

CREATE POLICY "Users can delete sales from their tenant" 
ON public.sales 
FOR DELETE 
USING (
  tenant_id IN (
    SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Also fix related tables that might be causing conflicts

-- Fix sale_items RLS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_items_select_policy" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_insert_policy" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_update_policy" ON public.sale_items;
DROP POLICY IF EXISTS "sale_items_delete_policy" ON public.sale_items;

CREATE POLICY "Users can view sale_items from their tenant" 
ON public.sale_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create sale_items for their tenant" 
ON public.sale_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update sale_items from their tenant" 
ON public.sale_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete sale_items from their tenant" 
ON public.sale_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM sales 
    WHERE sales.id = sale_items.sale_id 
    AND sales.tenant_id IN (
      SELECT tenant_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);