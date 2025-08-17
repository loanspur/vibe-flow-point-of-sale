-- Fix priority parameter type casting in queue_email function
-- The issue is that priority_param is passed as text but column expects notification_priority enum

-- First, let's check if notification_priority enum exists and create it if it doesn't
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Check if queue_email function exists and get its definition
DO $$ 
DECLARE
    func_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'queue_email'
    ) INTO func_exists;
    
    IF func_exists THEN
        -- Drop and recreate the function with proper type casting
        DROP FUNCTION IF EXISTS queue_email(uuid, uuid, text, text, text, text, text, jsonb, text, timestamptz);
    END IF;
END $$;

-- Create or replace the queue_email function with proper type casting
CREATE OR REPLACE FUNCTION queue_email(
    tenant_id_param uuid,
    template_id_param uuid DEFAULT NULL,
    to_email_param text,
    to_name_param text DEFAULT NULL,
    subject_param text,
    html_content_param text,
    text_content_param text DEFAULT NULL,
    variables_param jsonb DEFAULT '{}',
    priority_param text DEFAULT 'medium',
    scheduled_for_param timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    queue_id uuid;
BEGIN
    INSERT INTO email_queue (
        tenant_id,
        template_id,
        to_email,
        to_name,
        subject,
        html_content,
        text_content,
        variables,
        priority,
        scheduled_for,
        status,
        created_at
    ) VALUES (
        tenant_id_param,
        template_id_param,
        to_email_param,
        to_name_param,
        subject_param,
        html_content_param,
        text_content_param,
        variables_param,
        priority_param::notification_priority, -- Cast text to enum
        scheduled_for_param,
        'queued',
        now()
    ) RETURNING id INTO queue_id;
    
    RETURN queue_id;
END;
$$;