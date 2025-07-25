-- Continue fixing functions - Batch 4 (large batch)

-- Function 11: trigger_update_all_affected_account_balances
CREATE OR REPLACE FUNCTION public.trigger_update_all_affected_account_balances()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- When a transaction is posted or unposted, update all affected account balances
  IF OLD.is_posted != NEW.is_posted THEN
    UPDATE public.accounts 
    SET balance = COALESCE((
      SELECT SUM(ae.debit_amount - ae.credit_amount)
      FROM public.accounting_entries ae
      JOIN public.accounting_transactions at ON ae.transaction_id = at.id
      WHERE ae.account_id = accounts.id
        AND at.is_posted = true
    ), 0)
    WHERE id IN (
      SELECT DISTINCT ae.account_id 
      FROM public.accounting_entries ae 
      WHERE ae.transaction_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Function 12: calculate_tax_amount
CREATE OR REPLACE FUNCTION public.calculate_tax_amount(tenant_id_param uuid, base_amount_param numeric, tax_rate_id_param uuid, exemption_id_param uuid DEFAULT NULL::uuid)
 RETURNS TABLE(tax_amount numeric, exemption_amount numeric, final_tax_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  tax_rate DECIMAL;
  exemption_percentage DECIMAL DEFAULT 0;
  calculated_tax DECIMAL;
  calculated_exemption DECIMAL;
  final_amount DECIMAL;
BEGIN
  -- Get tax rate
  SELECT rate_percentage INTO tax_rate
  FROM public.tax_rates
  WHERE id = tax_rate_id_param AND tenant_id = tenant_id_param AND is_active = true;
  
  IF tax_rate IS NULL THEN
    tax_rate := 0;
  END IF;
  
  -- Calculate base tax amount
  calculated_tax := base_amount_param * (tax_rate / 100);
  
  -- Apply exemption if provided
  IF exemption_id_param IS NOT NULL THEN
    SELECT e.exemption_percentage INTO exemption_percentage
    FROM public.tax_exemptions e
    WHERE e.id = exemption_id_param 
      AND e.tenant_id = tenant_id_param 
      AND e.is_active = true
      AND (e.effective_date <= CURRENT_DATE)
      AND (e.expiry_date IS NULL OR e.expiry_date >= CURRENT_DATE);
      
    IF exemption_percentage IS NULL THEN
      exemption_percentage := 0;
    END IF;
  END IF;
  
  -- Calculate exemption amount
  calculated_exemption := calculated_tax * (exemption_percentage / 100);
  
  -- Calculate final tax amount
  final_amount := calculated_tax - calculated_exemption;
  
  RETURN QUERY SELECT calculated_tax, calculated_exemption, final_amount;
END;
$function$;

-- Function 13: get_user_contact_profile
CREATE OR REPLACE FUNCTION public.get_user_contact_profile()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT id FROM public.contacts 
  WHERE user_id = auth.uid() 
  AND tenant_id = get_user_tenant_id()
  LIMIT 1;
$function$;

-- Function 14: link_user_to_contact
CREATE OR REPLACE FUNCTION public.link_user_to_contact(contact_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  current_tenant_id UUID;
  contact_tenant_id UUID;
BEGIN
  -- Get current user's tenant
  current_tenant_id := get_user_tenant_id();
  
  -- Get contact's tenant
  SELECT tenant_id INTO contact_tenant_id 
  FROM public.contacts 
  WHERE id = contact_id;
  
  -- Verify contact belongs to same tenant
  IF contact_tenant_id != current_tenant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Update contact with user_id
  UPDATE public.contacts 
  SET user_id = auth.uid()
  WHERE id = contact_id 
  AND tenant_id = current_tenant_id
  AND user_id IS NULL; -- Only link if not already linked
  
  RETURN FOUND;
END;
$function$;

-- Function 15: create_accounts_receivable_record
CREATE OR REPLACE FUNCTION public.create_accounts_receivable_record(tenant_id_param uuid, sale_id_param uuid, customer_id_param uuid, total_amount_param numeric, due_date_param date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  ar_record_id UUID;
  invoice_number_text TEXT;
BEGIN
  -- Generate invoice number
  invoice_number_text := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((
    SELECT COUNT(*) + 1 
    FROM accounts_receivable 
    WHERE tenant_id = tenant_id_param
      AND DATE(created_at) = CURRENT_DATE
  )::TEXT, 4, '0');
  
  -- Create AR record
  INSERT INTO public.accounts_receivable (
    tenant_id,
    customer_id,
    reference_id,
    reference_type,
    invoice_number,
    invoice_date,
    due_date,
    original_amount,
    outstanding_amount,
    status
  ) VALUES (
    tenant_id_param,
    customer_id_param,
    sale_id_param,
    'sale',
    invoice_number_text,
    CURRENT_DATE,
    COALESCE(due_date_param, CURRENT_DATE + INTERVAL '30 days'),
    total_amount_param,
    total_amount_param,
    'outstanding'
  ) RETURNING id INTO ar_record_id;
  
  RETURN ar_record_id;
END;
$function$;