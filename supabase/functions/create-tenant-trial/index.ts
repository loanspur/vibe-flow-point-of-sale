import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      fullName, 
      businessName, 
      email, 
      mobileNumber, 
      country, 
      currency,
      timezone,
      password 
    } = await req.json();

    // Validate required fields
    if (!fullName || !businessName || !email || !mobileNumber || !country || !password) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user account
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        full_name: fullName,
        business_name: businessName,
        phone: mobileNumber,
        country
      }
    });

    if (userError) {
      console.error('User creation error:', userError);
      
      // Return specific error messages for different auth errors
      let errorMessage = 'Failed to create tenant account';
      let errorCode = userError.code || 'AUTH_ERROR';
      
      if (userError.message?.includes('already been registered')) {
        errorMessage = 'An account with this email already exists. Please use a different email or sign in to your existing account.';
        errorCode = 'EMAIL_EXISTS';
      } else if (userError.message?.includes('Invalid email')) {
        errorMessage = 'Please provide a valid email address.';
        errorCode = 'INVALID_EMAIL';
      } else if (userError.message?.includes('Password')) {
        errorMessage = 'Password must be at least 6 characters long.';
        errorCode = 'WEAK_PASSWORD';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: errorCode,
          details: userError.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Enterprise billing plan
    const { data: enterprisePlan, error: planError } = await supabase
      .from('billing_plans')
      .select('id')
      .eq('name', 'Enterprise')
      .eq('is_active', true)
      .single();

    if (planError || !enterprisePlan) {
      console.error('Enterprise plan not found:', planError);
      return new Response(
        JSON.stringify({ error: 'Enterprise plan not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate subdomain before creating tenant
    const subdomainName = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create tenant with all required fields for tenant management compatibility
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName,
        subdomain: subdomainName,
        contact_email: email,
        contact_phone: mobileNumber,
        address: null,
        plan_type: 'enterprise',
        max_users: 50, // Enterprise default
        billing_plan_id: enterprisePlan.id,
        country: country,
        status: 'trial',
        is_active: true,
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        created_by: userData.user.id
      })
      .select()
      .single();

    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Failed to create tenant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create tenant user relationship
    const { error: tenantUserError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenant.id,
        user_id: userData.user.id,
        role: 'owner',
        is_active: true
      });

    if (tenantUserError) {
      console.error('Tenant user creation error:', tenantUserError);
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userData.user.id,
        full_name: fullName,
        tenant_id: tenant.id,
        role: 'admin'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Use the generated subdomain name with domain suffix
    const subdomain = subdomainName + '.vibenet.shop';

    // Create domain entry
    const { error: domainError } = await supabase
      .from('tenant_domains')
      .insert({
        tenant_id: tenant.id,
        domain_name: subdomain,
        domain_type: 'subdomain',
        status: 'verified',
        is_primary: true,
        is_active: true,
        verified_at: new Date().toISOString(),
        created_by: userData.user.id
      });

    if (domainError) {
      console.error('Domain creation error:', domainError);
    }

    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from('tenant_subscription_details')
      .insert({
        tenant_id: tenant.id,
        billing_plan_id: enterprisePlan.id,
        status: 'trialing',
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
    }

    // Enable all enterprise features for trial
    const enterpriseFeatures = [
      'basic_pos', 'product_management', 'customer_management', 'sales_reporting',
      'inventory_tracking', 'user_management', 'advanced_analytics', 'multi_location',
      'api_access', 'custom_reports', 'advanced_inventory', 'accounting_integration',
      'bulk_operations', 'advanced_permissions', 'custom_fields', 'webhook_integrations',
      'white_label', 'advanced_security', 'priority_support', 'custom_training'
    ];

    const featureAccess = enterpriseFeatures.map(feature => ({
      tenant_id: tenant.id,
      feature_name: feature,
      is_enabled: true,
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }));

    const { error: featuresError } = await supabase
      .from('tenant_feature_access')
      .insert(featureAccess);

    if (featuresError) {
      console.error('Features creation error:', featuresError);
    }

    // Send welcome email as background task (don't wait for it)
    const sendWelcomeEmail = async () => {
      try {
        console.log('Sending welcome email to:', email, 'for tenant:', businessName);
        
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            tenantName: businessName,
            contactEmail: email,
            tenantId: tenant.id,
            subdomainUrl: `https://${subdomain}`
          }
        });
        
        if (emailError) {
          console.error('Welcome email failed:', emailError);
        } else {
          console.log('Welcome email sent successfully:', emailData);
        }
      } catch (emailError) {
        console.error('Welcome email error:', emailError);
      }
    };

    // Start background email task - don't await it to avoid blocking account creation
    sendWelcomeEmail().catch(err => console.error('Background email task failed:', err));

    console.log('Tenant created successfully:', {
      tenantId: tenant.id,
      userId: userData.user.id,
      subdomain,
      businessName
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        tenant_id: tenant.id,
        subdomain,
        message: 'Tenant created successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});