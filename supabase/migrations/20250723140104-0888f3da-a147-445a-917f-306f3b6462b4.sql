-- Add missing template-related fields to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS invoice_number_prefix text DEFAULT 'INV-',
ADD COLUMN IF NOT EXISTS quote_number_prefix text DEFAULT 'QT-',
ADD COLUMN IF NOT EXISTS invoice_terms_conditions text;