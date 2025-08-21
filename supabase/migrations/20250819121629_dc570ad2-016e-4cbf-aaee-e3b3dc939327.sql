-- Add Google SSO support and OTP requirements to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS google_id text,
ADD COLUMN IF NOT EXISTS auth_method text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS otp_required_always boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_profile_data jsonb;

-- Create index for Google ID lookups
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON public.profiles(google_id);

-- Add constraint to ensure auth_method is valid
ALTER TABLE public.profiles 
ADD CONSTRAINT check_auth_method 
CHECK (auth_method IN ('email', 'google', 'both'));

-- Create email_verification_otps table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.email_verification_otps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    otp_code text NOT NULL,
    otp_type text NOT NULL DEFAULT 'email_verification',
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on OTP table
ALTER TABLE public.email_verification_otps ENABLE ROW LEVEL SECURITY;

-- Create policies for OTP table
CREATE POLICY "Users can view their own OTPs" ON public.email_verification_otps
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage OTPs" ON public.email_verification_otps
FOR ALL USING (true);

-- Create function to generate OTP codes if not exists
CREATE OR REPLACE FUNCTION public.generate_otp_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;

-- Create function to create OTP verification records
CREATE OR REPLACE FUNCTION public.create_otp_verification(
  user_id_param uuid,
  email_param text,
  otp_type_param text DEFAULT 'email_verification'
)
RETURNS TABLE(otp_code text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_otp_code text;
  expiry_time timestamp with time zone;
BEGIN
  -- Generate new OTP code
  new_otp_code := generate_otp_code();
  expiry_time := now() + interval '5 minutes';
  
  -- Clean up expired OTPs for this user
  DELETE FROM email_verification_otps 
  WHERE user_id = user_id_param 
    AND otp_type = otp_type_param 
    AND expires_at < now();
  
  -- Insert new OTP
  INSERT INTO email_verification_otps (
    user_id, 
    email, 
    otp_code, 
    otp_type, 
    expires_at
  ) VALUES (
    user_id_param, 
    email_param, 
    new_otp_code, 
    otp_type_param, 
    expiry_time
  );
  
  RETURN QUERY SELECT new_otp_code, expiry_time;
END;
$$;

-- Create function to verify OTP codes
CREATE OR REPLACE FUNCTION public.verify_otp_code(
  user_id_param uuid,
  email_param text,
  otp_code_param text,
  otp_type_param text DEFAULT 'email_verification'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  otp_record record;
  is_valid boolean := false;
BEGIN
  -- Find valid OTP
  SELECT * INTO otp_record
  FROM email_verification_otps
  WHERE user_id = user_id_param
    AND email = email_param
    AND otp_code = otp_code_param
    AND otp_type = otp_type_param
    AND expires_at > now()
    AND verified_at IS NULL
    AND attempts < 5;
    
  IF FOUND THEN
    -- Mark as verified
    UPDATE email_verification_otps
    SET verified_at = now()
    WHERE id = otp_record.id;
    
    is_valid := true;
  ELSE
    -- Increment attempts if record exists
    UPDATE email_verification_otps
    SET attempts = attempts + 1
    WHERE user_id = user_id_param
      AND email = email_param
      AND otp_code = otp_code_param
      AND otp_type = otp_type_param
      AND verified_at IS NULL;
  END IF;
  
  RETURN is_valid;
END;
$$;