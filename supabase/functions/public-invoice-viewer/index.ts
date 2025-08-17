import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import jsPDF from 'https://esm.sh/jspdf@2.5.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  id: string;
  receipt_number: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  status: string;
  created_at: string;
  customer_id: string;
  contacts: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  sale_items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    products: {
      name: string;
      sku?: string;
    };
  }>;
}

interface BusinessSettings {
  company_name: string;
  company_logo_url?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_identification_number?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get('invoice_id');
    const action = url.searchParams.get('action') || 'view';

    if (!invoiceId) {
      return new Response('Invoice ID is required', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch invoice data with customer and items
    const { data: invoice, error: invoiceError } = await supabase
      .from('sales')
      .select(`
        *,
        contacts!sales_customer_id_fkey (
          name,
          email,
          phone,
          address
        ),
        sale_items (
          quantity,
          unit_price,
          total_price,
          products (
            name,
            sku
          )
        )
      `)
      .eq('id', invoiceId)
      .eq('payment_method', 'credit')
      .single();

    if (invoiceError || !invoice) {
      return new Response('Invoice not found', { 
        status: 404,
        headers: corsHeaders 
      });
    }

    // Get tenant ID from invoice
    const tenantId = invoice.tenant_id;
    
    // Fetch business settings
    const { data: businessSettings, error: settingsError } = await supabase
      .from('business_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (settingsError) {
      console.error('Error fetching business settings:', settingsError);
    }

    const invoiceData: InvoiceData = {
      ...invoice,
      contacts: invoice.contacts || { name: 'Walk-in Customer' }
    };

    if (action === 'download') {
      return generateInvoicePDF(invoiceData, businessSettings);
    } else {
      return generateInvoiceHTML(invoiceData, businessSettings);
    }

  } catch (error) {
    console.error('Error in public-invoice-viewer:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

function generateInvoiceHTML(invoice: InvoiceData, businessSettings: BusinessSettings | null): Response {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const dueDate = new Date(invoice.created_at);
  dueDate.setDate(dueDate.getDate() + 30); // Default 30-day terms

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.receipt_number}</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8f9fa;
                padding: 20px;
            }
            
            .invoice-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .invoice-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .invoice-header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                font-weight: 300;
            }
            
            .invoice-content {
                padding: 40px;
            }
            
            .company-info {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e9ecef;
            }
            
            .company-name {
                font-size: 1.8rem;
                font-weight: bold;
                color: #495057;
                margin-bottom: 5px;
            }
            
            .company-details {
                color: #6c757d;
                line-height: 1.4;
            }
            
            .invoice-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }
            
            .detail-section {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 6px;
                border-left: 4px solid #667eea;
            }
            
            .detail-section h3 {
                color: #495057;
                margin-bottom: 15px;
                font-size: 1.1rem;
            }
            
            .detail-item {
                margin-bottom: 8px;
            }
            
