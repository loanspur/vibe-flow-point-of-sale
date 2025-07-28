-- Add setup_fee column to tenant_custom_pricing table
ALTER TABLE public.tenant_custom_pricing 
ADD COLUMN setup_fee NUMERIC DEFAULT NULL;