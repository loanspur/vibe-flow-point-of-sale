-- Create comprehensive email management system for superadmins

-- Email campaigns table for managing email marketing campaigns
CREATE TABLE public.email_campaigns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id),
    html_content TEXT NOT NULL,
    text_content TEXT,
    sender_name TEXT DEFAULT 'VibePOS Team',
    sender_email TEXT DEFAULT 'noreply@vibepos.com',
    campaign_type TEXT NOT NULL DEFAULT 'marketing', -- marketing, transactional, announcement, retention
    status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, completed
    target_audience TEXT DEFAULT 'all', -- all, active_tenants, trial_tenants, churned_tenants, custom
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    
    -- Campaign statistics
    total_recipients INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_unsubscribed INTEGER DEFAULT 0
);

-- Client segments for targeted email campaigns
CREATE TABLE public.client_segments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB NOT NULL, -- JSON criteria for filtering clients
    is_dynamic BOOLEAN DEFAULT true, -- true = auto-update, false = static list
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    tenant_count INTEGER DEFAULT 0
);

-- Campaign recipients tracking
CREATE TABLE public.email_campaign_recipients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, unsubscribed
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    external_id TEXT, -- Email service provider ID
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(campaign_id, tenant_id, recipient_email)
);

-- Email automation rules for triggered emails
CREATE TABLE public.email_automation_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL, -- tenant_created, trial_ending, payment_failed, etc.
    trigger_conditions JSONB DEFAULT '{}',
    template_id UUID REFERENCES public.email_templates(id),
    delay_minutes INTEGER DEFAULT 0, -- Delay before sending
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Statistics
    total_triggered INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Email campaign analytics for detailed reporting
CREATE TABLE public.email_campaign_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    unsubscribed_count INTEGER DEFAULT 0,
    revenue_attributed NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    UNIQUE(campaign_id, metric_date)
);

-- Email blacklist for managing unsubscribes and bounces
CREATE TABLE public.email_blacklist (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL, -- unsubscribed, bounced, spam_complaint, manual
    tenant_id UUID,
    blacklisted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    blacklisted_by UUID,
    notes TEXT,
    is_global BOOLEAN DEFAULT false -- Global blacklist vs tenant-specific
);

-- Enable RLS on all tables
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for superadmin access
CREATE POLICY "Superadmins can manage email campaigns"
ON public.email_campaigns
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can manage client segments"
ON public.client_segments
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can manage campaign recipients"
ON public.email_campaign_recipients
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can manage automation rules"
ON public.email_automation_rules
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can view campaign analytics"
ON public.email_campaign_analytics
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin');

CREATE POLICY "Superadmins can manage email blacklist"
ON public.email_blacklist
FOR ALL
TO authenticated
USING (get_current_user_role() = 'superadmin');

-- Create indexes for performance
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled_at ON public.email_campaigns(scheduled_at);
CREATE INDEX idx_email_campaign_recipients_campaign_id ON public.email_campaign_recipients(campaign_id);
CREATE INDEX idx_email_campaign_recipients_status ON public.email_campaign_recipients(status);
CREATE INDEX idx_email_campaign_recipients_tenant_id ON public.email_campaign_recipients(tenant_id);
CREATE INDEX idx_email_automation_rules_trigger_event ON public.email_automation_rules(trigger_event);
CREATE INDEX idx_email_blacklist_email ON public.email_blacklist(email);

