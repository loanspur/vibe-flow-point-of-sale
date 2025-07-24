import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantRequest {
  businessName: string;
  ownerName: string;
  email?: string;
  phone?: string;
  address?: string;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[CREATE-TENANT] ${timestamp} - ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const sendWelcomeEmail = async (supabaseAdmin: any, tenant: any, ownerName: string, email: string) => {
  const welcomeEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to VibePOS</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .feature-item { margin: 10px 0; padding: 10px; border-left: 4px solid #667eea; background: #f8f9ff; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🎉 Welcome to VibePOS!</h1>
            <p>Your business account has been successfully created</p>
        </div>
        <div class="content">
            <h2>Hello {{ownerName}}!</h2>
            <p>Congratulations! Your VibePOS account for <strong>{{businessName}}</strong> is now ready.</p>
            
            <div class="features">
                <h3>🚀 What's Next?</h3>
                <div class="feature-item">
                    <strong>📊 Complete Your Setup:</strong> Add products, set up categories, and configure your business settings
                </div>
                <div class="feature-item">
                    <strong>💰 Start Selling:</strong> Use our intuitive POS system to process sales and manage customers
                </div>
                <div class="feature-item">
                    <strong>📈 Track Performance:</strong> Monitor your business with real-time reports and analytics
                </div>
                <div class="feature-item">
                    <strong>🔧 Customize:</strong> Set up payment methods, tax rates, and business preferences
                </div>
            </div>

            <p style="text-align: center;">
                <a href="https://688144f7-8c84-4c49-852f-f9a8fcd9dad6.lovableproject.com/" class="button">Access Your Dashboard</a>
            </p>

            <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>🎁 14-Day Free Trial</strong></p>
                <p>You're on a 14-day free trial with full access to all features. No credit card required!</p>
            </div>

            <h3>📞 Need Help?</h3>
            <p>Our support team is here to help you succeed:</p>
            <ul>
                <li>📧 Email: support@vibepos.com</li>
                <li>📖 Documentation: Available in your dashboard</li>
                <li>💬 Live Chat: Coming soon</li>
            </ul>

            <p>Thank you for choosing VibePOS. We're excited to help grow your business!</p>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Best regards,<br>
                The VibePOS Team
            </p>
        </div>
    </body>
    </html>
  `;

  // Call the send-enhanced-email function
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-enhanced-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      tenantId: tenant.id,
      to: email,
      toName: ownerName,
      subject: `Welcome to VibePOS - Your ${tenant.name} account is ready!`,
      htmlContent: welcomeEmailHtml,
      variables: {
        ownerName: ownerName,
        businessName: tenant.name,
        subdomain: tenant.subdomain,
        company_name: 'VibePOS'
      },
      priority: 'high'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send welcome email: ${errorText}`);
  }

  return await response.json();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error(`Authentication failed: ${userError?.message}`);
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { businessName, ownerName, email, phone, address }: CreateTenantRequest = await req.json();
    
    if (!businessName || !ownerName) {
      throw new Error("Business name and owner name are required");
    }

    logStep("Creating tenant", { businessName, ownerName });

    // Generate subdomain from business name
    const subdomain = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);

    // Check if subdomain is already taken
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    let finalSubdomain = subdomain;
    if (existingTenant) {
      // Add random suffix if subdomain exists
      const suffix = Math.random().toString(36).substring(2, 8);
      finalSubdomain = `${subdomain}-${suffix}`;
    }

    // Create tenant record
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: businessName,
        subdomain: finalSubdomain,
        contact_email: email || user.email,
        is_active: true,
        plan_type: 'trial',
        max_users: 5,
      })
      .select()
      .single();

    if (tenantError) {
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    logStep("Tenant created", { tenantId: tenant.id, subdomain: finalSubdomain });

    // Update user profile with tenant_id and admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        tenant_id: tenant.id,
        full_name: ownerName,
        role: 'admin' // Set as tenant admin
      })
      .eq('user_id', user.id);

    if (profileError) {
      logStep("Warning: Failed to update profile", { error: profileError.message });
    } else {
      logStep("Profile updated with admin role");
    }

    // Create tenant_users association with admin role
    const { error: tenantUserError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'admin', // Set as tenant admin, not just owner
        is_active: true,
      });

    if (tenantUserError) {
      throw new Error(`Failed to create tenant user association: ${tenantUserError.message}`);
    }

    logStep("User associated with tenant as admin");

    // Create business settings
    const { error: settingsError } = await supabaseAdmin
      .from('business_settings')
      .insert({
        tenant_id: tenant.id,
        company_name: businessName,
        email: email || user.email,
        phone: phone,
        address_line_1: address,
        currency_code: 'KES',
        currency_symbol: 'KSh',
        country: 'Kenya',
        timezone: 'Africa/Nairobi',
        tax_name: 'VAT',
        default_tax_rate: 16.0000,
      });

    if (settingsError) {
      logStep("Warning: Failed to create business settings", { error: settingsError.message });
    } else {
      logStep("Business settings created");
    }

    // Set up default chart of accounts
    try {
      const { error: accountsError } = await supabaseAdmin.rpc('setup_default_accounts', {
        tenant_id_param: tenant.id
      });

      if (accountsError) {
        logStep("Warning: Failed to setup default accounts", { error: accountsError.message });
      } else {
        logStep("Default accounts created");
      }
    } catch (accountsErr) {
      logStep("Warning: Error setting up accounts", { error: accountsErr });
    }

    // Create a contact record for the owner
    const { error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        name: ownerName,
        email: email || user.email,
        phone: phone,
        address: address,
        type: 'customer',
        is_active: true,
      });

    if (contactError) {
      logStep("Warning: Failed to create owner contact", { error: contactError.message });
    } else {
      logStep("Owner contact created");
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(supabaseAdmin, tenant, ownerName, email || user.email);
      logStep("Welcome email sent successfully");
    } catch (emailError) {
      logStep("Warning: Failed to send welcome email", { error: emailError });
    }

    logStep("Tenant setup completed successfully", { 
      tenantId: tenant.id, 
      subdomain: finalSubdomain,
      businessName 
    });

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          contact_email: tenant.contact_email,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});