import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";
import { createTenantWithUser, generateUniqueSubdomain } from "../shared-tenant-creation/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
};

interface CreateTenantRequest {
  businessName: string;
  ownerName: string;
  email: string;
  password?: string;
  planType?: string;
  maxUsers?: number;
  isAdminCreated?: boolean;
}

serve(async (req) => {
  console.log("Create tenant function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let createdUserId: string | null = null;

  try {
    const {
      businessName,
      ownerName,
      email,
      password,
      planType = 'basic',
      maxUsers = 10,
      isAdminCreated = false
    }: CreateTenantRequest = await req.json();

    console.log("Creating tenant for:", businessName, "with owner:", ownerName);

    // Validate required fields
    if (!businessName || !ownerName || !email) {
      throw new Error('Missing required fields: businessName, ownerName, and email are required');
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(user => user.email === email);

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Generate unique subdomain using shared function
    const subdomain = await generateUniqueSubdomain(businessName);

    // STEP 1: Create user account first (but don't create any other records yet)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password || crypto.randomUUID(),
      email_confirm: true,
      user_metadata: {
        full_name: ownerName
      }
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create user: ${userError?.message}`);
    }

    createdUserId = userData.user.id;
    console.log("User created successfully:", createdUserId);

    // STEP 2: Send welcome email if this is a trial signup (test email sending before DB commits)
    if (!isAdminCreated) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (!resendApiKey) {
        throw new Error('Email service not configured');
      }

      const resend = new Resend(resendApiKey);
      
      try {
        const { error: emailError } = await resend.emails.send({
          from: 'VibePOS <noreply@vibepos.shop>',
          to: [email],
          subject: `Welcome to VibePOS, ${ownerName}!`,
          html: `
            <h1>Welcome to VibePOS!</h1>
            <p>Hi ${ownerName},</p>
            <p>Your account has been successfully created for <strong>${businessName}</strong>.</p>
            <p>You can access your dashboard at: <a href="https://${subdomain}.vibepos.shop">https://${subdomain}.vibepos.shop</a></p>
            <p>Best regards,<br>The VibePOS Team</p>
          `,
        });

        if (emailError) {
          throw new Error(`Failed to send welcome email: ${emailError.message}`);
        }

        console.log("Welcome email sent successfully");
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        // Clean up created user if email fails
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
        throw new Error(`Failed to send welcome email: ${emailError}`);
      }
    }

    // Use shared tenant creation function
    const tenantResult = await createTenantWithUser({
      businessName,
      ownerName,
      ownerEmail: email,
      subdomain,
      userId: createdUserId,
      planType,
      maxUsers,
      isAdminCreated
    });

    if (!tenantResult.success || !tenantResult.tenant) {
      // Clean up created user if tenant creation fails
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      throw new Error(tenantResult.error || "Failed to create tenant");
    }

    console.log("Tenant creation process completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenantResult.tenant.id,
          name: tenantResult.tenant.name,
          subdomain: tenantResult.tenant.subdomain,
          url: `https://${tenantResult.tenant.subdomain}.vibepos.shop`
        },
        user: {
          id: createdUserId,
          email: email,
          name: ownerName
        },
        message: isAdminCreated 
          ? "Tenant and admin user created successfully" 
          : "Account created successfully! Check your email for welcome information."
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Create tenant error:", error);

    // Comprehensive cleanup on any error
    try {
      if (createdUserId) {
        console.log("Cleaning up created user:", createdUserId);
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      }
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to create tenant"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});