import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface CreateTenantParams {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  subdomain: string;
  userId: string;
  planType?: string;
  maxUsers?: number;
  isAdminCreated?: boolean;
}

interface TenantCreationResult {
  success: boolean;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
  };
  error?: string;
}

export async function createTenantWithUser(params: CreateTenantParams): Promise<TenantCreationResult> {
  const {
    businessName,
    ownerName,
    ownerEmail,
    subdomain,
    userId,
    planType = 'trial',
    maxUsers = 10,
    isAdminCreated = false
  } = params;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Get billing plan ID - for trial accounts, always use Enterprise plan
    const targetPlanName = !isAdminCreated ? 'Enterprise' : planType;
    const { data: billingPlan } = await supabaseAdmin
      .from('billing_plans')
      .select('id')
      .ilike('name', `%${targetPlanName}%`)
      .eq('is_active', true)
      .single();

    if (!billingPlan) {
      throw new Error(`Invalid plan type: ${targetPlanName}`);
    }

    // Create tenant record (database trigger will handle default setup)
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: businessName,
        subdomain: subdomain,
        contact_email: ownerEmail,
        billing_plan_id: billingPlan.id,
        plan_type: planType,
        max_users: maxUsers,
        is_active: true,
        status: isAdminCreated ? 'active' : 'trial'
      })
      .select()
      .single();

    if (tenantError || !tenantData) {
      throw new Error(`Failed to create tenant: ${tenantError?.message}`);
    }

    // Update user profile with tenant_id and admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        full_name: ownerName,
        role: 'admin',
        tenant_id: tenantData.id
      });

    if (profileError) {
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    // Create tenant_users association
    const { error: tenantUserError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: tenantData.id,
        user_id: userId,
        role: 'admin',
        is_active: true,
      });

    if (tenantUserError) {
      throw new Error(`Failed to create tenant user association: ${tenantUserError.message}`);
    }

    // The handle_new_tenant() trigger automatically sets up:
    // - Default chart of accounts
    // - Default features  
    // - Default user roles
    // - Default business settings

    return {
      success: true,
      tenant: {
        id: tenantData.id,
        name: tenantData.name,
        subdomain: tenantData.subdomain,
      }
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to generate unique subdomain
export async function generateUniqueSubdomain(baseName: string): Promise<string> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const baseSubdomain = baseName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
  let subdomain = baseSubdomain;
  let counter = 1;

  while (true) {
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (!existingTenant) break;
    
    subdomain = `${baseSubdomain}${counter}`;
    counter++;
  }

  return subdomain;
}