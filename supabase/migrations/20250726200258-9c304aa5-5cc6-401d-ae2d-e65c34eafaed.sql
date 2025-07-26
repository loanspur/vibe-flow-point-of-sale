-- Schedule billing notifications to run daily at 9:00 AM
SELECT cron.schedule(
  'daily-billing-notifications',
  '0 9 * * *', -- Every day at 9:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://qwtybhvdbbkbcelisuek.supabase.co/functions/v1/billing-notifications',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);