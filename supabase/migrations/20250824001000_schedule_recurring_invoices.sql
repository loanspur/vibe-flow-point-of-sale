-- Enable required extensions (no-op if already enabled)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Optional: set these at the database level (replace placeholders), or set them manually in dashboard > SQL editor
-- alter database current set app.settings.functions_base_url = 'https://<project-ref>.functions.supabase.co';
-- alter database current set app.settings.service_role_key = '<service-role-key>';

-- Helper function to invoke the Edge Function with JSON body and headers
create or replace function public.invoke_recurring_invoice_generator()
returns void
language plpgsql
security definer
as $$
declare
  v_base_url text := current_setting('app.settings.functions_base_url', true);
  v_service_role text := current_setting('app.settings.service_role_key', true);
  v_url text;
  r record;
begin
  if v_base_url is null or v_base_url = '' then
    raise exception 'Missing app.settings.functions_base_url GUC. Set it to your Edge Functions base URL.';
  end if;
  if v_service_role is null or v_service_role = '' then
    raise exception 'Missing app.settings.service_role_key GUC. Set it to your service role key.';
  end if;

  v_url := v_base_url || '/recurring-invoice-generator';

  select * into r
  from net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role
    ),
    body := jsonb_build_object('dryRun', false)
  );

  -- Optionally log non-200s
  if coalesce((r.status)::int, 0) >= 300 then
    raise warning 'Recurring invoice generator returned status %, body: %', r.status, r.response_body;
  end if;
end;
$$;

-- Create or replace a daily cron job at 03:00 UTC
do $$
declare
  v_jobid int;
begin
  select jobid into v_jobid from cron.job where jobname = 'daily_recurring_invoices';
  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
  perform cron.schedule(
    'daily_recurring_invoices',
    '0 3 * * *',
    'select public.invoke_recurring_invoice_generator();'
  );
end $$;

comment on function public.invoke_recurring_invoice_generator is 'Calls the recurring-invoice-generator Edge Function with {"dryRun":false}.';
comment on extension pg_cron is 'Used to schedule daily recurring invoice generation at 03:00 UTC';

