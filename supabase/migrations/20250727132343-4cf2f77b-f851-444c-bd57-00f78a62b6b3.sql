-- Create the missing pending_email_verifications table
CREATE TABLE IF NOT EXISTS public.pending_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  verification_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  verified_at TIMESTAMP WITH TIME ZONE NULL,
  user_id UUID NULL,
  tenant_id UUID NULL,
  verification_type TEXT DEFAULT 'email_signup'
);

-- Enable RLS
ALTER TABLE public.pending_email_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "System can manage email verifications" ON public.pending_email_verifications
FOR ALL USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_pending_email_verifications_email ON public.pending_email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_pending_email_verifications_token ON public.pending_email_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_pending_email_verifications_expires ON public.pending_email_verifications(expires_at);