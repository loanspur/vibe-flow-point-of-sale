-- Create subscription status sync triggers and functions
-- This ensures subscription status is always in sync with payments

-- First, create a function to sync subscription status based on payments
CREATE OR REPLACE FUNCTION public.sync_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update subscription status based on payment status
  IF NEW.payment_status = 'completed' THEN
    -- Update subscription to active when payment is completed
    UPDATE tenant_subscription_details 
    SET 
      status = 'active',
      current_period_start = COALESCE(current_period_start, CURRENT_DATE),
      current_period_end = CASE 
        WHEN billing_plans.period = 'month' THEN CURRENT_DATE + INTERVAL '1 month'
        WHEN billing_plans.period = 'year' THEN CURRENT_DATE + INTERVAL '1 year'
        ELSE CURRENT_DATE + INTERVAL '1 month'
      END,
      next_billing_date = CASE 
        WHEN billing_plans.period = 'month' THEN CURRENT_DATE + INTERVAL '1 month'
        WHEN billing_plans.period = 'year' THEN CURRENT_DATE + INTERVAL '1 year'
        ELSE CURRENT_DATE + INTERVAL '1 month'
      END,
      updated_at = now()
    FROM billing_plans
    WHERE tenant_subscription_details.tenant_id = NEW.tenant_id
      AND tenant_subscription_details.billing_plan_id = billing_plans.id;
      
    -- Also sync to legacy table for backward compatibility
    UPDATE tenant_subscriptions 
    SET 
      status = 'active',
      expires_at = CASE 
        WHEN billing_plans.period = 'month' THEN CURRENT_DATE + INTERVAL '1 month'
        WHEN billing_plans.period = 'year' THEN CURRENT_DATE + INTERVAL '1 year'
        ELSE CURRENT_DATE + INTERVAL '1 month'
      END,
      updated_at = now()
    FROM billing_plans, tenant_subscription_details tsd
    WHERE tenant_subscriptions.tenant_id = NEW.tenant_id
      AND tsd.tenant_id = NEW.tenant_id
      AND tsd.billing_plan_id = billing_plans.id;
      
  ELSIF NEW.payment_status = 'failed' THEN
    -- Update subscription to past_due when payment fails
    UPDATE tenant_subscription_details 
    SET 
      status = 'past_due',
      updated_at = now()
    WHERE tenant_id = NEW.tenant_id;
    
    UPDATE tenant_subscriptions 
    SET 
      status = 'past_due',
      updated_at = now()
    WHERE tenant_id = NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on payment_history to auto-sync subscription status
CREATE TRIGGER trigger_sync_subscription_on_payment
  AFTER INSERT OR UPDATE ON payment_history
  FOR EACH ROW
  WHEN (NEW.payment_status IN ('completed', 'failed'))
  EXECUTE FUNCTION sync_subscription_status();

-- Create function to manually sync subscription status for a tenant
CREATE OR REPLACE FUNCTION public.manual_sync_subscription_status(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  latest_payment RECORD;
  sub_record RECORD;
BEGIN
  -- Get the latest payment for this tenant
  SELECT * INTO latest_payment
  FROM payment_history 
  WHERE tenant_id = tenant_id_param 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Get subscription details
  SELECT * INTO sub_record
  FROM tenant_subscription_details
  WHERE tenant_id = tenant_id_param;
  
  IF latest_payment.id IS NOT NULL AND sub_record.id IS NOT NULL THEN
    -- Apply the same logic as the trigger
    IF latest_payment.payment_status = 'completed' THEN
      UPDATE tenant_subscription_details 
      SET 
        status = 'active',
        current_period_start = COALESCE(current_period_start, CURRENT_DATE),
        current_period_end = CASE 
          WHEN billing_plans.period = 'month' THEN CURRENT_DATE + INTERVAL '1 month'
          WHEN billing_plans.period = 'year' THEN CURRENT_DATE + INTERVAL '1 year'
          ELSE CURRENT_DATE + INTERVAL '1 month'
        END,
        next_billing_date = CASE 
          WHEN billing_plans.period = 'month' THEN CURRENT_DATE + INTERVAL '1 month'
          WHEN billing_plans.period = 'year' THEN CURRENT_DATE + INTERVAL '1 year'
          ELSE CURRENT_DATE + INTERVAL '1 month'
        END,
        updated_at = now()
      FROM billing_plans
      WHERE tenant_subscription_details.tenant_id = tenant_id_param
        AND tenant_subscription_details.billing_plan_id = billing_plans.id;
    END IF;
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_history_tenant_status ON payment_history(tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscription_details_status ON tenant_subscription_details(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(tenant_id, status);