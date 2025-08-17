-- Fix priority parameter type casting in queue_email function
-- The issue is that priority_param is passed as text but column expects notification_priority enum

-- First, let's check if notification_priority enum exists and create it if it doesn't
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop the existing function if it exists (try various signatures)
DROP FUNCTION IF EXISTS queue_email;

-- Create or replace the queue_email function with proper parameter order
-- All required parameters first, then optional parameters with defaults
CREATE OR REPLACE FUNCTION queue_email(
    tenant_id_param uuid,
    to_email_param text,
    subject_param text,
    html_content_param text,
    template_id_param uuid DEFAULT NULL,
    to_name_param text DEFAULT NULL,
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