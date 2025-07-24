-- Create payment history table for tracking all payments
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  billing_plan_id UUID REFERENCES public.billing_plans(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_reference TEXT NOT NULL,
  payment_method TEXT DEFAULT 'paystack',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_type TEXT NOT NULL DEFAULT 'subscription', -- subscription, setup, addon
  billing_period_start DATE,
  billing_period_end DATE,
  paystack_customer_id TEXT,
  paystack_subscription_id TEXT,
  paystack_plan_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Enable RLS on payment history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment history
CREATE POLICY "Tenant admins can view payment history" 
ON public.payment_history 
FOR SELECT 
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "System can manage payment history" 
ON public.payment_history 
FOR ALL 
USING (true);

-- Create subscription management table
CREATE TABLE public.tenant_subscription_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  billing_plan_id UUID REFERENCES public.billing_plans(id),
  paystack_customer_id TEXT,
  paystack_subscription_id TEXT,
  paystack_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, suspended, past_due
  current_period_start DATE,
  current_period_end DATE,
  next_billing_date DATE,
  trial_start DATE,
  trial_end DATE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on subscription details
ALTER TABLE public.tenant_subscription_details ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription details
CREATE POLICY "Tenant admins can view subscription details" 
ON public.tenant_subscription_details 
FOR SELECT 
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "Tenant admins can update subscription details" 
ON public.tenant_subscription_details 
FOR UPDATE 
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "System can manage subscription details" 
ON public.tenant_subscription_details 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_payment_history_tenant_id ON public.payment_history(tenant_id);
CREATE INDEX idx_payment_history_reference ON public.payment_history(payment_reference);
CREATE INDEX idx_payment_history_created_at ON public.payment_history(created_at DESC);
CREATE INDEX idx_subscription_details_tenant_id ON public.tenant_subscription_details(tenant_id);
CREATE INDEX idx_subscription_details_paystack_subscription ON public.tenant_subscription_details(paystack_subscription_id);

-- Function to create payment history record
CREATE OR REPLACE FUNCTION public.create_payment_record(
  tenant_id_param UUID,
  billing_plan_id_param UUID,
  amount_param NUMERIC,
  reference_param TEXT,
  currency_param TEXT DEFAULT 'KES',
  payment_type_param TEXT DEFAULT 'subscription'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_id UUID;
BEGIN
  INSERT INTO public.payment_history (
    tenant_id,
    billing_plan_id,
    amount,
    currency,
    payment_reference,
    payment_type,
    payment_status
  ) VALUES (
    tenant_id_param,
    billing_plan_id_param,
    amount_param,
    currency_param,
    reference_param,
    payment_type_param,
    'pending'
  ) RETURNING id INTO payment_id;
  
  RETURN payment_id;
END;
$$;

-- Function to update payment status
CREATE OR REPLACE FUNCTION public.update_payment_status(
  reference_param TEXT,
  status_param TEXT,
  metadata_param JSONB DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.payment_history 
  SET 
    payment_status = status_param,
    updated_at = now(),
    paid_at = CASE WHEN status_param = 'completed' THEN now() ELSE paid_at END,
    failed_at = CASE WHEN status_param = 'failed' THEN now() ELSE failed_at END,
    metadata = CASE WHEN metadata_param IS NOT NULL THEN metadata_param ELSE metadata END
  WHERE payment_reference = reference_param;
  
  RETURN FOUND;
END;
$$;