-- Function to get active tenants for email campaigns
CREATE OR REPLACE FUNCTION public.get_campaign_target_tenants(
    target_audience_param TEXT,
    segment_criteria_param JSONB DEFAULT NULL
)
RETURNS TABLE(
    tenant_id UUID,
    tenant_name TEXT,
    admin_email TEXT,
    admin_name TEXT,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        p.email as admin_email,
        p.full_name as admin_name,
        t.status::TEXT,
        t.created_at
    FROM public.tenants t
    JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.role IN ('owner', 'admin')
    JOIN public.profiles p ON tu.user_id = p.user_id
    WHERE 
        CASE 
            WHEN target_audience_param = 'all' THEN true
            WHEN target_audience_param = 'active_tenants' THEN t.status = 'active'
            WHEN target_audience_param = 'trial_tenants' THEN t.status = 'trial'
            WHEN target_audience_param = 'churned_tenants' THEN t.status = 'cancelled'
            ELSE true
        END
        AND t.is_active = true
        AND p.email IS NOT NULL
        AND p.email NOT IN (SELECT email FROM public.email_blacklist WHERE is_global = true)
    ORDER BY t.created_at DESC;
END;
$$;

-- Function to queue campaign emails
CREATE OR REPLACE FUNCTION public.queue_campaign_emails(
    campaign_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    campaign_record RECORD;
    recipient_record RECORD;
    queued_count INTEGER DEFAULT 0;
BEGIN
    -- Get campaign details
    SELECT * INTO campaign_record
    FROM public.email_campaigns
    WHERE id = campaign_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;
    
    -- Get target recipients based on campaign audience
    FOR recipient_record IN 
        SELECT * FROM get_campaign_target_tenants(
            campaign_record.target_audience, 
            campaign_record.metadata
        )
    LOOP
        -- Insert into campaign recipients
        INSERT INTO public.email_campaign_recipients (
            campaign_id,
            tenant_id,
            recipient_email,
            recipient_name,
            status
        ) VALUES (
            campaign_id_param,
            recipient_record.tenant_id,
            recipient_record.admin_email,
            recipient_record.admin_name,
            'pending'
        ) ON CONFLICT (campaign_id, tenant_id, recipient_email) DO NOTHING;
        
        -- Queue the actual email
        INSERT INTO public.email_queue (
            to_email,
            to_name,
            subject,
            html_content,
            text_content,
            from_email,
            from_name,
            priority,
            metadata
        ) VALUES (
            recipient_record.admin_email,
            recipient_record.admin_name,
            campaign_record.subject,
            campaign_record.html_content,
            campaign_record.text_content,
            campaign_record.sender_email,
            campaign_record.sender_name,
            'medium',
            jsonb_build_object(
                'campaign_id', campaign_id_param,
                'tenant_id', recipient_record.tenant_id,
                'campaign_type', campaign_record.campaign_type
            )
        );
        
        queued_count := queued_count + 1;
    END LOOP;
    
    -- Update campaign statistics
    UPDATE public.email_campaigns
    SET 
        total_recipients = queued_count,
        status = 'sending',
        sent_at = now(),
        updated_at = now()
    WHERE id = campaign_id_param;
    
    RETURN queued_count;
END;
$$;

-- Function to update campaign statistics from recipient data
CREATE OR REPLACE FUNCTION public.update_campaign_statistics(
    campaign_id_param UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.email_campaigns
    SET 
        emails_sent = (
            SELECT COUNT(*) FROM public.email_campaign_recipients 
            WHERE campaign_id = campaign_id_param AND status != 'pending'
        ),
        emails_delivered = (
            SELECT COUNT(*) FROM public.email_campaign_recipients 
            WHERE campaign_id = campaign_id_param AND delivered_at IS NOT NULL
        ),
        emails_opened = (
            SELECT COUNT(*) FROM public.email_campaign_recipients 
            WHERE campaign_id = campaign_id_param AND opened_at IS NOT NULL
        ),
        emails_clicked = (
            SELECT COUNT(*) FROM public.email_campaign_recipients 
            WHERE campaign_id = campaign_id_param AND clicked_at IS NOT NULL
        ),
        emails_bounced = (
            SELECT COUNT(*) FROM public.email_campaign_recipients 
            WHERE campaign_id = campaign_id_param AND bounced_at IS NOT NULL
        ),
        emails_unsubscribed = (
            SELECT COUNT(*) FROM public.email_campaign_recipients 
            WHERE campaign_id = campaign_id_param AND unsubscribed_at IS NOT NULL
        ),
        updated_at = now()
    WHERE id = campaign_id_param;
END;
$$;

-- Function to create predefined client segments
CREATE OR REPLACE FUNCTION public.create_default_client_segments()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Active paying customers
    INSERT INTO public.client_segments (name, description, criteria, created_by) VALUES
    ('Active Paying Customers', 'Tenants with active paid subscriptions', 
     '{"status": "active", "subscription_type": "paid"}', 
     (SELECT id FROM auth.users WHERE email = 'admin@vibepos.com' LIMIT 1)),
    
    ('Trial Users', 'Tenants currently in trial period', 
     '{"status": "trial"}', 
     (SELECT id FROM auth.users WHERE email = 'admin@vibepos.com' LIMIT 1)),
    
    ('High Value Customers', 'Tenants on Professional or Enterprise plans', 
     '{"billing_plan": ["Professional", "Enterprise"]}', 
     (SELECT id FROM auth.users WHERE email = 'admin@vibepos.com' LIMIT 1)),
    
    ('Recent Signups', 'Tenants created in the last 30 days', 
     '{"created_within_days": 30}', 
     (SELECT id FROM auth.users WHERE email = 'admin@vibepos.com' LIMIT 1)),
    
    ('Churned Customers', 'Tenants who cancelled their subscription', 
     '{"status": "cancelled"}', 
     (SELECT id FROM auth.users WHERE email = 'admin@vibepos.com' LIMIT 1))
    ON CONFLICT DO NOTHING;
END;
$$;

-- Create default segments
SELECT public.create_default_client_segments();

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_campaigns_updated_at 
    BEFORE UPDATE ON public.email_campaigns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_segments_updated_at 
    BEFORE UPDATE ON public.client_segments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_automation_rules_updated_at 
    BEFORE UPDATE ON public.email_automation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();