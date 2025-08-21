-- Add missing type column to whatsapp_templates table
ALTER TABLE public.whatsapp_templates 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';

-- Update existing records to have a default type
UPDATE public.whatsapp_templates 
SET type = 'text' 
WHERE type IS NULL;

-- Add a constraint to ensure valid types
ALTER TABLE public.whatsapp_templates 
ADD CONSTRAINT whatsapp_templates_type_check 
CHECK (type IN ('text', 'media', 'interactive', 'template'));

-- Update the whatsapp_message_logs table to include type if missing
ALTER TABLE public.whatsapp_message_logs 
ADD COLUMN IF NOT EXISTS template_type text;

-- Create index for better performance on type queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_type 
ON public.whatsapp_templates(type);

-- Add any other missing columns that might be referenced
ALTER TABLE public.whatsapp_templates 
ADD COLUMN IF NOT EXISTS variables jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.whatsapp_templates 
ADD COLUMN IF NOT EXISTS message_body text;