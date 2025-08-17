import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const quoteId = url.searchParams.get('id');
    const action = url.searchParams.get('action'); // 'view' or 'download'

    if (!quoteId) {
      return new Response('Quote ID is required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Fetch quote with related data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        contacts:customer_id(name, email, phone, address, company),
        quote_items(
          id,
          product_id,
          product_variant_id,
          quantity,
          unit_price,
          total_price,
          products(name, sku, description),
          product_variants(name, value)
        ),
        business_settings:tenant_id(
          company_name,
          company_logo_url,
          address_line_1,
          address_line_2,
          city,
          state_province,
          postal_code,
          country,
          phone,
          email,
          website,
          currency_code,
          currency_symbol
        )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return new Response('Quote not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Generate PDF-style HTML
    const html = generateQuoteHTML(quote);

    if (action === 'download') {
      // Return as downloadable file
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="quote-${quote.quote_number}.html"`,
        },
      });
    }

    // Return viewable HTML
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('Error in public-quote-viewer:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function generateQuoteHTML(quote: any): string {
  const businessSettings = quote.business_settings;
  const customer = quote.contacts;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quote ${quote.quote_number}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }
        .company-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .company-logo {
            max-width: 120px;
            max-height: 120px;
            border-radius: 8px;
            object-fit: contain;
        }
        .company-text {
            flex: 1;
        }
        .quote-details {
            text-align: right;
            flex: 1;
        }
        .quote-title {
            font-size: 28px;
            color: #2563eb;
            margin: 0;
        }
        .customer-section {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        .items-table th,
        .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .items-table th {
            background: #f1f5f9;
            font-weight: 600;
        }
        .total-section {
            margin-top: 30px;
            text-align: right;
        }
        .total-row {
            display: flex;
            justify-content: flex-end;
            margin: 8px 0;
        }
        .total-label {
            width: 120px;
            text-align: right;
            margin-right: 20px;
        }
        .total-amount {
            width: 100px;
            text-align: right;
            font-weight: 600;
        }
        .grand-total {
            font-size: 18px;
            color: #2563eb;
            border-top: 2px solid #eee;
            padding-top: 10px;
        }
        .actions {
            margin: 30px 0;
            text-align: center;
        }
        .download-btn {
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
        }
        .download-btn:hover {
            background: #1d4ed8;
        }
        @media print {
            .actions { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            ${businessSettings?.company_logo_url ? 
              `<img src="${businessSettings.company_logo_url}" alt="Company Logo" class="company-logo">` : 
              ''
            }
            <div class="company-text">
                <h2>${businessSettings?.company_name || 'Company Name'}</h2>
                <div>
                    ${businessSettings?.address_line_1 || ''}<br>
                    ${businessSettings?.address_line_2 ? businessSettings.address_line_2 + '<br>' : ''}
                    ${[businessSettings?.city, businessSettings?.state_province, businessSettings?.postal_code].filter(Boolean).join(', ')}<br>
                    ${businessSettings?.country || ''}<br>
                    ${businessSettings?.phone ? 'Phone: ' + businessSettings.phone + '<br>' : ''}
                    ${businessSettings?.email ? 'Email: ' + businessSettings.email + '<br>' : ''}
                    ${businessSettings?.website ? 'Website: ' + businessSettings.website : ''}
                </div>
            </div>
        </div>
        <div class="quote-details">
            <h1 class="quote-title">QUOTE</h1>
            <div><strong>Quote #:</strong> ${quote.quote_number}</div>
            <div><strong>Date:</strong> ${new Date(quote.created_at).toLocaleDateString()}</div>
            <div><strong>Valid Until:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}</div>
        </div>
    </div>

    <div class="customer-section">
        <h3>Bill To:</h3>
        <div>
            <strong>${customer?.name || 'Customer Name'}</strong><br>
            ${customer?.company ? customer.company + '<br>' : ''}
            ${customer?.address ? customer.address + '<br>' : ''}
            ${customer?.phone ? 'Phone: ' + customer.phone + '<br>' : ''}
            ${customer?.email ? 'Email: ' + customer.email : ''}
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Item</th>
                <th>Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${quote.quote_items?.map((item: any) => `
                <tr>
                    <td>
                        ${item.products?.name || 'Product'}
                        ${item.product_variants ? ` (${item.product_variants.name}: ${item.product_variants.value})` : ''}
                    </td>
                    <td>${item.products?.description || ''}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">${businessSettings?.currency_symbol || '$'}${item.unit_price.toFixed(2)}</td>
                    <td style="text-align: right;">${businessSettings?.currency_symbol || '$'}${item.total_price.toFixed(2)}</td>
                </tr>
            `).join('') || '<tr><td colspan="5">No items</td></tr>'}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <div class="total-label">Subtotal:</div>
            <div class="total-amount">${businessSettings?.currency_symbol || '$'}${(quote.total_amount - (quote.discount_amount || 0) - (quote.tax_amount || 0)).toFixed(2)}</div>
        </div>
        ${quote.discount_amount > 0 ? `
        <div class="total-row">
            <div class="total-label">Discount:</div>
            <div class="total-amount">-${businessSettings?.currency_symbol || '$'}${quote.discount_amount.toFixed(2)}</div>
        </div>
        ` : ''}
        ${quote.tax_amount > 0 ? `
        <div class="total-row">
            <div class="total-label">Tax:</div>
            <div class="total-amount">${businessSettings?.currency_symbol || '$'}${quote.tax_amount.toFixed(2)}</div>
        </div>
        ` : ''}
        <div class="total-row grand-total">
            <div class="total-label">Total:</div>
            <div class="total-amount">${businessSettings?.currency_symbol || '$'}${quote.total_amount.toFixed(2)}</div>
        </div>
    </div>

    <div class="actions">
        <button class="download-btn" onclick="window.print()">Download PDF</button>
    </div>

    ${quote.notes ? `
    <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <h4>Notes:</h4>
        <p>${quote.notes}</p>
    </div>
    ` : ''}
</body>
</html>`;
}

serve(handler);