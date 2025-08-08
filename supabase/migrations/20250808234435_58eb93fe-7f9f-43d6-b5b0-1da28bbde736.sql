-- 1) Email queue table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  template_id uuid NULL,
  to_email text NOT NULL,
  to_name text NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text NULL,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'queued',
  scheduled_for timestamp with time zone NULL,
  sent_at timestamp with time zone NULL,
  external_id text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  -- Allow system (service role) to manage - permissive policy; service role bypasses RLS but keep for clarity
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_queue' AND policyname = 'System can manage email queue'
  ) THEN
    CREATE POLICY "System can manage email queue"
    ON public.email_queue
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;

  -- Tenant admins can view their queue
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'email_queue' AND policyname = 'Tenant admins can view email queue'
  ) THEN
    CREATE POLICY "Tenant admins can view email queue"
    ON public.email_queue
    FOR SELECT
    USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());
  END IF;
END $$;

-- Trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_queue_updated_at'
  ) THEN
    CREATE TRIGGER update_email_queue_updated_at
    BEFORE UPDATE ON public.email_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) RPC function to queue emails
CREATE OR REPLACE FUNCTION public.queue_email(
  tenant_id_param uuid,
  template_id_param uuid,
  to_email_param text,
  to_name_param text,
  subject_param text,
  html_content_param text,
  text_content_param text,
  variables_param jsonb,
  priority_param text,
  scheduled_for_param timestamp with time zone
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  queued_id uuid;
BEGIN
  INSERT INTO public.email_queue (
    tenant_id, template_id, to_email, to_name, subject,
    html_content, text_content, variables, priority, status, scheduled_for
  ) VALUES (
    tenant_id_param, template_id_param, to_email_param, to_name_param, subject_param,
    html_content_param, text_content_param, COALESCE(variables_param, '{}'::jsonb),
    COALESCE(priority_param, 'medium'), 'queued', scheduled_for_param
  ) RETURNING id INTO queued_id;

  RETURN queued_id;
END;
$$;