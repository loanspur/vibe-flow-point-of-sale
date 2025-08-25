import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { dryRun = false, tenant_id = null } = await req.json().catch(() => ({ dryRun: false, tenant_id: null }))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Optional: limit to specific tenant for manual runs
    const params = tenant_id ? { tenant_arg: tenant_id } : {}

    // Idempotent server-side generation via RPC (create if exists)
    // Expect the RPC to handle idempotency per subscription period and return summary
    const { data, error } = await supabase
      .rpc('generate_recurring_invoices_safe' as any, params)

    if (error) {
      console.error('Recurring invoice RPC error:', error)
      return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, result: data || { created: 0, skipped: 0 } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('Recurring invoice generator error:', e)
    return new Response(JSON.stringify({ success: false, message: e.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


