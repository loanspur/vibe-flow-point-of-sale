import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteUserRequest {
  email: string;
  fullName: string;
  role: string;
  tenantId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting user invitation process...');
    const requestBody = await req.json();
    console.log('Invitation request received for email:', requestBody.email);

    const {
      email,
      fullName,
      role,
      tenantId
    }: InviteUserRequest = requestBody;

    // Validate required fields
    if (!email || !fullName || !role || !tenantId) {
      throw new Error('Missing required fields: email, fullName, role, tenantId');
    }

    console.log('Processing invitation for:', email, 'to tenant:', tenantId);

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

    console.log('Supabase admin client initialized');

    // Get tenant information for email context
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, subdomain')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Invalid tenant ID: ${tenantId}`);
    }

    console.log('Tenant found:', tenant.name);

    // Get tenant's primary domain for the invitation link
    const { data: tenantDomain } = await supabaseAdmin
      .from('tenant_domains')
      .select('domain_name, domain_type, is_primary')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('status', 'verified')
      .order('is_primary', { ascending: false })
      .limit(1)
      .single();

    // Determine the invitation URL
    let invitationBaseUrl: string;
    if (tenantDomain) {
      invitationBaseUrl = `https://${tenantDomain.domain_name}`;
      console.log('Using tenant domain:', tenantDomain.domain_name);
    } else {
      // Fallback to subdomain
      const subdomain = tenant.subdomain || `tenant-${tenantId}`;
      invitationBaseUrl = `https://${subdomain}.vibenet.shop`;
      console.log('Using fallback subdomain:', subdomain);
    }


    // More efficient approach: try to create user first, handle existing user case
    console.log('Attempting to create user...');
    
    let userId: string;
    let isNewUser = true;
    let userStatus = 'invited';
    
    try {
      // Try to create user account first (more efficient than listing all users)
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        user_metadata: {
          full_name: fullName,
          tenant_id: tenantId,
          role: role
        },
        email_confirm: false // User must verify email through invitation link
      });

      if (createError) {
        // Check if error is due to user already existing
        if (createError.message?.includes('already registered') || 
            createError.message?.includes('already exists') ||
            createError.code === '422') {
          console.log('User already exists, proceeding with existing user...');
          
          // Get existing user - use a more targeted approach
          const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 100
          });
          
          if (listError) {
            throw new Error(`Failed to check existing users: ${listError.message}`);
          }
          
          const existingUser = users?.users?.find(user => user.email === email);
          if (!existingUser) {
            throw new Error('User creation failed and could not find existing user');
          }
          
          userId = existingUser.id;
          isNewUser = false;
          userStatus = 'reinvited';
          console.log('Found existing user:', userId);
        } else {
          console.error('Error creating user in auth:', createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }
      } else {
        if (!authData?.user) {
          throw new Error('User creation failed - no user data returned');
        }
        userId = authData.user.id;
        console.log('User created successfully in auth:', userId);
      }
    } catch (error: any) {
      console.error('Critical error in user creation process:', error);
      throw new Error(`User creation process failed: ${error.message}`);
    }

    // Handle profile creation/update
    let profileData;
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
        
    if (existingProfile) {
      console.log('Updating existing profile...');
      const { data, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name: fullName,
          role: role as 'admin' | 'manager' | 'user' | 'cashier',
          tenant_id: tenantId,
          email_verified: false,
          invitation_status: 'invited',
          invited_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
        
      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }
      profileData = data;
    } else {
      console.log('Creating new profile...');
      const { data, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: userId,
          full_name: fullName,
          role: role as 'admin' | 'manager' | 'user' | 'cashier',
          tenant_id: tenantId,
          email_verified: false,
          invitation_status: 'invited',
          invited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Cleanup auth user if profile creation fails
        if (isNewUser) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
          } catch (cleanupError) {
            console.error('Failed to cleanup auth user:', cleanupError);
          }
        }
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }
      profileData = data;
    }

    console.log('Profile handled successfully:', profileData);

    // Handle tenant_users relationship
    const tenantRole = role === 'admin' ? 'admin' : 
                      role === 'manager' ? 'manager' : 
                      role === 'cashier' ? 'user' : 'user';

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
          is_active: false, // Will be activated when user accepts invitation
          invitation_status: 'invited',
          invited_at: new Date().toISOString()
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
    } else {
      console.log('Creating new tenant user relationship...');
      const { data, error: tenantUserError } = await supabaseAdmin
        .from('tenant_users')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          role: tenantRole,
          is_active: false, // Will be activated when user accepts invitation
          invitation_status: 'invited',
          invited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (tenantUserError) {
        console.error('Error creating tenant user:', tenantUserError);
        // Cleanup on failure
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

    console.log('Tenant user relationship handled successfully:', tenantUserData);

    // Generate email verification link
    const { data: emailLinkData, error: emailLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${invitationBaseUrl}/auth?invitation=true`
      }
    });

    if (emailLinkError) {
      console.error('Error generating email verification link:', emailLinkError);
      throw new Error(`Failed to generate verification link: ${emailLinkError.message}`);
    }

    const verificationUrl = emailLinkData.properties?.action_link;
    if (!verificationUrl) {
      throw new Error('Failed to generate verification link');
    }

    console.log('Email verification link generated successfully');

    // Send invitation email
    console.log('Sending invitation email...');
    
    const emailSubject = userStatus === 'reinvited' 
      ? `You've been re-invited to join ${tenant.name} on VibePOS` 
      : `You're invited to join ${tenant.name} on VibePOS`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">You're Invited to VibePOS!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin-top: 0;">Hello ${fullName},</h2>
          <p style="color: #475569; line-height: 1.6;">
            You've been invited to join <strong>${tenant.name}</strong> on VibePOS as a <strong>${role}</strong>. 
            VibePOS is a powerful point-of-sale system that will help you manage business operations efficiently.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b;">What's Next?</h3>
          <ol style="color: #475569; line-height: 1.6;">
            <li>Click the invitation link below to verify your email</li>
            <li>Set up your secure password</li>
            <li>Start exploring your VibePOS dashboard</li>
            <li>Get familiar with the features available for your role</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Accept Invitation & Verify Email
          </a>
        </div>

        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #075985;">
            <strong>Your VibePOS Dashboard:</strong><br>
            <a href="${invitationBaseUrl}" style="color: #0369a1; word-break: break-all;">${invitationBaseUrl}</a>
          </p>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #92400e;">
            <strong>⚠️ Security Note:</strong> This invitation link is secure and can only be used once. 
            It will expire in 24 hours for your security.
          </p>
        </div>

        <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #1e40af;">
            <strong>Need help?</strong> Contact your system administrator at ${tenant.name} or our support team for assistance.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; margin: 0;">
            Best regards,<br>
            The VibePOS Team
          </p>
        </div>
      </div>
    `;

    // Initialize Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const emailResponse = await resend.emails.send({
      from: 'VibePOS Team <noreply@vibenet.shop>',
      to: [email],
      subject: emailSubject,
      html: htmlContent,
    });

    console.log('Resend response:', emailResponse);

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message || emailResponse.error}`);
    }

    // Log communication
    try {
      await supabaseAdmin
        .from('communication_logs')
        .insert({
          type: 'user_invitation',
          channel: 'email',
          recipient: email,
          subject: emailSubject,
          content: htmlContent,
          status: 'sent',
          user_id: userId,
          tenant_id: tenantId,
          sent_at: new Date().toISOString(),
          metadata: {
            invitation: true,
            user_status: userStatus,
            tenant_name: tenant.name,
            verification_url: verificationUrl,
            invitation_url: invitationBaseUrl,
            resend_id: emailResponse.data?.id
          }
        });
    } catch (logError) {
      console.error('Failed to log communication (non-fatal):', logError);
    }

    console.log('User invitation process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        status: userStatus,
        invitation_sent: !emailResponse.error,
        invitation_url: invitationBaseUrl,
        tenant_name: tenant.name,
        message: userStatus === 'reinvited' 
          ? 'User re-invited successfully with email verification link'
          : 'User invited successfully with email verification link'
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
    console.error("Error in send-user-invitation function:", error);
    
    let errorMessage = error.message || 'Failed to send user invitation';
    let statusCode = 500;
    
    // Handle specific error types
    if (error.message?.includes('Missing required fields')) {
      statusCode = 400; // Bad Request
    } else if (error.message?.includes('Invalid tenant ID')) {
      statusCode = 400; // Bad Request
    } else if (error.message?.includes('User with this email already exists')) {
      statusCode = 409; // Conflict
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.toString(),
        code: error.code || 'INVITATION_ERROR'
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