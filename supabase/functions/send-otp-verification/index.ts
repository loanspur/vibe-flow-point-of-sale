import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OTPRequest {
  email: string;
  otpType: 'email_verification' | 'password_reset';
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otpType, userId }: OTPRequest = await req.json();

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let targetUserId = userId;

    // If no userId provided, find user by email
    if (!targetUserId) {
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (usersError) {
        throw new Error(`Failed to find user: ${usersError.message}`);
      }

      const user = users.find(u => u.email === email);
      if (!user) {
        throw new Error('User not found');
      }
      targetUserId = user.id;
    }

    // Create OTP verification record
    const { data: otpData, error: otpError } = await supabaseAdmin
      .rpc('create_otp_verification', {
        user_id_param: targetUserId,
        email_param: email,
        otp_type_param: otpType
      });

    if (otpError) {
      throw new Error(`Failed to create OTP: ${otpError.message}`);
    }

    const otpCode = otpData[0]?.otp_code;

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Send OTP email based on type
    let subject: string;
    let htmlContent: string;

    if (otpType === 'email_verification') {
      subject = 'Verify Your Email - VibePOS';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Email Verification</h1>
          <p>Hello,</p>
          <p>Please use the following verification code to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h2 style="color: #007bff; font-size: 32px; letter-spacing: 4px; margin: 0;">${otpCode}</h2>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p>Best regards,<br>The VibePOS Team</p>
        </div>
      `;
    } else {
      subject = 'Password Reset Code - VibePOS';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Password Reset</h1>
          <p>Hello,</p>
          <p>You requested to reset your password. Please use the following code:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h2 style="color: #007bff; font-size: 32px; letter-spacing: 4px; margin: 0;">${otpCode}</h2>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>The VibePOS Team</p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: 'VibePOS <noreply@vibepos.com>',
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log('OTP email sent successfully:', emailResponse);

    // Log communication
    await supabaseAdmin
      .from('communication_logs')
      .insert({
        type: 'email',
        channel: 'email',
        recipient: email,
        subject,
        content: htmlContent,
        status: 'sent',
        user_id: targetUserId,
        sent_at: new Date().toISOString(),
        metadata: {
          otp_type: otpType,
          resend_id: emailResponse.data?.id
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        expires_at: otpData[0]?.expires_at
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-otp-verification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);