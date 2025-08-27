import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { Resend } from "npm:resend@4.0.0";

// Enhanced email handling with fallbacks
interface MailerResult {
  success: boolean;
  emailId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface InviteEmailParams {
  email: string;
  fullName: string;
  role: string;
  tenantName: string;
  verificationUrl: string;
  invitationBaseUrl: string;
  isReinvite?: boolean;
}

class ResendMailer {
  private resend: Resend;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = Deno.env.get('RESEND_FROM') || 'noreply@vibenet.shop';
    this.fromName = Deno.env.get('RESEND_FROM_NAME') || 'VibePOS Team';

    if (!this.fromEmail.includes('@')) {
      throw new Error('RESEND_FROM must be a valid email address');
    }
  }

  async sendInvite(params: InviteEmailParams): Promise<MailerResult> {
    const { email, fullName, role, tenantName, verificationUrl, invitationBaseUrl, isReinvite } = params;

    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
          details: { email }
        }
      };
    }

    const emailSubject = isReinvite 
      ? `You've been re-invited to join ${tenantName} on VibePOS` 
      : `You're invited to join ${tenantName} on VibePOS`;

    const htmlContent = this.generateInviteEmailHTML({
      fullName,
      role,
      tenantName,
      verificationUrl,
      invitationBaseUrl,
      isReinvite
    });

    const maxRetries = 3;
    const baseDelay = 200;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const emailResponse = await this.resend.emails.send({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [email],
          subject: emailSubject,
          html: htmlContent,
        });

        if (emailResponse.error) {
          const error = emailResponse.error as any;
          const isTransientError = this.isTransientError(error);
          
          if (isTransientError && attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`Resend attempt ${attempt} failed, retrying in ${delay}ms:`, error);
            await this.sleep(delay);
            continue;
          }

          return {
            success: false,
            error: {
              code: error.code || 'RESEND_ERROR',
              message: `Resend: ${error.statusCode || 'Unknown'} – ${error.message || 'Email sending failed'}`,
              details: error
            }
          };
        }

        return {
          success: true,
          emailId: emailResponse.data?.id
        };

      } catch (error: any) {
        const isTransientError = this.isTransientError(error);
        
        if (isTransientError && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`Resend attempt ${attempt} failed, retrying in ${delay}ms:`, error);
          await this.sleep(delay);
          continue;
        }

        return {
          success: false,
          error: {
            code: 'RESEND_EXCEPTION',
            message: `Resend exception: ${error.message || 'Unknown error'}`,
            details: error
          }
        };
      }
    }

    return {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: 'Maximum retry attempts exceeded',
        details: { maxRetries }
      }
    };
  }

  private generateInviteEmailHTML(params: {
    fullName: string;
    role: string;
    tenantName: string;
    verificationUrl: string;
    invitationBaseUrl: string;
    isReinvite?: boolean;
  }): string {
    const { fullName, role, tenantName, verificationUrl, invitationBaseUrl, isReinvite } = params;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">You're Invited to VibePOS!</h1>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin-top: 0;">Hello ${fullName},</h2>
          <p style="color: #475569; line-height: 1.6;">
            You've been invited to join <strong>${tenantName}</strong> on VibePOS as a <strong>${role}</strong>. 
            VibePOS is a powerful point-of-sale system that will help you manage business operations efficiently.
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1e293b;">What's Next?</h3>
          <ol style="color: #475569; line-height: 1.6;">
            <li>Click the button below to verify your email and set your password</li>
            <li>Confirm your new password on the secure page</li>
            <li>Start exploring your VibePOS dashboard</li>
            <li>Get familiar with the features available for your role</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Accept Invitation & Set Password
          </a>
        </div>

        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; color: #075985;">
            <strong>Set your password (tenant link):</strong><br>
            <a href="${verificationUrl}" style="color: #0369a1; word-break: break-all;">${invitationBaseUrl}/reset-password</a>
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
            <strong>Need help?</strong> Contact your system administrator at ${tenantName} or our support team for assistance.
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
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isTransientError(error: any): boolean {
    const statusCode = error.statusCode || error.status || error.code;
    const message = (error.message || '').toLowerCase();
    
    return statusCode === 429 || 
           (statusCode >= 500 && statusCode < 600) ||
           message.includes('rate limit') ||
           message.includes('timeout') ||
           message.includes('network');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class ConsoleMailer {
  async sendInvite(params: InviteEmailParams): Promise<MailerResult> {
    const { email, fullName, role, tenantName, verificationUrl, invitationBaseUrl, isReinvite } = params;

    const emailSubject = isReinvite 
      ? `You've been re-invited to join ${tenantName} on VibePOS` 
      : `You're invited to join ${tenantName} on VibePOS`;

    console.group('📧 CONSOLE MAILER - Invite Email');
    console.log('To:', email);
    console.log('Subject:', emailSubject);
    console.log('Verification URL:', verificationUrl);
    console.log('Invitation Base URL:', invitationBaseUrl);
    console.log('Is Reinvite:', isReinvite);
    console.groupEnd();

    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      success: true,
      emailId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }
}

function createMailer(): ResendMailer | ConsoleMailer {
  const emailDriver = Deno.env.get('EMAIL_DRIVER') || 'RESEND';
  
  try {
    if (emailDriver === 'RESEND') {
      return new ResendMailer();
    } else {
      console.warn(`Using console mailer (driver: ${emailDriver})`);
      return new ConsoleMailer() as any;
    }
  } catch (error) {
    console.error('Failed to create Resend mailer, falling back to console:', error);
    return new ConsoleMailer() as any;
  }
}

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
    console.log('=== SEND USER INVITATION START ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    
    const requestBody = await req.json();
    console.log('Request body received:', requestBody);
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
    console.log('Invitation request received for email:', requestBody.email);


    console.log('Processing invitation for:', email, 'to tenant:', tenantId);

    // Normalize role input to allowed values
    const roleInput = (role || '').toString().trim().toLowerCase();
    let normalizedRole: 'admin' | 'manager' | 'user' | 'cashier' = 'user';
    if (['admin','manager','user','cashier'].includes(roleInput)) {
      normalizedRole = roleInput as any;
    } else if (roleInput.includes('attend')) { // handle misspellings like "attendand"
      normalizedRole = 'cashier';
    } else if (roleInput.includes('staff') || roleInput.includes('employee') || roleInput.includes('sales')) {
      normalizedRole = 'cashier';
    }
    console.log('Normalized role:', roleInput, '->', normalizedRole);

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

    // Get tenant domains for the invitation link (may have multiple)
    const { data: tenantDomains } = await supabaseAdmin
      .from('tenant_domains')
      .select('domain_name, domain_type, is_primary, status, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('status', 'verified')
      .order('is_primary', { ascending: false });

    // Determine the invitation URL
    let invitationBaseUrl: string;
    let chosenDomainName: string | null = null;
    if (tenantDomains && tenantDomains.length > 0) {
      // Prefer: primary custom domain > primary .vibenet.online > any .vibenet.online > primary anything > first
      const chosen =
        tenantDomains.find((d: any) => d.domain_type === 'custom_domain' && d.is_primary) ||
        tenantDomains.find((d: any) => (d.domain_name || '').endsWith('.vibenet.online') && d.is_primary) ||
        tenantDomains.find((d: any) => (d.domain_name || '').endsWith('.vibenet.online')) ||
        tenantDomains.find((d: any) => d.is_primary) ||
        tenantDomains[0];

      chosenDomainName = chosen.domain_name;
      invitationBaseUrl = `https://${chosen.domain_name}`;
      console.log('Using tenant domain:', chosen.domain_name);
    } else {
      // Fallback to subdomain - prefer .vibenet.online by default
      const subdomain = tenant.subdomain || `tenant-${tenantId}`;
      invitationBaseUrl = `https://${subdomain}.vibenet.online`;
      console.log('Using fallback subdomain:', subdomain);
    }

    // Align TLD with the environment origin (.online vs .shop)
    const origin = req.headers.get('origin') || '';
    try {
      if (origin.includes('.vibenet.online') && invitationBaseUrl.includes('.vibenet.shop')) {
        invitationBaseUrl = invitationBaseUrl.replace('.vibenet.shop', '.vibenet.online');
        console.log('Adjusted invitation base URL for .online env:', invitationBaseUrl);
      } else if (origin.includes('.vibenet.shop') && invitationBaseUrl.includes('.vibenet.online')) {
        invitationBaseUrl = invitationBaseUrl.replace('.vibenet.online', '.vibenet.shop');
        console.log('Adjusted invitation base URL for .shop env:', invitationBaseUrl);
      }
    } catch (e) {
      console.warn('Failed to adjust TLD based on origin:', e);
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
          role: normalizedRole
        },
        email_confirm: false // User must verify email through invitation link
      });

      if (createError) {
        const msg = createError.message || '';
        const code = (createError.code || '').toString();
        const status = (createError.status || (createError as any).statusCode || null);
        // Treat known "already exists" cases as existing-user flow
        if (
          msg.toLowerCase().includes('already registered') ||
          msg.toLowerCase().includes('already exists') ||
          code === '422' ||
          code === 'email_exists' ||
          status === 422
        ) {
          console.log('User already exists, proceeding with existing user...');

          // Find existing user by listing users (getUserByEmail removed in supabase-js v2)
          const findUserByEmail = async (emailToFind: string) => {
            let page = 1;
            const perPage = 100;
            while (page <= 20) { // safety cap of 2000 users scanned
              const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
              if (listErr) {
                console.error('Error listing users:', listErr);
                throw new Error(`Failed to list users: ${listErr.message}`);
              }
              const users = listData?.users || [];
              const match = users.find((u: any) => (u.email || '').toLowerCase() === emailToFind.toLowerCase());
              if (match) return match;
              if (users.length < perPage) break; // no more pages
              page++;
            }
            return null;
          };

          const existing = await findUserByEmail(email);
          if (!existing) {
            throw new Error('User creation failed and existing user not found by email');
          }

          userId = existing.id;
          isNewUser = false;
          userStatus = 'reinvited';
          console.log('Found existing user:', userId);
        } else {
          console.error('Error creating user in auth:', createError);
          throw new Error(`Failed to create user: ${msg}`);
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
          role: normalizedRole,
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
          role: normalizedRole,
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
    const tenantRole = normalizedRole === 'admin' ? 'admin' : 
                      normalizedRole === 'manager' ? 'manager' : 
                      normalizedRole === 'cashier' ? 'user' : 'user';

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

    // Generate email verification link with two-step redirect approach
    const linkType = isNewUser ? 'invite' : 'recovery';
    console.log('Generating auth link with type:', linkType);
    
    // Determine the main domain based on environment
    const mainDomain = origin.includes('.vibenet.shop') ? 'vibenet.shop' : 'vibenet.online';
    const targetTenantDomain = chosenDomainName || `${tenant.subdomain}.${mainDomain}`;
    
    console.log('Using main domain for auth redirect:', mainDomain);
    console.log('Target tenant domain:', targetTenantDomain);
    
    const { data: emailLinkData, error: emailLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: linkType as 'invite' | 'recovery',
      email: email,
      options: {
        // Use main domain first, then redirect to tenant domain via tenant-redirect handler
        redirectTo: `https://${mainDomain}/auth/tenant-redirect?tenant_domain=${encodeURIComponent(targetTenantDomain)}&redirect_to=${encodeURIComponent('/reset-password')}&from=invite&email=${encodeURIComponent(email)}&tenant_id=${encodeURIComponent(tenantId)}`
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

    // Send invitation email with enhanced error handling
    console.log('Sending invitation email...');
    
    const mailer = createMailer();
    const emailResult = await mailer.sendInvite({
      email,
      fullName,
      role: normalizedRole,
      tenantName: tenant.name,
      verificationUrl,
      invitationBaseUrl,
      isReinvite: userStatus === 'reinvited'
    });

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      throw new Error(`Email sending failed: ${emailResult.error?.message || 'Unknown error'}`);
    }

    console.log('Email sent successfully with ID:', emailResult.emailId);

    // Log communication
    try {
      await supabaseAdmin
        .from('communication_logs')
        .insert({
          type: 'user_invitation',
          channel: 'email',
          recipient: email,
          subject: userStatus === 'reinvited' 
            ? `You've been re-invited to join ${tenant.name} on VibePOS` 
            : `You're invited to join ${tenant.name} on VibePOS`,
          content: 'Email content logged separately for security',
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
            email_id: emailResult.emailId,
            driver: Deno.env.get('EMAIL_DRIVER') || 'RESEND'
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
        invitation_sent: emailResult.success,
        email_id: emailResult.emailId,
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
    console.error("=== ERROR IN SEND-USER-INVITATION ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error code:", error.code);
    console.error("Full error object:", error);
    console.error("=====================================");
    
    let errorMessage = error.message || 'Failed to send user invitation';
    let statusCode = 500;
    
    // Handle specific error types
    if (error.message?.includes('Missing required fields')) {
      statusCode = 400; // Bad Request
    } else if (error.message?.includes('Invalid tenant ID')) {
      statusCode = 400; // Bad Request
    } else if (
      /already\s*(been\s*)?registered|already\s*exists/i.test(error.message || '') ||
      (error.code && (error.code === 'email_exists' || error.code === '422'))
    ) {
      statusCode = 409; // Conflict
    }
    
    console.error("Returning error response with status:", statusCode);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.toString(),
        code: error.code || 'INVITATION_ERROR',
        status: error.status || error.statusCode || 500
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