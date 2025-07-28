import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { Resend } from "npm:resend@2.0.0";

console.log('Starting create-user-account function...');

// Check if required environment variables are present
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('Environment check:', {
  hasResendKey: !!RESEND_API_KEY,
  hasSupabaseUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
});

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY is not configured!');
}

const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: string;
  tenantId: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const requestBody = await req.json();
    console.log('Request body received:', { ...requestBody, password: '[REDACTED]' });

    const {
      email,
      password,
      fullName,
      role,
      tenantId,
      loginUrl
    }: CreateUserRequest = requestBody;

    console.log('Creating user with email:', email, 'for tenant:', tenantId);

    // Validate required fields
    if (!email || !password || !fullName || !role || !tenantId) {
      throw new Error('Missing required fields');
    }

    // Initialize Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Creating user in auth system...');
    
    let userId: string;
    let isNewUser = true;
    let userStatus = 'created';
    
    // Check if user already exists by trying to get user by email
    try {
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === email);
      
      if (existingUser) {
        console.log('User already exists, checking status:', existingUser.id);
        
        // Check if user is active by looking at their profile
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', existingUser.id)
          .maybeSingle();
        
        // If user exists but has no profile or is inactive, reactivate them
        if (!profileData || !profileData.tenant_id) {
          console.log('Reactivating existing user:', existingUser.id);
          userId = existingUser.id;
          isNewUser = false;
          userStatus = 'reactivated';
          
          // Update user metadata
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              full_name: fullName,
              tenant_id: tenantId,
              role: role
            }
          });
        } else {
          // User is active, throw error
          throw new Error('User with this email is already active in the system');
        }
      }
    } catch (checkError: any) {
      if (checkError.message.includes('already active')) {
        throw checkError;
      }
      // If listing fails, continue - it might be a permission issue
      console.log('Could not check existing users, proceeding with creation:', checkError);
    }
    
    // Create new user if no existing user was found
    if (isNewUser) {
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: fullName,
          tenant_id: tenantId,
          role: role
        },
        email_confirm: true // Auto-confirm email
      });

      if (createError) {
        console.error('Error creating user in auth:', createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!authData?.user) {
        throw new Error('User creation failed - no user data returned');
      }

      userId = authData.user.id;
      console.log('New user created successfully in auth:', userId);
    }

    // Create profile record with proper error handling
    console.log('Creating profile record...');
    
    let profileData;
    
    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingProfile) {
      console.log('Profile already exists, updating it');
      // Profile exists, just update it
      const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: fullName,
          role: role as 'admin' | 'manager' | 'user' | 'cashier',
          tenant_id: tenantId,
          require_password_change: true,
          email_verified: true
        })
        .eq('user_id', userId)
        .select()
        .single();
        
      if (profileError) {
        console.error('Error updating profile:', profileError);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }
      
      profileData = updatedProfile;
    } else {
      // Create new profile
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          role: role as 'admin' | 'manager' | 'user' | 'cashier',
          tenant_id: tenantId,
          require_password_change: true,
          email_verified: true
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Try to clean up the auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }
      
      profileData = newProfile;
    }

    console.log('Profile handled successfully:', profileData);

    // Create tenant_users record with proper role mapping
    console.log('Creating tenant_users record...');
    const tenantRole = role === 'admin' ? 'admin' : 
                      role === 'manager' ? 'manager' : 
                      role === 'cashier' ? 'user' : 'user';

    const { data: tenantUserData, error: tenantUserError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role: tenantRole,
        is_active: true
      })
      .select()
      .single();

    if (tenantUserError) {
      console.error('Error creating tenant user:', tenantUserError);
      // Clean up on failure
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Failed to create tenant user: ${tenantUserError.message}`);
    }

    console.log('Tenant user created successfully:', tenantUserData);

    // Send welcome email with credentials
    console.log('Sending welcome email...');
    
    const emailSubject = userStatus === 'reactivated' 
      ? "Your VibePOS Account Has Been Reactivated" 
      : "Welcome to VibePOS - Your Account Details";
    
    let emailResponse;
    try {
      console.log('Attempting to send email to:', email);
      emailResponse = await resend.emails.send({
        from: "VibePOS Team <noreply@vibepos.shop>",
        to: [email],
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to VibePOS!</h1>
            <p>Hello ${fullName},</p>
            <p>Your VibePOS account has been ${userStatus === 'reactivated' ? 'reactivated' : 'created'} with the following details:</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
              <h3>Login Credentials</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
              <p><strong>Role:</strong> ${role}</p>
              <p><strong>Status:</strong> ${userStatus === 'reactivated' ? 'Reactivated' : 'New User'}</p>
            </div>
            <div style="background: #fff3cd; padding: 15px; margin: 20px 0;">
              <p><strong>⚠️ Important:</strong> You will be required to change your password on first login.</p>
            </div>
            <p><a href="${loginUrl}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none;">Login to VibePOS</a></p>
            <p>Best regards,<br>The VibePOS Team</p>
          </div>
        `,
      });
      console.log('Email sent successfully:', emailResponse?.data?.id);
    } catch (emailError: any) {
      console.error('Email sending error:', emailError);
      emailResponse = { error: emailError };
    }

    // Log the communication (skip if table doesn't exist)
    try {
      console.log('Attempting to log communication...');
      await supabaseAdmin
        .from('communication_logs')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          type: 'email',
          channel: 'email',
          recipient: email,
          subject: emailSubject,
          content: 'User account creation notification with login credentials',
          status: emailResponse?.error ? 'failed' : 'sent',
          external_id: emailResponse?.data?.id || null,
          error_message: emailResponse?.error?.message || null
        });
      console.log('Communication logged successfully');
    } catch (logError: any) {
      console.error('Failed to log communication (table may not exist):', logError);
      // Don't throw here, user was created successfully - this is optional logging
    }

    console.log('User creation process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        status: userStatus,
        profile_created: !!profileData,
        tenant_user_created: !!tenantUserData,
        email_sent: !emailResponse.error,
        message: userStatus === 'reactivated' 
          ? 'User account reactivated successfully and notification email sent'
          : 'User created successfully and welcome email sent'
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in create-user-account function:", error);
    
    let errorMessage = error.message || 'Failed to create user account';
    let statusCode = 500;
    
    // Handle specific error types
    if (error.message?.includes('User with this email already exists')) {
      statusCode = 409; // Conflict
    } else if (error.message?.includes('duplicate key value violates unique constraint')) {
      errorMessage = 'A user with this email already exists';
      statusCode = 409;
    } else if (error.message?.includes('Missing required fields')) {
      statusCode = 400; // Bad Request
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.toString(),
        code: error.code || 'UNKNOWN_ERROR'
      }),
      {
        status: statusCode,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);