import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE TENANT TRIAL STARTED ===');
    const { userId, businessData, planType, isGoogleUser } = await req.json();
    console.log('Request data:', { userId, businessData: JSON.stringify(businessData), planType, isGoogleUser });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get highest billing plan
    console.log('Fetching highest billing plan...');
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: false })
      .limit(1);

    console.log('Plans query result:', { plans, plansError });
    
    if (plansError) {
      console.error('Error fetching billing plans:', plansError);
      throw new Error(`Failed to fetch billing plans: ${plansError.message}`);
    }
    
    const highestPlan = plans?.[0];
    if (!highestPlan) {
      console.error('No active billing plan found');
      throw new Error('No active billing plan found');
    }
    
    console.log('Using highest plan:', { id: highestPlan.id, name: highestPlan.name, price: highestPlan.price });

    // Create tenant
    console.log('Creating tenant...');
    const tenantData = {
      name: businessData.businessName,
      subdomain: businessData.businessName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 30),
      status: 'trial',
      billing_plan_id: highestPlan.id,
      created_by: userId
    };
    console.log('Tenant data to insert:', tenantData);
    
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert(tenantData)
      .select()
      .single();

    console.log('Tenant creation result:', { tenant, tenantError });
    if (tenantError) {
      console.error('Tenant creation error:', tenantError);
      throw new Error(`Failed to create tenant: ${tenantError.message}`);
    }

    console.log('Tenant created successfully:', tenant);

    // Update profile
    console.log('Updating user profile...');
    const profileData = {
      tenant_id: tenant.id,
      role: 'admin',
      full_name: businessData.ownerName,
      auth_method: isGoogleUser ? 'google' : 'email',
      otp_required_always: isGoogleUser || false
    };
    console.log('Profile data to update:', profileData);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }
    
    console.log('Profile updated successfully');

    // Create subscription with 14-day trial
    console.log('Creating trial subscription...');
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const subscriptionData = {
      tenant_id: tenant.id,
      billing_plan_id: highestPlan.id,
      status: 'trial',
      trial_end_date: trialEndDate.toISOString(),
      created_by: userId
    };
    console.log('Subscription data to insert:', subscriptionData);

    const { error: subscriptionError } = await supabaseAdmin
      .from('tenant_subscription_details')
      .insert(subscriptionData);

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
    }
    
    console.log('Subscription created successfully');

    // Generate temporary password for new user
    console.log('Generating temporary password...');
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    
    // Update user with temporary password and require password change
    console.log('Setting temporary password and password change requirement...');
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword
    });

    if (passwordError) {
      console.error('Password update error:', passwordError);
      // Don't fail the whole process, just log the error
    }

    // Update profile to require password change
    const { error: passwordFlagError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        require_password_change: true,
        temp_password_created_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (passwordFlagError) {
      console.error('Password flag update error:', passwordFlagError);
      // Don't fail the whole process, just log the error
    }

    // Send welcome email with credentials
    console.log('Sending welcome email with credentials...');
    try {
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-welcome-email', {
        body: {
          tenantName: businessData.businessName,
          contactEmail: businessData.businessEmail || businessData.ownerEmail || businessData.email,
          tenantId: tenant.id,
          ownerName: businessData.ownerName,
          tempPassword: tempPassword,
          subdomain: tenant.subdomain,
          planName: highestPlan.name
        }
      });

      if (emailError) {
        console.error('Welcome email error:', emailError);
        // Don't fail the whole process, just log the error
      } else {
        console.log('Welcome email sent successfully');
      }
    } catch (emailErr) {
      console.error('Welcome email function error:', emailErr);
      // Don't fail the whole process, just log the error
    }

    console.log('=== CREATE TENANT TRIAL COMPLETED ===');

    return new Response(JSON.stringify({ 
      success: true, 
      tenant_id: tenant.id, 
      subdomain: tenant.subdomain,
      message: 'Account created successfully. Check your email for login credentials.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);