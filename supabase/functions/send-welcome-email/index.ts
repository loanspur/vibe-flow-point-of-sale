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
  ownerName?: string;
  tempPassword?: string;
  subdomain?: string;
  planName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantName, contactEmail, tenantId, subdomainUrl, ownerName, tempPassword, subdomain, planName }: WelcomeEmailRequest = await req.json();

    console.log(`Sending enhanced welcome email to ${contactEmail} for tenant ${tenantName}`);

    // Determine login URL - use subdomain if provided, otherwise construct from tenant data
    let loginUrl = subdomainUrl;
    if (!loginUrl && subdomain) {
      // Determine domain based on current environment
      const currentHost = Deno.env.get('SUPABASE_URL')?.includes('vibenet.shop') ? 'vibenet.shop' : 'vibenet.online';
      loginUrl = `https://${subdomain}.${currentHost}`;
    }
    
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
      from: "VibePOS Team <noreply@vibenet.shop>",
      to: [contactEmail],
      subject: `Welcome to VibePOS ${planName ? `${planName} Trial` : 'Trial'} - Your Account is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 12px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to VibePOS!</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Your ${planName || 'Premium'} trial is ready</p>
          </div>
          
          <!-- Personal Greeting -->
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #2563eb;">
            <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Hello ${ownerName || tenantName}! 👋</h2>
            <p style="color: #475569; line-height: 1.6; margin-bottom: 0; font-size: 16px;">
              Congratulations! Your <strong>${tenantName}</strong> business account has been successfully created with full ${planName || 'Premium'} features during your 14-day trial.
            </p>
          </div>

          <!-- Login Credentials Box -->
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
            <h3 style="color: white; margin-top: 0; font-size: 20px;">🔐 Your Login Credentials</h3>
            <div style="background-color: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 15px 0;">
              <p style="color: white; margin: 5px 0; font-size: 16px;"><strong>Email:</strong> ${contactEmail}</p>
              <p style="color: white; margin: 5px 0; font-size: 16px;"><strong>Temporary Password:</strong> <code style="background-color: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
            </div>
            <p style="color: #ecfdf5; margin: 15px 0 0 0; font-size: 14px;">⚠️ You'll be required to change this password on first login for security</p>
          </div>

          <!-- Access Instructions -->
          <div style="background-color: #eff6ff; padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #bfdbfe;">
            <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">🚀 How to Access Your Dashboard</h3>
            <ol style="color: #475569; line-height: 1.6; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Visit your business subdomain: <strong style="color: #1e40af;">${loginUrl}</strong></li>
              <li style="margin-bottom: 8px;">Log in using the credentials above</li>
              <li style="margin-bottom: 8px;">Create a new secure password when prompted</li>
              <li style="margin-bottom: 8px;">Start exploring all ${planName || 'Premium'} features!</li>
            </ol>
          </div>

          <!-- Quick Start Guide -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 15px;">✨ Quick Start Guide</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                <strong style="color: #92400e;">📦 Products</strong>
                <p style="color: #78350f; margin: 5px 0 0; font-size: 14px;">Add your inventory and set pricing</p>
              </div>
              <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; border-left: 3px solid #10b981;">
                <strong style="color: #065f46;">💳 Payments</strong>
                <p style="color: #047857; margin: 5px 0 0; font-size: 14px;">Configure your payment methods</p>
              </div>
              <div style="background-color: #ddd6fe; padding: 15px; border-radius: 8px; border-left: 3px solid #8b5cf6;">
                <strong style="color: #5b21b6;">👥 Team</strong>
                <p style="color: #6b21a8; margin: 5px 0 0; font-size: 14px;">Invite team members and set roles</p>
              </div>
              <div style="background-color: #fce7f3; padding: 15px; border-radius: 8px; border-left: 3px solid #ec4899;">
                <strong style="color: #be185d;">🧾 Receipts</strong>
                <p style="color: #9d174d; margin: 5px 0 0; font-size: 14px;">Customize receipt templates</p>
              </div>
            </div>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
              🔥 Start Your ${planName || 'Premium'} Trial Now
            </a>
          </div>

          <!-- Trial Information -->
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: center; border: 1px solid #bfdbfe;">
            <h4 style="color: #1e40af; margin-top: 0;">🎯 Your ${planName || 'Premium'} Trial Includes:</h4>
            <p style="color: #1e40af; margin-bottom: 0; font-size: 14px;">
              ✅ All Premium Features • ✅ Unlimited Products • ✅ Advanced Reports • ✅ Multi-location Support<br>
              <strong>14 days free</strong> - No credit card required during trial
            </p>
          </div>

          <!-- Support -->
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #a7f3d0;">
            <p style="margin: 0; color: #065f46; text-align: center;">
              <strong>💬 Need Help?</strong> Our support team is ready to assist you.<br>
              Email us or use the chat widget in your dashboard.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
              Best regards,<br>
              <strong>The VibePOS Team</strong>
            </p>
            <p style="color: #94a3b8; margin: 10px 0 0; font-size: 12px;">
              Bookmark your dashboard: <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
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