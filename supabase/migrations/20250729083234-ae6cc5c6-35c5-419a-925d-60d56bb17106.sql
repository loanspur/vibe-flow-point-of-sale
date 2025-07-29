-- Fix function search path security warnings by adding SET search_path TO 'public'

-- Update update_version_updated_at function
DROP FUNCTION IF EXISTS public.update_version_updated_at();
CREATE OR REPLACE FUNCTION public.update_version_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';