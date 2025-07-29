import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailConfigRequest {
  tenantId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId }: EmailConfigRequest = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if tenant has a verified custom domain with email configuration
    const { data: customDomain } = await supabase
      .from('tenant_domains')
      .select(`
        domain_name,
        email_from_address,
        email_from_name,
        email_smtp_host,
        email_smtp_port,
        email_smtp_username
      `)
      .eq('tenant_id', tenantId)
      .eq('domain_type', 'custom')
      .eq('status', 'verified')
      .not('email_from_address', 'is', null)
      .single();

    if (customDomain) {
      // Use tenant's custom domain email configuration
      return new Response(JSON.stringify({
        success: true,
        config: {
          fromEmail: customDomain.email_from_address,
          fromName: customDomain.email_from_name || `${customDomain.domain_name} Team`,
          smtpHost: customDomain.email_smtp_host,
          smtpPort: customDomain.email_smtp_port || 587,
          smtpUsername: customDomain.email_smtp_username,
          isCustomConfig: true,
          domain: customDomain.domain_name
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // For all tenants without custom domains, use system-wide email configuration
    // This is managed at the superadmin level and ensures consistent branding
    return new Response(JSON.stringify({
      success: true,
      config: {
        fromEmail: "noreply@vibepos.com", // System-wide sender
        fromName: "VibePOS Team", // System-wide name
        isCustomConfig: false,
        isSystemConfig: true
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error('Error getting tenant email config:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        config: {
          fromEmail: "noreply@vibepos.com",
          fromName: "VibePOS Team",
          isCustomConfig: false,
          isSystemConfig: true
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
};

serve(handler);