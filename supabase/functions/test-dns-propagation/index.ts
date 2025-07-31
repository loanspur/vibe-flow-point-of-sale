import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { subdomain } = requestBody;
    
    if (!subdomain) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Subdomain parameter is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Testing DNS propagation for: ${subdomain}`)

    // Test DNS resolution
    const dnsResults = {
      subdomain,
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    }

    // Test 1: Basic DNS lookup
    try {
      const response = await fetch(`https://dns.google/resolve?name=${subdomain}&type=A`)
      const dnsData = await response.json()
      
      dnsResults.tests.push({
        test: 'Google DNS Lookup',
        status: dnsData.Status === 0 ? 'success' : 'failed',
        records: dnsData.Answer || [],
        error: dnsData.Status !== 0 ? `DNS Status: ${dnsData.Status}` : null
      })
    } catch (error) {
      dnsResults.tests.push({
        test: 'Google DNS Lookup',
        status: 'error',
        error: error.message
      })
    }

    // Test 2: HTTPS connectivity
    try {
      const httpsResponse = await fetch(`https://${subdomain}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      })
      
      dnsResults.tests.push({
        test: 'HTTPS Connectivity',
        status: 'success',
        statusCode: httpsResponse.status,
        headers: {
          'content-type': httpsResponse.headers.get('content-type'),
          'server': httpsResponse.headers.get('server')
        }
      })
    } catch (error) {
      dnsResults.tests.push({
        test: 'HTTPS Connectivity',
        status: 'failed',
        error: error.message
      })
    }

    // Test 3: SSL Certificate validation
    try {
      const sslTestResponse = await fetch(`https://api.ssllabs.com/api/v3/analyze?host=${subdomain}`)
      if (sslTestResponse.ok) {
        const sslData = await sslTestResponse.json()
        dnsResults.tests.push({
          test: 'SSL Certificate',
          status: sslData.status === 'READY' ? 'success' : 'pending',
          grade: sslData.endpoints?.[0]?.grade || 'unknown',
          details: sslData
        })
      }
    } catch (error) {
      dnsResults.tests.push({
        test: 'SSL Certificate',
        status: 'skipped',
        error: 'SSL Labs API unavailable'
      })
    }

    // Test 4: Database verification
    try {
      const { data: domainData, error: dbError } = await supabaseClient
        .from('tenant_domains')
        .select('*')
        .eq('domain_name', subdomain)
        .single()

      if (dbError) throw dbError

      dnsResults.tests.push({
        test: 'Database Configuration',
        status: 'success',
        domain_status: domainData.status,
        ssl_status: domainData.ssl_status,
        is_active: domainData.is_active,
        verified_at: domainData.verified_at
      })
    } catch (error) {
      dnsResults.tests.push({
        test: 'Database Configuration',
        status: 'failed',
        error: error.message
      })
    }

    // Summary
    const successfulTests = dnsResults.tests.filter(test => test.status === 'success').length
    const totalTests = dnsResults.tests.length
    
    const summary = {
      subdomain,
      propagated: successfulTests >= 2, // At least DNS and database should work
      propagation_score: `${successfulTests}/${totalTests}`,
      recommendations: []
    }

    if (successfulTests < 2) {
      summary.recommendations.push('DNS propagation may still be in progress')
      summary.recommendations.push('Try again in 5-10 minutes')
    }

    if (!dnsResults.tests.find(t => t.test === 'HTTPS Connectivity' && t.status === 'success')) {
      summary.recommendations.push('Check wildcard SSL certificate configuration')
    }

    console.log(`✅ DNS propagation test completed for ${subdomain}`)
    console.log(`📊 Results: ${summary.propagation_score} tests passed`)

    return new Response(
      JSON.stringify({
        success: true,
        results: dnsResults,
        summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ DNS propagation test failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})