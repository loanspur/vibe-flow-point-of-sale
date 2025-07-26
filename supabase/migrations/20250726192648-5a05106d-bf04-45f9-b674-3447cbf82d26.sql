-- First, let's drop the existing pending_verifications table if it exists and create the correct one
DROP TABLE IF EXISTS public.pending_verifications CASCADE;

-- Create the correct pending email verifications table
CREATE TABLE public.pending_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  plan_id UUID,
  verification_token TEXT UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on the table
ALTER TABLE public.pending_email_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system operations
CREATE POLICY "System can manage pending verifications" 
ON public.pending_email_verifications 
FOR ALL 
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_pending_email_verifications_updated_at
BEFORE UPDATE ON public.pending_email_verifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();