-- Add email verification tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN email_verified BOOLEAN DEFAULT false,
ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create OTP verification table
CREATE TABLE public.email_verification_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  otp_type TEXT NOT NULL, -- 'email_verification' or 'password_reset'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on OTP table
ALTER TABLE public.email_verification_otps ENABLE ROW LEVEL SECURITY;

-- Users can only access their own OTP records
CREATE POLICY "Users can manage their own OTP codes" 
ON public.email_verification_otps 
FOR ALL
USING (user_id = auth.uid());

-- Function to generate OTP code
CREATE OR REPLACE FUNCTION public.generate_otp_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;

-- Function to create OTP record
CREATE OR REPLACE FUNCTION public.create_otp_verification(
  user_id_param UUID,
  email_param TEXT,
  otp_type_param TEXT
)
RETURNS TABLE(otp_code TEXT, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  generated_otp TEXT;
  expiry_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate OTP and set expiry (10 minutes)
  generated_otp := generate_otp_code();
  expiry_time := now() + INTERVAL '10 minutes';
  
  -- Clean up old unused OTPs for this user and type
  DELETE FROM public.email_verification_otps 
  WHERE user_id = user_id_param 
    AND otp_type = otp_type_param 
    AND used_at IS NULL;
  
  -- Insert new OTP
  INSERT INTO public.email_verification_otps (
    user_id, email, otp_code, otp_type, expires_at
  ) VALUES (
    user_id_param, email_param, generated_otp, otp_type_param, expiry_time
  );
  
  RETURN QUERY SELECT generated_otp, expiry_time;
END;
$$;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION public.verify_otp_code(
  user_id_param UUID,
  otp_code_param TEXT,
  otp_type_param TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  otp_record RECORD;
BEGIN
  -- Find valid OTP
  SELECT * INTO otp_record
  FROM public.email_verification_otps
  WHERE user_id = user_id_param
    AND otp_code = otp_code_param
    AND otp_type = otp_type_param
    AND expires_at > now()
    AND used_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Mark OTP as used
  UPDATE public.email_verification_otps
  SET used_at = now()
  WHERE id = otp_record.id;
  
  -- If email verification, update profile
  IF otp_type_param = 'email_verification' THEN
    UPDATE public.profiles
    SET email_verified = true,
        email_verified_at = now()
    WHERE user_id = user_id_param;
  END IF;
  
  RETURN TRUE;
END;
$$;