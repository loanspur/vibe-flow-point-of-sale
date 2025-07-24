-- Add enable_overselling column to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN enable_overselling boolean DEFAULT false;