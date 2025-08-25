-- Unified recurring invoice generator for both SaaS billing and customer subscriptions
CREATE OR REPLACE FUNCTION public.generate_recurring_invoices_safe(tenant_arg UUID DEFAULT NULL)
RETURNS TABLE(created integer, skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created integer := 0;
  v_skipped integer := 0;
  v_today date := CURRENT_DATE;
  v_period_key text;
  v_subscription_record RECORD;
BEGIN
  -- Idempotent key for month period
  v_period_key := to_char(v_today, 'YYYY-MM');

  -- ===== PHASE 1: SaaS BILLING (Tenant-to-Platform) =====
  FOR v_subscription_record IN 
    SELECT 
      ts.tenant_id,
      ts.id as subscription_id,
      ts.amount,
      bp.period as billing_period,
      ts.next_billing_date
    FROM public.tenant_subscriptions ts
    JOIN public.billing_plans bp ON ts.billing_plan_id = bp.id
    WHERE ts.status = 'active'
      AND (tenant_arg IS NULL OR ts.tenant_id = tenant_arg)
      AND ts.next_billing_date <= v_today
  LOOP
    -- Check if SaaS invoice already exists for this period
    IF EXISTS (
      SELECT 1 FROM public.accounts_receivable ar
      WHERE ar.tenant_id = v_subscription_record.tenant_id
        AND ar.reference = concat('SaaS:', v_subscription_record.subscription_id, ':', v_period_key)
    ) THEN
      v_skipped := v_skipped + 1;
    ELSE
      -- Create new SaaS invoice (platform billing)
      INSERT INTO public.accounts_receivable (
        tenant_id,
        invoice_number,
        total_amount,
        status,
        due_date,
        reference,
        description
      ) VALUES (
        v_subscription_record.tenant_id,
        concat('PLATFORM-', to_char(now(), 'YYYYMMDD'), '-', v_subscription_record.subscription_id),
        coalesce(v_subscription_record.amount, 0),
        'open',
        v_today + interval '14 days',
        concat('SaaS:', v_subscription_record.subscription_id, ':', v_period_key),
        concat('Platform subscription billing - ', v_subscription_record.billing_period)
      );
      v_created := v_created + 1;

      -- Update next billing date based on billing period
      UPDATE public.tenant_subscriptions
      SET next_billing_date = CASE 
        WHEN v_subscription_record.billing_period = 'month' THEN next_billing_date + interval '1 month'
        WHEN v_subscription_record.billing_period = 'year' THEN next_billing_date + interval '1 year'
        ELSE next_billing_date + interval '1 month'
      END
      WHERE id = v_subscription_record.subscription_id;
    END IF;
  END LOOP;

  -- ===== PHASE 2: CUSTOMER SUBSCRIPTIONS (Tenant-to-Customer) =====
  FOR v_subscription_record IN 
    SELECT 
      cs.tenant_id,
      cs.id as subscription_id,
      cs.customer_id,
      cs.amount,
      cs.billing_period,
      cs.next_invoice_date,
      cs.subscription_name
    FROM public.customer_subscriptions cs
    WHERE cs.status = 'active'
      AND (tenant_arg IS NULL OR cs.tenant_id = tenant_arg)
      AND cs.next_invoice_date <= v_today
  LOOP
    -- Check if customer subscription invoice already exists for this period
    IF EXISTS (
      SELECT 1 FROM public.accounts_receivable ar
      WHERE ar.tenant_id = v_subscription_record.tenant_id
        AND ar.customer_id = v_subscription_record.customer_id
        AND ar.reference = concat('SUB:', v_subscription_record.subscription_id, ':', v_period_key)
    ) THEN
      v_skipped := v_skipped + 1;
    ELSE
      -- Create new customer subscription invoice
      INSERT INTO public.accounts_receivable (
        tenant_id,
        customer_id,
        invoice_number,
        total_amount,
        status,
        due_date,
        reference,
        description
      ) VALUES (
        v_subscription_record.tenant_id,
        v_subscription_record.customer_id,
        concat('INV-', to_char(now(), 'YYYYMMDD'), '-', v_subscription_record.subscription_id),
        coalesce(v_subscription_record.amount, 0),
        'open',
        v_today + interval '14 days',
        concat('SUB:', v_subscription_record.subscription_id, ':', v_period_key),
        concat(v_subscription_record.subscription_name, ' - ', v_subscription_record.billing_period, ' billing')
      );
      v_created := v_created + 1;

      -- Update next invoice date based on billing period
      UPDATE public.customer_subscriptions
      SET next_invoice_date = CASE 
        WHEN v_subscription_record.billing_period = 'monthly' THEN next_invoice_date + interval '1 month'
        WHEN v_subscription_record.billing_period = 'quarterly' THEN next_invoice_date + interval '3 months'
        WHEN v_subscription_record.billing_period = 'yearly' THEN next_invoice_date + interval '1 year'
        ELSE next_invoice_date + interval '1 month'
      END
      WHERE id = v_subscription_record.subscription_id;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

-- Grant execute to authenticated users (or restrict to service role only if preferred)
REVOKE ALL ON FUNCTION public.generate_recurring_invoices_safe(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_recurring_invoices_safe(UUID) TO anon, authenticated, service_role;


