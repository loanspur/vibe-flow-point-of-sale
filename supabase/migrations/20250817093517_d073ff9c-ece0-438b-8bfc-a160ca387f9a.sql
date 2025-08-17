-- Fix notification_status enum to include 'queued' status
-- The issue is that the email_queue table status column expects notification_status enum
-- but 'queued' is not in the enum values

-- First, let's check if notification_status enum exists and what values it has
DO $$ BEGIN
    -- Try to create the enum with all needed values
    CREATE TYPE notification_status AS ENUM ('pending', 'queued', 'sent', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN 
        -- If enum exists, we need to add missing values
        BEGIN
            ALTER TYPE notification_status ADD VALUE IF NOT EXISTS 'queued';
        EXCEPTION
            WHEN others THEN
                -- If we can't add the value, recreate the enum
                ALTER TYPE notification_status RENAME TO notification_status_old;
                CREATE TYPE notification_status AS ENUM ('pending', 'queued', 'sent', 'failed', 'cancelled');
                -- Update the table to use the new enum
                ALTER TABLE email_queue ALTER COLUMN status TYPE notification_status USING status::text::notification_status;
                -- Drop old enum
                DROP TYPE notification_status_old;
        END;
END $$;