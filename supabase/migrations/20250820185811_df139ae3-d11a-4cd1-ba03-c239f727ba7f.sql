-- Add password change requirement fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS temp_password_created_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;