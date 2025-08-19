import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, businessData, planType, isGoogleUser } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get highest billing plan
    const { data: plans } = await supabaseAdmin
      .from('billing_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: false })
      .limit(1);

    const highestPlan = plans?.[0];
    if (!highestPlan) throw new Error('No billing plan found');

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: businessData.businessName,
        subdomain: businessData.businessName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 30),
        status: 'trial',
        created_by: userId
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({
        tenant_id: tenant.id,
        role: 'admin',
        full_name: businessData.ownerName,
        auth_method: isGoogleUser ? 'google' : 'email',
        otp_required_always: isGoogleUser || false
      })
      .eq('user_id', userId);

    // Create subscription with 14-day trial
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    await supabaseAdmin
      .from('tenant_subscription_details')
      .insert({
        tenant_id: tenant.id,
        billing_plan_id: highestPlan.id,
        status: 'trial',
        trial_end_date: trialEndDate.toISOString(),
        created_by: userId
      });

    return new Response(JSON.stringify({ success: true, tenant_id: tenant.id }), {
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