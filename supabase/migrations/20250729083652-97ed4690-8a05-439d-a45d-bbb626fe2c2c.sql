-- Fix function search path security warnings by properly handling dependencies

-- Drop triggers first
DROP TRIGGER IF EXISTS update_application_versions_updated_at ON public.application_versions;
DROP TRIGGER IF EXISTS update_tenant_version_tracking_updated_at ON public.tenant_version_tracking;

-- Drop and recreate the function with proper search path
DROP FUNCTION IF EXISTS public.update_version_updated_at();

CREATE OR REPLACE FUNCTION public.update_version_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER update_application_versions_updated_at
  BEFORE UPDATE ON public.application_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_version_updated_at();

CREATE TRIGGER update_tenant_version_tracking_updated_at
  BEFORE UPDATE ON public.tenant_version_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_version_updated_at();