-- Address linter warnings related to this migration
-- 1) Ensure our helper function has an explicit search_path
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

-- 2) Move extensions to the recommended 'extensions' schema if not already there
DO $$ BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pg_cron';
  IF FOUND THEN
    EXECUTE 'ALTER EXTENSION pg_cron SET SCHEMA extensions';
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pg_net';
  IF FOUND THEN
    EXECUTE 'ALTER EXTENSION pg_net SET SCHEMA extensions';
  END IF;
END $$;