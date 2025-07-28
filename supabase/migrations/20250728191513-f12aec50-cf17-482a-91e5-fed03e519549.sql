-- Assign the cashier role to the invited user who has already signed up
INSERT INTO public.user_role_assignments (
  user_id, 
  role_id, 
  tenant_id, 
  assigned_by,
  is_active
) VALUES (
  '0d562185-0c8e-4bdb-8edb-353bff2c22ef',
  '3a6ef63c-1758-4635-b6f7-487f7010aa8d',
  '6742eb8a-434e-4c14-a91c-6d55adeb5750',
  'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e',
  true
) ON CONFLICT (user_id, role_id, tenant_id) DO UPDATE SET
  is_active = true,
  assigned_by = EXCLUDED.assigned_by;