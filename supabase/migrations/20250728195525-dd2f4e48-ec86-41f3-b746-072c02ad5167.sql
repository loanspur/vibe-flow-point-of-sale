-- Remove invitation-related tables and functions
-- This migration removes all invitation functionality

-- Drop invitation-related functions
DROP FUNCTION IF EXISTS public.create_user_invitation(uuid, text, uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.generate_invitation_token();

-- Drop invitation-related tables
DROP TABLE IF EXISTS public.user_invitations CASCADE;

-- Remove invitation-related columns from other tables if they exist
-- (This is a safety check - these columns may not exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'user_activity_logs' 
               AND column_name = 'invitation_id') THEN
        ALTER TABLE public.user_activity_logs DROP COLUMN invitation_id;
    END IF;
END $$;