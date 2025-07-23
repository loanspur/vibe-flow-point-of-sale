-- Create database functions for notifications system

-- Create function to send notification
CREATE OR REPLACE FUNCTION public.create_notification(
  tenant_id_param UUID,
  user_id_param UUID,
  type_param notification_type,
  title_param TEXT,
  message_param TEXT,
  data_param JSONB DEFAULT '{}',
  channels_param TEXT[] DEFAULT ARRAY['in_app'],
  priority_param notification_priority DEFAULT 'medium',
  scheduled_for_param TIMESTAMPTZ DEFAULT NULL,
  expires_at_param TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    tenant_id,
    user_id,
    type,
    title,
    message,
    data,
    channels,
    priority,
    scheduled_for,
    expires_at
  ) VALUES (
    tenant_id_param,
    user_id_param,
    type_param,
    title_param,
    message_param,
    data_param,
    channels_param,
    priority_param,
    COALESCE(scheduled_for_param, now()),
    expires_at_param
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Create function to queue email
CREATE OR REPLACE FUNCTION public.queue_email(
  tenant_id_param UUID,
  template_id_param UUID DEFAULT NULL,
  to_email_param TEXT,
  to_name_param TEXT DEFAULT NULL,
  subject_param TEXT,
  html_content_param TEXT,
  text_content_param TEXT DEFAULT NULL,
  variables_param JSONB DEFAULT '{}',
  priority_param notification_priority DEFAULT 'medium',
  scheduled_for_param TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_id UUID;
BEGIN
  INSERT INTO public.email_queue (
    tenant_id,
    template_id,
    to_email,
    to_name,
    subject,
    html_content,
    text_content,
    variables,
    priority,
    scheduled_for
  ) VALUES (
    tenant_id_param,
    template_id_param,
    to_email_param,
    to_name_param,
    subject_param,
    html_content_param,
    text_content_param,
    variables_param,
    priority_param,
    COALESCE(scheduled_for_param, now())
  ) RETURNING id INTO email_id;
  
  RETURN email_id;
END;
$$;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications 
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.notifications 
  WHERE user_id = auth.uid() 
    AND is_read = false 
    AND (expires_at IS NULL OR expires_at > now());
$$;