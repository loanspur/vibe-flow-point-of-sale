import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Cache for exchange rates (in-memory, resets on function restart)
const exchangeRateCache = new Map<string, { rate: number; lastUpdated: number }>();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;
  
  const cacheKey = `${fromCurrency}_${toCurrency}`;
  const cached = exchangeRateCache.get(cacheKey);
  
  // Return cached rate if still valid
  if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
    return cached.rate;
  }
  
  try {
    // Using exchangerate-api.io (free tier allows 1500 requests/month)
    const response = await fetch(`https://api.exchangerate-api.io/v4/latest/${fromCurrency}`);
    const data = await response.json();
    
    if (data.success && data.rates[toCurrency]) {
      const rate = data.rates[toCurrency];
      exchangeRateCache.set(cacheKey, { rate, lastUpdated: Date.now() });
      return rate;
    }
    
    // Fallback to approximate rates if API fails
    const fallbackRates: { [key: string]: number } = {
      'KES_USD': 0.0062,
      'KES_EUR': 0.0058,
      'KES_GBP': 0.0050,
      'KES_NGN': 11.5,
      'KES_ZAR': 0.12,
      'KES_UGX': 23.0,
      'KES_TZS': 19.2,
    };
    
    return fallbackRates[cacheKey] || 1;
  } catch (error) {
    console.error('Currency conversion error:', error);
    return 1; // Fallback to 1:1 rate
  }
}

function getCurrencyByCountry(country: string): string {
  const countryToCurrency: { [key: string]: string } = {
    'Kenya': 'KES',
    'United States': 'USD',
    'United Kingdom': 'GBP',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Nigeria': 'NGN',
    'South Africa': 'ZAR',
    'Uganda': 'UGX',
    'Tanzania': 'TZS',
    'Rwanda': 'RWF',
    'Canada': 'CAD',
    'Australia': 'AUD',
    'Japan': 'JPY',
    'China': 'CNY',
    'India': 'INR',
    'Brazil': 'BRL',
  };
  
  return countryToCurrency[country] || 'USD';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, amount, fromCurrency, toCurrency, tenantId, country } = await req.json();

    if (action === 'convert') {
      const rate = await getExchangeRate(fromCurrency || 'KES', toCurrency);
      const convertedAmount = amount * rate;
      
      return new Response(
        JSON.stringify({
          originalAmount: amount,
          convertedAmount: parseFloat(convertedAmount.toFixed(2)),
          rate,
          fromCurrency: fromCurrency || 'KES',
          toCurrency,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-tenant-currency') {
      // Get tenant's business settings to determine their country/currency
      const { data: settings } = await supabase
        .from('business_settings')
        .select('country, currency_code')
        .eq('tenant_id', tenantId)
        .single();

      let targetCurrency = 'USD'; // Default fallback
      
      if (settings?.currency_code) {
        targetCurrency = settings.currency_code;
      } else if (settings?.country) {
        targetCurrency = getCurrencyByCountry(settings.country);
      } else if (country) {
        targetCurrency = getCurrencyByCountry(country);
      }

      const rate = await getExchangeRate('KES', targetCurrency);

      return new Response(
        JSON.stringify({
          currency: targetCurrency,
          rate,
          country: settings?.country || country,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'bulk-convert') {
      const { amounts, targetCurrency } = await req.json();
      const rate = await getExchangeRate('KES', targetCurrency);
      
      const convertedAmounts = amounts.map((amount: number) => ({
        original: amount,
        converted: parseFloat((amount * rate).toFixed(2)),
      }));

      return new Response(
        JSON.stringify({
          rate,
          conversions: convertedAmounts,
          fromCurrency: 'KES',
          toCurrency: targetCurrency,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Currency conversion function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});