-- Create comprehensive notifications and communications system

-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  'system',
  'user_invitation',
  'password_reset',
  'account_verification',
  'payment_reminder',
  'order_confirmation',
  'subscription_update',
  'security_alert',
  'marketing',
  'announcement'
);

-- Create notification priority enum
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create notification status enum
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type notification_type NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '{}',
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  channels TEXT[] DEFAULT ARRAY['in_app'], -- in_app, email, sms, whatsapp
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create email queue table
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id),
  to_email TEXT NOT NULL,
  to_name TEXT,
  from_email TEXT,
  from_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '{}',
  priority notification_priority DEFAULT 'medium',
  status notification_status DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  external_id TEXT, -- Resend message ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  payment_reminders BOOLEAN DEFAULT true,
  system_announcements BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create communication logs table
CREATE TABLE public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- email, sms, whatsapp, push
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  status notification_status NOT NULL,
  external_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_templates
CREATE POLICY "Users can view their tenant email templates"
ON public.email_templates FOR SELECT
USING (tenant_id = get_user_tenant_id() OR is_system_template = true);

CREATE POLICY "Admins can manage email templates"
ON public.email_templates FOR ALL
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Create RLS policies for email_queue
CREATE POLICY "Admins can view email queue"
ON public.email_queue FOR SELECT
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "System can manage email queue"
ON public.email_queue FOR ALL
USING (true);

-- Create RLS policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
ON public.notification_preferences FOR ALL
USING (user_id = auth.uid());

-- Create RLS policies for communication_logs
CREATE POLICY "Admins can view communication logs"
ON public.communication_logs FOR SELECT
USING (tenant_id = get_user_tenant_id() AND is_tenant_admin());

CREATE POLICY "System can create communication logs"
ON public.communication_logs FOR INSERT
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_priority ON public.notifications(priority);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON public.email_queue(scheduled_for);
CREATE INDEX idx_email_queue_priority ON public.email_queue(priority);

CREATE INDEX idx_communication_logs_tenant_id ON public.communication_logs(tenant_id);
CREATE INDEX idx_communication_logs_type ON public.communication_logs(type);
CREATE INDEX idx_communication_logs_status ON public.communication_logs(status);

-- Create triggers for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at
BEFORE UPDATE ON public.email_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system email templates
INSERT INTO public.email_templates (tenant_id, name, type, subject, html_content, text_content, is_system_template, variables) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'Welcome Email',
  'account_verification',
  'Welcome to {{company_name}}!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #333; margin-bottom: 10px;">Welcome to {{company_name}}!</h1>
      <p style="color: #666; font-size: 16px;">Your account has been successfully created</p>
    </div>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="margin: 0 0 15px 0; color: #333;">Hi {{user_name}},</p>
      <p style="margin: 0 0 15px 0; color: #333;">
        Welcome to {{company_name}}! Your account has been successfully created and verified.
      </p>
      <p style="margin: 0; color: #333;">
        You can now start using all our features and services.
      </p>
    </div>
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{login_url}}" 
         style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Get Started
      </a>
    </div>
  </div>',
  'Welcome to {{company_name}}! Hi {{user_name}}, Welcome to {{company_name}}! Your account has been successfully created and verified. You can now start using all our features and services. Get started at: {{login_url}}',
  true,
  '{"company_name": "string", "user_name": "string", "login_url": "string"}'::jsonb
),
(
  '11111111-1111-1111-1111-111111111111',
  'Password Reset',
  'password_reset',
  'Reset your password for {{company_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
      <p style="color: #666; font-size: 16px;">Reset your password for {{company_name}}</p>
    </div>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="margin: 0 0 15px 0; color: #333;">Hi {{user_name}},</p>
      <p style="margin: 0 0 15px 0; color: #333;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <p style="margin: 0; color: #333;">
        If you didn''t request this, you can safely ignore this email.
      </p>
    </div>
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{reset_url}}" 
         style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </div>
    <div style="border-top: 1px solid #eee; padding-top: 20px; color: #666; font-size: 14px;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        This link will expire in 24 hours for security reasons.
      </p>
    </div>
  </div>',
  'Password Reset Request for {{company_name}}. Hi {{user_name}}, We received a request to reset your password. Reset your password at: {{reset_url}} This link will expire in 24 hours.',
  true,
  '{"company_name": "string", "user_name": "string", "reset_url": "string"}'::jsonb
),
(
  '11111111-1111-1111-1111-111111111111',
  'Order Confirmation',
  'order_confirmation',
  'Order #{{order_number}} Confirmed',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #333; margin-bottom: 10px;">Order Confirmed!</h1>
      <p style="color: #666; font-size: 16px;">Order #{{order_number}}</p>
    </div>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="margin: 0 0 15px 0; color: #333;">Hi {{customer_name}},</p>
      <p style="margin: 0 0 15px 0; color: #333;">
        Thank you for your order! We''ve received your order and it''s being processed.
      </p>
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 10px;">Order Details:</h3>
        <p style="margin: 5px 0; color: #666;"><strong>Order Number:</strong> {{order_number}}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Total Amount:</strong> {{total_amount}}</p>
        <p style="margin: 5px 0; color: #666;"><strong>Order Date:</strong> {{order_date}}</p>
      </div>
    </div>
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="{{order_url}}" 
         style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
        View Order Details
      </a>
    </div>
  </div>',
  'Order #{{order_number}} Confirmed! Hi {{customer_name}}, Thank you for your order! Order Details: Order Number: {{order_number}}, Total: {{total_amount}}, Date: {{order_date}}. View details at: {{order_url}}',
  true,
  '{"customer_name": "string", "order_number": "string", "total_amount": "string", "order_date": "string", "order_url": "string"}'::jsonb
);

-- Create database function to send notification
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