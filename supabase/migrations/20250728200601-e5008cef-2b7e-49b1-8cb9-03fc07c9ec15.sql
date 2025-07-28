-- Add require_password_change column to profiles table
-- This column will track if a user needs to change their password on next login

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_require_password_change 
ON public.profiles (require_password_change) 
WHERE require_password_change = TRUE;