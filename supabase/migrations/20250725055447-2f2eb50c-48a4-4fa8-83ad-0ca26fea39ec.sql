-- Final batch of function security fixes - Batch 5

-- Function 16: create_accounts_payable_record
CREATE OR REPLACE FUNCTION public.create_accounts_payable_record(tenant_id_param uuid, purchase_id_param uuid, supplier_id_param uuid, total_amount_param numeric, due_date_param date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  ap_record_id UUID;
  invoice_number_text TEXT;
BEGIN
  -- Generate invoice number (supplier invoice)
  invoice_number_text := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((
    SELECT COUNT(*) + 1 
    FROM accounts_payable 
    WHERE tenant_id = tenant_id_param
      AND DATE(created_at) = CURRENT_DATE
  )::TEXT, 4, '0');
  
  -- Create AP record
  INSERT INTO public.accounts_payable (
    tenant_id,
    supplier_id,
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
    supplier_id_param,
    purchase_id_param,
    'purchase',
    invoice_number_text,
    CURRENT_DATE,
    COALESCE(due_date_param, CURRENT_DATE + INTERVAL '30 days'),
    total_amount_param,
    total_amount_param,
    'outstanding'
  ) RETURNING id INTO ap_record_id;
  
  RETURN ap_record_id;
END;
$function$;

-- Function 17: create_payment_record
CREATE OR REPLACE FUNCTION public.create_payment_record(tenant_id_param uuid, billing_plan_id_param uuid, amount_param numeric, reference_param text, currency_param text DEFAULT 'KES'::text, payment_type_param text DEFAULT 'subscription'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  payment_id UUID;
BEGIN
  INSERT INTO public.payment_history (
    tenant_id,
    billing_plan_id,
    amount,
    currency,
    payment_reference,
    payment_type,
    payment_status
  ) VALUES (
    tenant_id_param,
    billing_plan_id_param,
    amount_param,
    currency_param,
    reference_param,
    payment_type_param,
    'pending'
  ) RETURNING id INTO payment_id;
  
  RETURN payment_id;
END;
$function$;

-- Function 18: update_payment_status
CREATE OR REPLACE FUNCTION public.update_payment_status(reference_param text, status_param text, metadata_param jsonb DEFAULT NULL::jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.payment_history 
  SET 
    payment_status = status_param,
    updated_at = now(),
    paid_at = CASE WHEN status_param = 'completed' THEN now() ELSE paid_at END,
    failed_at = CASE WHEN status_param = 'failed' THEN now() ELSE failed_at END,
    metadata = CASE WHEN metadata_param IS NOT NULL THEN metadata_param ELSE metadata END
  WHERE payment_reference = reference_param;
  
  RETURN FOUND;
END;
$function$;

-- Function 19: calculate_purchase_total
CREATE OR REPLACE FUNCTION public.calculate_purchase_total(purchase_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  total_amount DECIMAL DEFAULT 0;
BEGIN
  SELECT COALESCE(SUM(total_cost), 0)
  INTO total_amount
  FROM public.purchase_items
  WHERE purchase_id = purchase_id_param;
  
  RETURN total_amount;
END;
$function$;

-- Function 20: update_purchase_total
CREATE OR REPLACE FUNCTION public.update_purchase_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.purchases
  SET total_amount = public.calculate_purchase_total(
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.purchase_id
      ELSE NEW.purchase_id
    END
  )
  WHERE id = CASE 
    WHEN TG_OP = 'DELETE' THEN OLD.purchase_id
    ELSE NEW.purchase_id
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;