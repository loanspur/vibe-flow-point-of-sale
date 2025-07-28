-- Mark the invitation as accepted for the user who has already signed up
UPDATE public.user_invitations 
SET 
  status = 'accepted',
  accepted_at = NOW()
WHERE email = 'magharibichicksltd@gmail.com' 
  AND tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750' 
  AND status = 'pending';