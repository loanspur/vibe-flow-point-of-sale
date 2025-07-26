import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Get Firecrawl API key from environment
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      )
    }

    console.log('Scraping URL:', url)

    // Call Firecrawl API to scrape the website
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'p', 'div'],
        onlyMainContent: true
      })
    })

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text()
      console.error('Firecrawl API error:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to scrape website',
          details: errorText 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: firecrawlResponse.status 
        }
      )
    }

    const scrapedData = await firecrawlResponse.json()
    
    console.log('Scraping successful')
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: scrapedData.data
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in scrape-website function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})