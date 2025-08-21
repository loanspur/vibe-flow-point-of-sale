-- Fix the ambiguous column reference in create_otp_verification function
CREATE OR REPLACE FUNCTION public.create_otp_verification(user_id_param uuid, email_param text, otp_type_param text DEFAULT 'email_verification'::text)
 RETURNS TABLE(otp_code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_otp_code text;
  expiry_time timestamp with time zone;
BEGIN
  -- Generate new OTP code
  new_otp_code := generate_otp_code();
  expiry_time := now() + interval '5 minutes';
  
  -- Clean up expired OTPs for this user - fix ambiguous column reference
  DELETE FROM email_verification_otps 
  WHERE user_id = user_id_param 
    AND otp_type = otp_type_param 
    AND email_verification_otps.expires_at < now();
  
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
$function$;