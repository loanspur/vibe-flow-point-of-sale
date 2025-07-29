import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  tenantName: string;
  contactEmail: string;
  tenantId: string;
  subdomainUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantName, contactEmail, tenantId, subdomainUrl }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${contactEmail} for tenant ${tenantName}`);

    // Get tenant subdomain if not provided
    let loginUrl = subdomainUrl;
    if (!loginUrl) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: domain } = await supabase
        .from('tenant_domains')
        .select('domain_name')
        .eq('tenant_id', tenantId)
        .eq('domain_type', 'subdomain')
        .eq('is_primary', true)
        .single();

      loginUrl = domain ? `https://${domain.domain_name}` : 'https://vibepos.com/auth';
    }

    const emailResponse = await resend.emails.send({
      from: "VibePOS Team <noreply@vibepos.com>",
      to: [contactEmail],
      subject: `Welcome to VibePOS, ${tenantName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Welcome to VibePOS!</h1>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hello ${tenantName},</h2>
            <p style="color: #475569; line-height: 1.6;">
              Welcome to VibePOS! We're excited to have you on board. Your account has been successfully set up and you're ready to start managing your business with our powerful point-of-sale system.
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b;">Getting Started</h3>
            <ul style="color: #475569; line-height: 1.6;">
              <li>Set up your products and inventory</li>
              <li>Configure your payment methods</li>
              <li>Add your team members</li>
              <li>Customize your receipt templates</li>
              <li>Start processing sales</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Access Your Dashboard
            </a>
          </div>

          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #075985;">
              <strong>Your VibePOS Dashboard:</strong><br>
              <a href="${loginUrl}" style="color: #0369a1; word-break: break-all;">${loginUrl}</a>
            </p>
          </div>

          <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="margin: 0; color: #1e40af;">
              <strong>Need help?</strong> Our support team is here to assist you. Contact us anytime for guidance and support.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0;">
              Best regards,<br>
              The VibePOS Team
            </p>
          </div>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Welcome email sent successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send welcome email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);