            .detail-label {
                font-weight: 600;
                color: #6c757d;
                display: inline-block;
                width: 120px;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                background: white;
                border-radius: 6px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            
            .items-table th {
                background: #667eea;
                color: white;
                padding: 15px 10px;
                text-align: left;
                font-weight: 600;
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .items-table td {
                padding: 15px 10px;
                border-bottom: 1px solid #e9ecef;
            }
            
            .items-table tr:hover {
                background-color: #f8f9fa;
            }
            
            .text-right {
                text-align: right;
            }
            
            .totals-section {
                background: #f8f9fa;
                padding: 25px;
                border-radius: 6px;
                margin-bottom: 30px;
            }
            
            .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding: 5px 0;
            }
            
            .total-row.grand-total {
                border-top: 2px solid #667eea;
                padding-top: 15px;
                margin-top: 15px;
                font-weight: bold;
                font-size: 1.2rem;
                color: #495057;
            }
            
            .payment-info {
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                border-radius: 6px;
                padding: 20px;
                margin-bottom: 30px;
            }
            
            .payment-info h3 {
                color: #1976d2;
                margin-bottom: 15px;
            }
            
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .status-pending {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            
            .footer {
                text-align: center;
                color: #6c757d;
                font-size: 0.9rem;
                border-top: 1px solid #e9ecef;
                padding-top: 20px;
            }
            
            .download-btn {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin-top: 20px;
                transition: background-color 0.3s;
            }
            
            .download-btn:hover {
                background: #5a6fd8;
            }
            
            @media (max-width: 768px) {
                .invoice-details {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                .items-table {
                    font-size: 0.9rem;
                }
                
                .items-table th,
                .items-table td {
                    padding: 10px 8px;
                }
                
                .invoice-header h1 {
                    font-size: 2rem;
                }
                
                .invoice-content {
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <div class="invoice-header">
                <h1>INVOICE</h1>
                <div style="font-size: 1.2rem; opacity: 0.9;">${invoice.receipt_number}</div>
            </div>
            
            <div class="invoice-content">
                <div class="company-info">
                    <div class="company-name">${businessSettings?.company_name || 'VibePOS'}</div>
                    <div class="company-details">
                        ${businessSettings?.address_line_1 ? businessSettings.address_line_1 + '<br>' : ''}
                        ${businessSettings?.city ? businessSettings.city + ', ' : ''}${businessSettings?.state_province || ''}${businessSettings?.postal_code ? ' ' + businessSettings.postal_code : ''}
                        ${businessSettings?.city || businessSettings?.state_province || businessSettings?.postal_code ? '<br>' : ''}
                        ${businessSettings?.phone ? 'Phone: ' + businessSettings.phone + '<br>' : ''}
                        ${businessSettings?.email ? 'Email: ' + businessSettings.email : ''}
                    </div>
                </div>
                
                <div class="invoice-details">
                    <div class="detail-section">
                        <h3>Bill To</h3>
                        <div class="detail-item">
                            <div style="font-weight: bold; margin-bottom: 5px;">${invoice.contacts.name}</div>
                            ${invoice.contacts.email ? '<div>Email: ' + invoice.contacts.email + '</div>' : ''}
                            ${invoice.contacts.phone ? '<div>Phone: ' + invoice.contacts.phone + '</div>' : ''}
                            ${invoice.contacts.address ? '<div>Address: ' + invoice.contacts.address + '</div>' : ''}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Invoice Details</h3>
                        <div class="detail-item">
                            <span class="detail-label">Invoice #:</span>
                            <span>${invoice.receipt_number}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Issue Date:</span>
                            <span>${formatDate(invoice.created_at)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Due Date:</span>
                            <span>${formatDate(dueDate.toISOString())}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>SKU</th>
                            <th class="text-right">Qty</th>
                            <th class="text-right">Unit Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.sale_items.map(item => `
                            <tr>
                                <td>${item.products.name}</td>
                                <td>${item.products.sku || '-'}</td>
                                <td class="text-right">${item.quantity}</td>
                                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                                <td class="text-right">${formatCurrency(item.total_price)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals-section">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(invoice.total_amount - (invoice.tax_amount || 0))}</span>
                    </div>
                    ${invoice.discount_amount ? `
                        <div class="total-row">
                            <span>Discount:</span>
                            <span>-${formatCurrency(invoice.discount_amount)}</span>
                        </div>
                    ` : ''}
                    ${invoice.tax_amount ? `
                        <div class="total-row">
                            <span>Tax:</span>
                            <span>${formatCurrency(invoice.tax_amount)}</span>
                        </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <span>Total Amount:</span>
                        <span>${formatCurrency(invoice.total_amount)}</span>
                    </div>
                </div>
                
                <div class="payment-info">
                    <h3>Payment Information</h3>
                    <p><strong>Payment Terms:</strong> Net 30 days</p>
                    <p><strong>Due Date:</strong> ${formatDate(dueDate.toISOString())}</p>
                    <p>Please remit payment within 30 days of the invoice date. If you have any questions about this invoice, please contact us.</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="?invoice_id=${invoice.id}&action=download" class="download-btn">
                        📄 Download PDF
                    </a>
                </div>
                
                <div class="footer">
                    <p>Thank you for your business!</p>
                    <p style="margin-top: 10px; font-size: 0.8rem;">
                        This invoice was generated on ${formatDate(new Date().toISOString())} • 
                        Invoice ${invoice.receipt_number}
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

function generateInvoicePDF(invoice: InvoiceData, businessSettings: BusinessSettings | null): Response {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE');
  };

  const dueDate = new Date(invoice.created_at);
  dueDate.setDate(dueDate.getDate() + 30);

  // Create PDF
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(51, 51, 51);
  doc.text('INVOICE', 105, 30, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(invoice.receipt_number, 105, 40, { align: 'center' });
  
  // Company info
  let yPos = 60;
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text(businessSettings?.company_name || 'VibePOS', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  if (businessSettings?.address_line_1) {
    doc.text(businessSettings.address_line_1, 20, yPos);
    yPos += 5;
  }
  
  if (businessSettings?.city) {
    doc.text(`${businessSettings.city}, ${businessSettings.state_province || ''} ${businessSettings.postal_code || ''}`, 20, yPos);
    yPos += 5;
  }
  
  if (businessSettings?.phone) {
    doc.text(`Phone: ${businessSettings.phone}`, 20, yPos);
    yPos += 5;
  }
  
  if (businessSettings?.email) {
    doc.text(`Email: ${businessSettings.email}`, 20, yPos);
  }
  
  // Invoice details
  doc.setFont(undefined, 'bold');
  doc.text('Invoice Details:', 120, 60);
  doc.setFont(undefined, 'normal');
  doc.text(`Invoice #: ${invoice.receipt_number}`, 120, 70);
  doc.text(`Issue Date: ${formatDate(invoice.created_at)}`, 120, 75);
  doc.text(`Due Date: ${formatDate(dueDate.toISOString())}`, 120, 80);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 120, 85);
  
  // Customer info
  yPos = 100;
  doc.setFont(undefined, 'bold');
  doc.text('Bill To:', 20, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 5;
  doc.text(invoice.contacts.name, 20, yPos);
  
  if (invoice.contacts.email) {
    yPos += 5;
    doc.text(`Email: ${invoice.contacts.email}`, 20, yPos);
  }
  
  if (invoice.contacts.phone) {
    yPos += 5;
    doc.text(`Phone: ${invoice.contacts.phone}`, 20, yPos);
  }
  
  if (invoice.contacts.address) {
    yPos += 5;
    doc.text(`Address: ${invoice.contacts.address}`, 20, yPos);
  }
  
  // Items table
  yPos = 130;
  const tableHeaders = ['Item', 'Qty', 'Unit Price', 'Total'];
  const columnWidths = [80, 20, 30, 30];
  let xPos = 20;
  
  // Table header
  doc.setFont(undefined, 'bold');
  doc.setFillColor(200, 200, 200);
  doc.rect(20, yPos - 5, 160, 10, 'F');
  
  tableHeaders.forEach((header, index) => {
    doc.text(header, xPos, yPos);
    xPos += columnWidths[index];
  });
  
  // Table rows
  doc.setFont(undefined, 'normal');
  yPos += 10;
  
  invoice.sale_items.forEach(item => {
    xPos = 20;
    doc.text(item.products.name, xPos, yPos);
    xPos += columnWidths[0];
    doc.text(item.quantity.toString(), xPos, yPos);
    xPos += columnWidths[1];
    doc.text(formatCurrency(item.unit_price), xPos, yPos);
    xPos += columnWidths[2];
    doc.text(formatCurrency(item.total_price), xPos, yPos);
    yPos += 7;
  });
  
  // Totals
  yPos += 10;
  const subtotal = invoice.total_amount - (invoice.tax_amount || 0);
  
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 130, yPos);
  yPos += 5;
  
  if (invoice.discount_amount) {
    doc.text(`Discount: -${formatCurrency(invoice.discount_amount)}`, 130, yPos);
    yPos += 5;
  }
  
  if (invoice.tax_amount) {
    doc.text(`Tax: ${formatCurrency(invoice.tax_amount)}`, 130, yPos);
    yPos += 5;
  }
  
  doc.setFont(undefined, 'bold');
  doc.text(`Total: ${formatCurrency(invoice.total_amount)}`, 130, yPos + 5);
  
  // Payment info
  yPos += 25;
  doc.setFont(undefined, 'bold');
  doc.text('Payment Information:', 20, yPos);
  doc.setFont(undefined, 'normal');
  yPos += 7;
  doc.text('Payment Terms: Net 30 days', 20, yPos);
  yPos += 5;
  doc.text(`Due Date: ${formatDate(dueDate.toISOString())}`, 20, yPos);
  yPos += 5;
  doc.text('Please remit payment within 30 days of the invoice date.', 20, yPos);
  
  // Footer
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  
  const pdfOutput = doc.output('arraybuffer');
  
  return new Response(pdfOutput, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.receipt_number}.pdf"`,
    },
  });
}

serve(handler);