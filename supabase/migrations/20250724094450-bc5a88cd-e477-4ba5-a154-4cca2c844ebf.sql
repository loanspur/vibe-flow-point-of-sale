-- Add missing columns to business_settings table to support all form fields

-- Product and inventory features
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS enable_product_units boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_warranty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_fixed_pricing boolean DEFAULT false;

-- Receipt and template configurations  
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS receipt_template text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS invoice_template text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS quote_template text DEFAULT 'standard';

-- Business registration and tax details
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS tax_identification_number text,
ADD COLUMN IF NOT EXISTS business_registration_number text;

-- Additional branding and receipt settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS receipt_header text,
ADD COLUMN IF NOT EXISTS receipt_footer text,
ADD COLUMN IF NOT EXISTS receipt_logo_url text;

-- Security and access settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS max_login_attempts integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS account_lockout_duration integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS session_timeout_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS require_password_change boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_expiry_days integer DEFAULT 90;

-- Business hours and operational settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{"monday": {"open": "09:00", "close": "17:00", "closed": false}, "tuesday": {"open": "09:00", "close": "17:00", "closed": false}, "wednesday": {"open": "09:00", "close": "17:00", "closed": false}, "thursday": {"open": "09:00", "close": "17:00", "closed": false}, "friday": {"open": "09:00", "close": "17:00", "closed": false}, "saturday": {"open": "10:00", "close": "16:00", "closed": false}, "sunday": {"open": "12:00", "close": "16:00", "closed": true}}'::jsonb;

-- Enhanced features and capabilities
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS enable_loyalty_program boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_gift_cards boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_online_orders boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_multi_location boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS low_stock_alerts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS daily_reports boolean DEFAULT true;

-- Auto-numbering and document settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS invoice_auto_number boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quote_auto_number boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS delivery_note_auto_number boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS delivery_note_prefix text DEFAULT 'DN-',
ADD COLUMN IF NOT EXISTS delivery_note_template text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS quote_validity_days integer DEFAULT 30;

-- User management and roles
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS enable_user_roles boolean DEFAULT true;

-- Communication templates and settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS email_from_address text,
ADD COLUMN IF NOT EXISTS email_from_name text,
ADD COLUMN IF NOT EXISTS email_smtp_host text,
ADD COLUMN IF NOT EXISTS email_smtp_port integer DEFAULT 587,
ADD COLUMN IF NOT EXISTS email_smtp_username text,
ADD COLUMN IF NOT EXISTS email_smtp_password text,
ADD COLUMN IF NOT EXISTS email_enable_ssl boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_api_url text,
ADD COLUMN IF NOT EXISTS sms_sender_id text,
ADD COLUMN IF NOT EXISTS sms_api_key text;

-- Purchase and procurement settings
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS purchase_default_tax_rate numeric DEFAULT 0.0000,
ADD COLUMN IF NOT EXISTS purchase_auto_receive boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS purchase_enable_partial_receive boolean DEFAULT true;

-- Additional POS and sales features
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS pos_enable_discounts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS pos_max_discount_percent numeric DEFAULT 100.00,
ADD COLUMN IF NOT EXISTS pos_enable_tips boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pos_default_payment_method text DEFAULT 'cash';

-- Product and inventory management
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS auto_generate_sku boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_barcode_scanning boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_negative_stock boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_accounting_method text DEFAULT 'FIFO',
ADD COLUMN IF NOT EXISTS default_markup_percentage numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS enable_retail_pricing boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_wholesale_pricing boolean DEFAULT false;