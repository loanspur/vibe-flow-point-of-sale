-- Fix the final remaining function search path issue

-- Find and fix the last function without search_path - this is likely calculate_tax_amount
CREATE OR REPLACE FUNCTION public.calculate_tax_amount(tenant_id_param uuid, base_amount_param numeric, tax_rate_id_param uuid, exemption_id_param uuid DEFAULT NULL::uuid)
RETURNS TABLE(tax_amount numeric, exemption_amount numeric, final_tax_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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