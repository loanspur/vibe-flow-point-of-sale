-- Fix the final 5 remaining function search path issues

-- Fix queue_campaign_emails function
CREATE OR REPLACE FUNCTION public.queue_campaign_emails(campaign_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix update_campaign_statistics function
CREATE OR REPLACE FUNCTION public.update_campaign_statistics(campaign_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- Fix create_user_invitation function
CREATE OR REPLACE FUNCTION public.create_user_invitation(tenant_id_param uuid, email_param text, role_id_param uuid, invited_by_param uuid, expires_in_hours integer DEFAULT 72)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  invitation_id UUID;
  token TEXT;
BEGIN
  -- Generate unique token
  token := generate_invitation_token();
  
  -- Create invitation
  INSERT INTO public.user_invitations (
    tenant_id,
    email,
    role_id,
    invited_by,
    invitation_token,
    expires_at
  ) VALUES (
    tenant_id_param,
    email_param,
    role_id_param,
    invited_by_param,
    token,
    now() + (expires_in_hours || ' hours')::interval
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$function$;

-- Fix create_payment_record function
CREATE OR REPLACE FUNCTION public.create_payment_record(tenant_id_param uuid, billing_plan_id_param uuid, amount_param numeric, reference_param text, currency_param text DEFAULT 'KES'::text, payment_type_param text DEFAULT 'subscription'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  payment_id UUID;
BEGIN
  INSERT INTO public.payment_history (
    tenant_id,
    billing_plan_id,
    amount,
    currency,
    payment_reference,
    payment_type,
    payment_status
  ) VALUES (
    tenant_id_param,
    billing_plan_id_param,
    amount_param,
    currency_param,
    reference_param,
    payment_type_param,
    'pending'
  ) RETURNING id INTO payment_id;
  
  RETURN payment_id;
END;
$function$;

-- Fix log_user_activity function
CREATE OR REPLACE FUNCTION public.log_user_activity(tenant_id_param uuid, user_id_param uuid, action_type_param text, resource_type_param text DEFAULT NULL::text, resource_id_param uuid DEFAULT NULL::uuid, details_param jsonb DEFAULT NULL::jsonb, ip_address_param inet DEFAULT NULL::inet, user_agent_param text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.user_activity_logs (
    tenant_id,
    user_id,
    action_type,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    tenant_id_param,
    user_id_param,
    action_type_param,
    resource_type_param,
    resource_id_param,
    details_param,
    ip_address_param,
    user_agent_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;