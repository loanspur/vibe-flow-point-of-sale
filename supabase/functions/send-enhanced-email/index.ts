import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface EnhancedEmailRequest {
  templateId?: string;
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledFor?: string;
  tenantId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Enhanced email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const emailData: EnhancedEmailRequest = await req.json();
    console.log("Processing email for:", emailData.to);

    // Queue the email in database
    const { data: queueData, error: queueError } = await supabase.rpc('queue_email', {
      tenant_id_param: emailData.tenantId,
      template_id_param: emailData.templateId || null,
      to_email_param: emailData.to,
      to_name_param: emailData.toName || null,
      subject_param: emailData.subject,
      html_content_param: emailData.htmlContent,
      text_content_param: emailData.textContent || null,
      variables_param: emailData.variables || {},
      priority_param: emailData.priority || 'medium',
      scheduled_for_param: emailData.scheduledFor || null
    });

    if (queueError) {
      console.error("Error queuing email:", queueError);
      throw queueError;
    }

    // Get tenant-specific email configuration and domain info
    const { data: tenantDomain } = await supabase
      .from('tenant_domains')
      .select('domain_name, domain_type, is_primary')
      .eq('tenant_id', emailData.tenantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .single();

    // Process template variables
    let processedHtml = emailData.htmlContent;
    let processedSubject = emailData.subject;
    let processedText = emailData.textContent || '';

    if (emailData.variables) {
      // Add tenant-specific variables if not already provided
      const enhancedVariables = {
        ...emailData.variables,
        tenant_url: tenantDomain 
          ? (tenantDomain.domain_type === 'custom_domain' 
              ? `https://${tenantDomain.domain_name}`
              : `https://${tenantDomain.domain_name}`)
          : `https://tenant-${emailData.tenantId}.vibenet.shop`,
        support_url: tenantDomain
          ? (tenantDomain.domain_type === 'custom_domain'
              ? `https://${tenantDomain.domain_name}/support`
              : `https://${tenantDomain.domain_name}/support`)
          : `https://tenant-${emailData.tenantId}.vibenet.shop/support`
      };

      for (const [key, value] of Object.entries(enhancedVariables)) {
        const placeholder = `{{${key}}}`;
        processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), String(value));
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value));
        processedText = processedText.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${emailData.variables?.company_name || 'VibePOS'} <noreply@vibenet.shop>`,
      to: [emailData.to],
      subject: processedSubject,
      html: processedHtml,
      text: processedText || undefined,
    });

    console.log("Email sent successfully:", emailResponse);

    // Update email status in queue
    if (emailResponse.data?.id) {
      await supabase
        .from('email_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          external_id: emailResponse.data.id
        })
        .eq('id', queueData);

      // Log communication
      await supabase
        .from('communication_logs')
        .insert({
          tenant_id: emailData.tenantId,
          type: 'email',
          channel: 'resend',
          recipient: emailData.to,
          subject: processedSubject,
          content: processedHtml,
          status: 'sent',
          external_id: emailResponse.data.id,
          sent_at: new Date().toISOString(),
          metadata: { variables: emailData.variables }
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      queueId: queueData 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in enhanced email function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);