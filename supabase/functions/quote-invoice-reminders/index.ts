import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderStats {
  quotesNotified: number;
  invoicesNotified: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'https://qwtybhvdbbkbcelisuek.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let stats: ReminderStats = { quotesNotified: 0, invoicesNotified: 0 };

    // 1) Quote expiry reminders: status 'sent' and valid_until today or tomorrow
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, tenant_id, quote_number, valid_until, total_amount, status, customer_id')
      .in('status', ['sent'])
      .gte('valid_until', todayStr)
      .lte('valid_until', new Date(now.getTime() + 24*60*60*1000).toISOString().split('T')[0]);

    if (quotes && quotes.length) {
      for (const q of quotes) {
        // Get customer email from customers table first, fallback to contacts
        let recipientEmail = '';
        let recipientName = '';

        if (q.customer_id) {
          const { data: cust } = await supabase.from('customers').select('email, name').eq('id', q.customer_id).maybeSingle();
          if (cust?.email) {
            recipientEmail = cust.email;
            recipientName = cust.name || '';
          } else {
            const { data: contact } = await supabase.from('contacts').select('email, name').eq('id', q.customer_id).maybeSingle();
            if (contact?.email) {
              recipientEmail = contact.email;
              recipientName = contact.name || '';
            }
          }
        }

        if (!recipientEmail) continue;

        await supabase.functions.invoke('send-enhanced-email', {
          body: {
            to: recipientEmail,
            toName: recipientName,
            subject: `Reminder: Quote ${q.quote_number} is expiring soon`,
            htmlContent: `<p>Dear ${recipientName || 'Customer'},</p><p>This is a friendly reminder that your quote <strong>${q.quote_number}</strong> will expire on <strong>${q.valid_until}</strong>.</p><p>Total: ${q.total_amount}</p><p>Please reply to proceed or request changes.</p><p>Regards,<br/>VibePOS</p>`,
            tenantId: q.tenant_id,
            priority: 'medium'
          }
        });
        stats.quotesNotified += 1;
      }
    }

    // 2) Invoice due reminders from AR: status outstanding/partial and due today or overdue
    const { data: ar } = await supabase
      .from('accounts_receivable')
      .select('id, tenant_id, customer_id, invoice_number, due_date, outstanding_amount, status')
      .in('status', ['outstanding','partial'])
      .lte('due_date', todayStr);

    if (ar && ar.length) {
      for (const rec of ar) {
        // Fetch customer
        let recipientEmail = '';
        let recipientName = '';
        if (rec.customer_id) {
          const { data: cust } = await supabase.from('customers').select('email, name').eq('id', rec.customer_id).maybeSingle();
          if (cust?.email) {
            recipientEmail = cust.email;
            recipientName = cust.name || '';
          } else {
            const { data: contact } = await supabase.from('contacts').select('email, name').eq('id', rec.customer_id).maybeSingle();
            if (contact?.email) {
              recipientEmail = contact.email;
              recipientName = contact.name || '';
            }
          }
        }
        if (!recipientEmail) continue;

        await supabase.functions.invoke('send-enhanced-email', {
          body: {
            to: recipientEmail,
            toName: recipientName,
            subject: `Payment Reminder: Invoice ${rec.invoice_number || ''} due`,
            htmlContent: `<p>Dear ${recipientName || 'Customer'},</p><p>This is a reminder that your invoice${rec.invoice_number ? ` <strong>${rec.invoice_number}</strong>` : ''} is due. Outstanding balance: <strong>${rec.outstanding_amount}</strong>.</p><p>Please make a payment at your earliest convenience.</p><p>Regards,<br/>VibePOS</p>`,
            tenantId: rec.tenant_id,
            priority: 'high'
          }
        });
        stats.invoicesNotified += 1;
      }
    }

    return new Response(JSON.stringify({ success: true, stats }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error in quote-invoice-reminders:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
