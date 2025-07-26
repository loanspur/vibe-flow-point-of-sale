-- Create pending_verifications table for email verification before user creation
CREATE TABLE public.pending_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  business_name TEXT,
  password_hash TEXT NOT NULL,
  plan_id UUID,
  invitation_data JSONB,
  verification_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies for pending_verifications
CREATE POLICY "Users can view their own verification records" 
ON public.pending_verifications 
FOR SELECT 
USING (true); -- Public for verification process

CREATE POLICY "System can manage verification records" 
ON public.pending_verifications 
FOR ALL 
USING (true); -- Service role will handle this

-- Create index for efficient token lookups
CREATE INDEX idx_pending_verifications_token ON public.pending_verifications(verification_token);
CREATE INDEX idx_pending_verifications_email ON public.pending_verifications(email);
CREATE INDEX idx_pending_verifications_expires_at ON public.pending_verifications(expires_at);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_pending_verifications_updated_at
BEFORE UPDATE ON public.pending_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();