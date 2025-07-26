-- Create tenant for user (simple approach)
INSERT INTO public.tenants (
    name,
    subdomain,
    is_active,
    plan_type
) VALUES (
    'loanspur sbs',
    'loanspursbs',
    true,
    'basic'
);