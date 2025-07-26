import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface InvitationEmailRequest {
  email: string;
  invitationToken: string;
  inviterName: string;
  companyName: string;
  roleName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send invitation email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invitationToken, inviterName, companyName, roleName }: InvitationEmailRequest = await req.json();
    console.log("Sending invitation email to:", email);

    const origin = req.headers.get('origin') || req.headers.get('referer')?.split('/')[0] + '//' + req.headers.get('referer')?.split('/')[2] || 'https://qwtybhvdbbkbcelisuek.lovable.app';
    const acceptUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${invitationToken}&type=invite&redirect_to=${encodeURIComponent(origin)}/accept-invitation`;

    const emailResponse = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [email],
      subject: `You're invited to join ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">You're Invited!</h1>
            <p style="color: #666; font-size: 16px;">Join ${companyName} as a ${roleName}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 0 0 15px 0; color: #333;">Hi there!</p>
            <p style="margin: 0 0 15px 0; color: #333;">
              ${inviterName} has invited you to join <strong>${companyName}</strong> with the role of <strong>${roleName}</strong>.
            </p>
            <p style="margin: 0; color: #333;">
              Click the button below to accept your invitation and create your account.
            </p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${acceptUrl}" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; color: #666; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="margin: 0; word-break: break-all;">${acceptUrl}</p>
            <p style="margin: 20px 0 0 0; font-size: 12px; color: #999;">
              This invitation will expire in 72 hours. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
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