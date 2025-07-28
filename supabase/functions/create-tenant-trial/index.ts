import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      return new Response(
        JSON.stringify({ error: userError.message }),
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

    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: businessName,
        status: 'trial',
        is_active: true,
        billing_plan_id: enterprisePlan.id,
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
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

    // Generate subdomain
    const subdomain = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '.vibepos.shop';

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