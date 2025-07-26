-- Create trial subscription for the tenant
INSERT INTO public.tenant_subscription_details (
    tenant_id,
    billing_plan_id,
    status,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end,
    next_billing_date,
    billing_day,
    next_billing_amount,
    is_prorated_period,
    created_at,
    updated_at
) VALUES (
    'd5a3d1be-5ba8-43b0-9625-3638dbcf0fb1',
    'd029b266-578b-4901-a000-832b67e580bb', -- Starter plan
    'trial',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    CURRENT_DATE + INTERVAL '14 days',
    1,
    1999.00,
    false,
    NOW(),
    NOW()
) ON CONFLICT (tenant_id) DO UPDATE SET
    status = 'trial',
    trial_start = CURRENT_DATE,
    trial_end = CURRENT_DATE + INTERVAL '14 days',
    updated_at = NOW();