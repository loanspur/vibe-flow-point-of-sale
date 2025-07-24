-- Create tenant_subscriptions table to track tenant billing
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_plan_id UUID NOT NULL REFERENCES public.billing_plans(id),
  reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  started_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant subscriptions
CREATE POLICY "Tenant admins can manage their subscriptions"
ON public.tenant_subscriptions
FOR ALL
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view their subscriptions"
ON public.tenant_subscriptions
FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Add trigger for updated_at
CREATE TRIGGER update_tenant_subscriptions_updated_at
BEFORE UPDATE ON public.tenant_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();