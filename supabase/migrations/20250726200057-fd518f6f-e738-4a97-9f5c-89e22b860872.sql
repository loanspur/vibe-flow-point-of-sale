-- Create notification tracking table to prevent duplicate emails
CREATE TABLE public.billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'trial_ending' or 'payment_due'
  notification_date DATE NOT NULL, -- The date this notification was for
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  email_sent_to TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, notification_type, notification_date)
);

-- Enable RLS
ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for system operations
CREATE POLICY "System can manage notifications" 
ON public.billing_notifications 
FOR ALL 
USING (true);

-- Create index for efficient querying
CREATE INDEX idx_billing_notifications_tenant_date 
ON public.billing_notifications(tenant_id, notification_date);

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;