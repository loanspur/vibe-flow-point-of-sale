-- Fix final batch of most critical remaining functions

-- Fix variant stock function
CREATE OR REPLACE FUNCTION public.update_variant_stock(variant_id uuid, quantity_sold integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE product_variants 
  SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
  WHERE id = variant_id;
END;
$function$;

-- Fix get account balance function
CREATE OR REPLACE FUNCTION public.get_account_balance(account_id_param uuid, as_of_date date DEFAULT CURRENT_DATE)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  balance_result NUMERIC DEFAULT 0;
BEGIN
  SELECT 
    COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0)
  INTO balance_result
  FROM accounting_entries ae
  JOIN accounting_transactions at ON ae.transaction_id = at.id
  WHERE ae.account_id = account_id_param
    AND at.transaction_date <= as_of_date
    AND at.is_posted = true;
    
  RETURN COALESCE(balance_result, 0);
END;
$function$;

-- Fix contact link function
CREATE OR REPLACE FUNCTION public.get_user_contact_profile()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id FROM contacts 
  WHERE user_id = auth.uid() 
  AND tenant_id = get_user_tenant_id()
  LIMIT 1;
$function$;

-- Fix link user to contact function
CREATE OR REPLACE FUNCTION public.link_user_to_contact(contact_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_tenant_id UUID;
  contact_tenant_id UUID;
BEGIN
  -- Get current user's tenant
  current_tenant_id := get_user_tenant_id();
  
  -- Get contact's tenant
  SELECT tenant_id INTO contact_tenant_id 
  FROM contacts 
  WHERE id = contact_id;
  
  -- Verify contact belongs to same tenant
  IF contact_tenant_id != current_tenant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Update contact with user_id
  UPDATE contacts 
  SET user_id = auth.uid()
  WHERE id = contact_id 
  AND tenant_id = current_tenant_id
  AND user_id IS NULL; -- Only link if not already linked
  
  RETURN FOUND;
END;
$function$;