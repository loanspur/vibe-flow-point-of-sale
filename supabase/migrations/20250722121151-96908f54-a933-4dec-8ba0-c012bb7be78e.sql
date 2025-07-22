-- Enhance the AR/AP system to properly track unpaid sales and purchases

-- Function to create accounts receivable record for credit sales
CREATE OR REPLACE FUNCTION public.create_accounts_receivable_record(
  tenant_id_param UUID,
  sale_id_param UUID,
  customer_id_param UUID,
  total_amount_param NUMERIC,
  due_date_param DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to create accounts payable record for purchases
CREATE OR REPLACE FUNCTION public.create_accounts_payable_record(
  tenant_id_param UUID,
  purchase_id_param UUID,
  supplier_id_param UUID,
  total_amount_param NUMERIC,
  due_date_param DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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