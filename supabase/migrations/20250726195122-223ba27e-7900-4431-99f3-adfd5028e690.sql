-- Update user profile with tenant and admin role
UPDATE public.profiles 
SET 
    tenant_id = 'd5a3d1be-5ba8-43b0-9625-3638dbcf0fb1',
    role = 'admin'::user_role,
    full_name = 'loanspur cbs',
    updated_at = NOW()
WHERE user_id = '7e1f832e-b256-4697-9a63-b974150246d9';