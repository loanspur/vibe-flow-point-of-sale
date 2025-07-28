import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface VerifyOTPRequest {
  userId?: string;
  email?: string;
  otpCode: string;
  otpType: 'email_verification' | 'password_reset';
  newPassword?: string; // Required for password_reset
}

// Rate limiting helper
async function checkRateLimit(supabase: any, identifier: string, actionType: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    identifier_param: identifier,
    action_type_param: actionType,
    max_attempts: 10, // 10 verification attempts
    window_minutes: 15, // per 15 minutes
    block_minutes: 60 // block for 1 hour
  });
  
  if (error) {
    console.error('Rate limit check error:', error);
    return false; // Fail safe - block on error
  }
  
  return data === true;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request body:', await req.clone().text());
    const { userId, email, otpCode, otpType, newPassword }: VerifyOTPRequest = await req.json();
    
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check rate limit (10 attempts per 15 minutes per IP)
    const isAllowed = await checkRateLimit(supabaseAdmin, clientIP, 'otp_verification');
    if (!isAllowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many verification attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        { 
          status: 429, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    let targetUserId = userId;

    // For password reset, find user by email if no userId provided
    if (!targetUserId && email && otpType === 'password_reset') {
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.find(u => u.email === email);
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      targetUserId = user.id;
    }

    // For password reset with newPassword, we need to verify OTP manually to avoid marking it as used prematurely
    if (otpType === 'password_reset' && newPassword) {
      // Manual OTP verification for password reset
      const { data: otpRecords, error: otpError } = await supabaseAdmin
        .from('email_verification_otps')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('otp_code', otpCode)
        .eq('otp_type', otpType)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (otpError || !otpRecords || otpRecords.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired OTP code' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Mark OTP as used
      await supabaseAdmin
        .from('email_verification_otps')
        .update({ used_at: new Date().toISOString() })
        .eq('id', otpRecords[0].id);

      // Update user password
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      );

      if (passwordError) {
        console.error('Password update error:', passwordError);
        throw new Error(`Failed to update password: ${passwordError.message}`);
      }

      // Log the password reset
      await supabaseAdmin
        .from('communication_logs')
        .insert({
          type: 'system',
          channel: 'system',
          recipient: targetUserId,
          subject: 'Password Reset Completed',
          content: 'User password was successfully reset using OTP verification',
          status: 'completed',
          user_id: targetUserId,
          sent_at: new Date().toISOString(),
          metadata: {
            action: 'password_reset_completed'
          }
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Password reset successfully' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // For other cases, use the standard verify_otp_code function
    const { data: isValid, error: verifyError } = await supabaseAdmin
      .rpc('verify_otp_code', {
        user_id_param: targetUserId,
        otp_code_param: otpCode,
        otp_type_param: otpType
      });

    if (verifyError) {
      console.error('OTP verification error:', verifyError);
      throw new Error(`Failed to verify OTP: ${verifyError.message}`);
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OTP code' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('OTP verification successful for user:', targetUserId);

    // Handle password reset (first step - just verification)
    if (otpType === 'password_reset') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP verified successfully. You can now set your new password.' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Handle email verification
    if (otpType === 'email_verification') {
      // Email verification is handled in the verify_otp_code function
      // Log the email verification
      await supabaseAdmin
        .from('communication_logs')
        .insert({
          type: 'system',
          channel: 'system',
          recipient: targetUserId,
          subject: 'Email Verification Completed',
          content: 'User email was successfully verified using OTP',
          status: 'completed',
          user_id: targetUserId,
          sent_at: new Date().toISOString(),
          metadata: {
            action: 'email_verification_completed'
          }
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email verified successfully' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid OTP type' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in verify-otp function:', error);
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