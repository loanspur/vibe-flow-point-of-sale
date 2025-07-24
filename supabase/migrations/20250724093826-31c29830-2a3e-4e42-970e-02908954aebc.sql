-- Add enable_brands column to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN enable_brands boolean DEFAULT false;