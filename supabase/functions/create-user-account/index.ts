import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    const {
      email,
      password,
      fullName,
      role,
      tenantId,
      loginUrl
    }: CreateUserRequest = await req.json();

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
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.find(u => u.email === email);
    
    if (userExists) {
      throw new Error('User with this email already exists');
    }
    
    // Create user with admin API
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

    const userId = authData.user.id;
    console.log('User created successfully in auth:', userId);

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
    const emailResponse = await resend.emails.send({
      from: "VibePOS Team <noreply@vibepos.com>",
      to: [email],
      subject: "Welcome to VibePOS - Your Account Details",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to VibePOS</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to VibePOS!</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Your account has been created successfully</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Hello ${fullName}!</h2>
            
            <p>Your VibePOS account has been created with the following details:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">Login Credentials</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
              <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
              <p><strong>Tenant:</strong> ${tenantId}</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #856404;">⚠️ Important Security Notice</h4>
              <p style="margin: 0; color: #856404;">You will be required to change your password on first login for security purposes.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to VibePOS</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <h3 style="color: #495057;">What's Next?</h3>
            <ul style="color: #6c757d;">
              <li>Click the login button above to access your account</li>
              <li>You'll be prompted to change your password on first login</li>
              <li>Explore the VibePOS dashboard and features</li>
              <li>Contact your administrator if you need any assistance</li>
            </ul>
            
            <p style="color: #6c757d; margin-top: 30px;">
              If you have any questions or need help getting started, don't hesitate to contact your system administrator.
            </p>
            
            <p style="color: #6c757d; margin-top: 30px; font-size: 14px;">
              Best regards,<br>
              The VibePOS Team
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error('Email sending failed:', emailResponse.error);
    } else {
      console.log('Welcome email sent successfully:', emailResponse.data?.id);
    }

    // Log the communication
    try {
      await supabaseAdmin
        .from('communication_logs')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          type: 'email',
          channel: 'email',
          recipient: email,
          subject: 'Welcome to VibePOS - Your Account Details',
          content: 'User account creation notification with login credentials',
          status: emailResponse.error ? 'failed' : 'sent',
          external_id: emailResponse.data?.id,
          error_message: emailResponse.error?.message
        });
    } catch (logError) {
      console.error('Failed to log communication:', logError);
      // Don't throw here, user was created successfully
    }

    console.log('User creation process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        profile_created: !!profileData,
        tenant_user_created: !!tenantUserData,
        email_sent: !emailResponse.error,
        message: 'User created successfully and welcome email sent'
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
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create user account',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);