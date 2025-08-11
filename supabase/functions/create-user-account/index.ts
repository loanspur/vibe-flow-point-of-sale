import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { Resend } from "npm:resend@4.0.0";

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
    console.log('Starting user creation process...');
    const requestBody = await req.json();
    console.log('Request received for email:', requestBody.email);

    const {
      email,
      password,
      fullName,
      role,
      tenantId,
      loginUrl
    }: CreateUserRequest = requestBody;

    // Validate required fields
    if (!email || !password || !fullName || !role || !tenantId) {
      throw new Error('Missing required fields');
    }

    console.log('Creating user with email:', email, 'for tenant:', tenantId);

    // Initialize Supabase admin client
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

    console.log('Supabase client initialized');

    let userId: string;
    let isNewUser = true;
    let userStatus = 'created';

    // First check if user already exists
    console.log('Checking if user already exists...');
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
    
    if (existingUser && !getUserError) {
      console.log('User already exists in auth system:', existingUser.id);
      userId = existingUser.id;
      isNewUser = false;
      userStatus = 'existing';
      
      // Check if user already has a profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (existingProfile) {
        console.log('User already has a profile, updating role and tenant...');
        // Update existing profile
        const { data: profileData, error: profileError } = await supabaseAdmin
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
          throw new Error(`Failed to update user profile: ${profileError.message}`);
        }
        
        console.log('Profile updated successfully:', profileData);
      } else {
        console.log('Creating profile for existing user...');
        // Create new profile for existing user
        const { data: profileData, error: profileError } = await supabaseAdmin
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
          console.error('Error creating profile for existing user:', profileError);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }
        
        console.log('Profile created for existing user:', profileData);
      }
    } else {
      console.log('Creating new user in auth system...');
      // Create user with admin API
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: fullName,
          tenant_id: tenantId,
          role: role
        },
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user in auth:', createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!authData?.user) {
        throw new Error('User creation failed - no user data returned');
      }

      userId = authData.user.id;
      console.log('User created successfully in auth:', userId);

      // Create profile record
      console.log('Creating profile record...');
      const { data: profileData, error: profileError } = await supabaseAdmin
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
        // Clean up auth user if profile creation fails
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log('Profile created successfully:', profileData);
    }

    // Create or update tenant_users record
    console.log('Creating/updating tenant_users record...');
    const tenantRole = role === 'admin' ? 'admin' : 
                      role === 'manager' ? 'manager' : 
                      role === 'cashier' ? 'user' : 'user';

    // Check if tenant user relationship already exists
    const { data: existingTenantUser } = await supabaseAdmin
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    let tenantUserData;
    if (existingTenantUser) {
      console.log('Updating existing tenant user relationship...');
      const { data, error: tenantUserError } = await supabaseAdmin
        .from('tenant_users')
        .update({
          role: tenantRole,
          is_active: true
        })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .select()
        .single();

      if (tenantUserError) {
        console.error('Error updating tenant user:', tenantUserError);
        throw new Error(`Failed to update tenant user: ${tenantUserError.message}`);
      }
      tenantUserData = data;
      userStatus = 'reactivated';
    } else {
      console.log('Creating new tenant user relationship...');
      const { data, error: tenantUserError } = await supabaseAdmin
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
        // Only cleanup if this was a new user
        if (isNewUser) {
          try {
            await supabaseAdmin.from('profiles').delete().eq('user_id', userId);
            await supabaseAdmin.auth.admin.deleteUser(userId);
          } catch (cleanupError) {
            console.error('Failed to cleanup on tenant user creation failure:', cleanupError);
          }
        }
        throw new Error(`Failed to create tenant user: ${tenantUserError.message}`);
      }
      tenantUserData = data;
    }

    console.log('Tenant user created successfully:', tenantUserData);

    // Send welcome email using exact OTP approach
    console.log('Sending welcome email...');
    
    const emailSubject = userStatus === 'reactivated' 
      ? "Your VibePOS Account Has Been Reactivated" 
      : "Welcome to VibePOS - Your Account Details";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to VibePOS!</h1>
        <p>Hello ${fullName},</p>
        <p>Your VibePOS account has been created with the following details:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h3>Login Credentials</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Role:</strong> ${role}</p>
        </div>
        <div style="background: #fff3cd; padding: 15px; margin: 20px 0;">
          <p><strong>⚠️ Important:</strong> You will be required to change your password on first login.</p>
        </div>
        <p style="text-align: center;">
          <a href="${loginUrl}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Login to VibePOS</a>
        </p>
        <p>Best regards,<br>The VibePOS Team</p>
      </div>
    `;

    // Initialize Resend (exactly as in OTP function)
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const emailResponse = await resend.emails.send({
      from: 'VibePOS <noreply@vibenet.shop>',
      to: [email],
      subject: emailSubject,
      html: htmlContent,
    });

    console.log('Resend response:', emailResponse);

    // Check if Resend returned an error (exactly as in OTP function)
    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message || emailResponse.error}`);
    }

    // Log communication (optional - don't fail if this fails)
    try {
      await supabaseAdmin
        .from('communication_logs')
        .insert({
          type: 'email',
          channel: 'email',
          recipient: email,
          subject: emailSubject,
          content: htmlContent,
          status: 'sent',
          user_id: userId,
          tenant_id: tenantId,
          sent_at: new Date().toISOString(),
          metadata: {
            user_creation: true,
            user_status: userStatus,
            resend_id: emailResponse.data?.id
          }
        });
    } catch (logError) {
      console.error('Failed to log communication (non-fatal):', logError);
    }

    console.log('User creation process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        status: userStatus,
        profile_created: true,
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