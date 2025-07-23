import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DomainVerificationRequest {
  domainId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { domainId } = await req.json() as DomainVerificationRequest;

    if (!domainId) {
      return new Response(
        JSON.stringify({ error: 'Domain ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get domain details
    const { data: domain, error: domainError } = await supabase
      .from('tenant_domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (domainError || !domain) {
      return new Response(
        JSON.stringify({ error: 'Domain not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update status to verifying
    await supabase
      .from('tenant_domains')
      .update({ status: 'verifying' })
      .eq('id', domainId);

    let verificationResult = false;
    let errorMessage = '';
    let responseData: any = {};

    try {
      switch (domain.verification_method) {
        case 'dns_txt':
          verificationResult = await verifyDnsTxt(domain.domain_name, domain.verification_token);
          break;
        case 'dns_cname':
          verificationResult = await verifyDnsCname(domain.domain_name);
          break;
        case 'file_upload':
          verificationResult = await verifyFileUpload(domain.domain_name, domain.verification_token);
          break;
        default:
          throw new Error('Invalid verification method');
      }
    } catch (error: any) {
      errorMessage = error.message;
      responseData = { error: error.message };
    }

    // Log verification attempt
    await supabase
      .from('domain_verification_logs')
      .insert({
        domain_id: domainId,
        verification_type: domain.verification_method,
        status: verificationResult ? 'success' : 'failed',
        response_data: responseData,
        error_message: errorMessage || null
      });

    // Update domain status
    const newStatus = verificationResult ? 'verified' : 'failed';
    const updateData: any = { status: newStatus };
    
    if (verificationResult) {
      updateData.verified_at = new Date().toISOString();
      // Start SSL certificate process for verified domains
      if (domain.domain_type === 'custom_domain') {
        updateData.ssl_status = 'pending';
      }
    }

    await supabase
      .from('tenant_domains')
      .update(updateData)
      .eq('id', domainId);

    return new Response(
      JSON.stringify({ 
        success: verificationResult,
        message: verificationResult ? 'Domain verified successfully' : 'Domain verification failed',
        error: errorMessage || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in verify-domain function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function verifyDnsTxt(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://dns.google/resolve?name=_vibepos-verification.${domain}&type=TXT`);
    const data = await response.json();
    
    if (data.Answer) {
      for (const record of data.Answer) {
        if (record.type === 16) { // TXT record
          const txtData = record.data.replace(/"/g, ''); // Remove quotes
          if (txtData === expectedToken) {
            return true;
          }
        }
      }
    }
    return false;
  } catch (error) {
    console.error('DNS TXT verification error:', error);
    throw new Error('Failed to verify DNS TXT record');
  }
}

async function verifyDnsCname(domain: string): Promise<boolean> {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${domain}&type=CNAME`);
    const data = await response.json();
    
    if (data.Answer) {
      for (const record of data.Answer) {
        if (record.type === 5) { // CNAME record
          const cnameData = record.data.toLowerCase().replace(/\.$/, ''); // Remove trailing dot
          if (cnameData === 'vibepos.app') {
            return true;
          }
        }
      }
    }
    return false;
  } catch (error) {
    console.error('DNS CNAME verification error:', error);
    throw new Error('Failed to verify DNS CNAME record');
  }
}

async function verifyFileUpload(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://${domain}/.well-known/vibepos-verification.txt`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const content = await response.text();
    return content.trim() === expectedToken;
  } catch (error) {
    console.error('File upload verification error:', error);
    throw new Error('Failed to verify file upload');
  }
}