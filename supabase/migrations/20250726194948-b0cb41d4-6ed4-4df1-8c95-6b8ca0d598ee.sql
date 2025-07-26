-- Update user profile with tenant and create tenant_users entry
UPDATE public.profiles 
SET 
    tenant_id = 'd5a3d1be-5ba8-43b0-9625-3638dbcf0fb1',
    role = 'admin'::user_role,
    full_name = 'loanspur cbs',
    updated_at = NOW()
WHERE user_id = '7e1f832e-b256-4697-9a63-b974150246d9';

-- Create tenant_users entry manually
INSERT INTO public.tenant_users (
    tenant_id,
    user_id,
    role,
    is_active
) VALUES (
    'd5a3d1be-5ba8-43b0-9625-3638dbcf0fb1',
    '7e1f832e-b256-4697-9a63-b974150246d9',
    'owner',
    true
) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    role = 'owner',
    is_active = true;