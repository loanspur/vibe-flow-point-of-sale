-- Add invitation tracking columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add invitation tracking columns to tenant_users table  
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending';
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status ON public.profiles(invitation_status);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_at ON public.profiles(invited_at);
CREATE INDEX IF NOT EXISTS idx_tenant_users_invitation_status ON public.tenant_users(tenant_id, invitation_status);
CREATE INDEX IF NOT EXISTS idx_tenant_users_invited_at ON public.tenant_users(tenant_id, invited_at);

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.invitation_status IS 'Status of user invitation: pending, accepted, expired, resent';
COMMENT ON COLUMN public.profiles.invited_at IS 'Timestamp when the invitation email was sent';
COMMENT ON COLUMN public.profiles.invitation_accepted_at IS 'Timestamp when user accepted the invitation and verified email';

COMMENT ON COLUMN public.tenant_users.invitation_status IS 'Status of user invitation: pending, accepted, expired, resent';
COMMENT ON COLUMN public.tenant_users.invited_at IS 'Timestamp when the invitation email was sent';
COMMENT ON COLUMN public.tenant_users.invitation_accepted_at IS 'Timestamp when user accepted the invitation and verified email';

-- Update existing users to have 'accepted' status if they have logged in
UPDATE public.profiles 
SET invitation_status = 'accepted', 
    invitation_accepted_at = created_at
WHERE invitation_status = 'pending' 
  AND user_id IN (
    SELECT id FROM auth.users 
    WHERE email_confirmed_at IS NOT NULL 
    AND last_sign_in_at IS NOT NULL
  );

UPDATE public.tenant_users 
SET invitation_status = 'accepted',
    invitation_accepted_at = created_at  
WHERE invitation_status = 'pending'
  AND user_id IN (
    SELECT id FROM auth.users 
    WHERE email_confirmed_at IS NOT NULL 
    AND last_sign_in_at IS NOT NULL
  );