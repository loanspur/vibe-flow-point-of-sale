-- Add use_global_whatsapp column to business_settings table
ALTER TABLE business_settings 
ADD COLUMN use_global_whatsapp boolean DEFAULT false;