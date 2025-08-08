-- Re-apply function change only (previous attempt failed due to non-relocatable extension)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;