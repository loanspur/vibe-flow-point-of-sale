import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { TrialEndingEmail } from './_templates/trial-ending-email.tsx';
import { PaymentDueEmail } from './_templates/payment-due-email.tsx';
import { TrialEncouragementEmail } from './_templates/trial-encouragement-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationData {
  tenant_id: string;
  tenant_name: string;
  contact_email: string;
  notification_type: 'trial_ending' | 'payment_due' | 'trial_encouragement_early' | 'trial_encouragement_mid';
  target_date: string;
  plan_name: string;
  plan_price: number;
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-NOTIFICATIONS] ${timestamp} ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting billing notifications check');

    // Use service role key to access all tenant data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get today's date and various target dates
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 5); // 5 days from now
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // For encouragement emails
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    logStep('Checking for notifications', { 
      targetDate: targetDateStr,
      threeDaysAgo: threeDaysAgoStr,
      sevenDaysAgo: sevenDaysAgoStr
    });

    // Query for tenants needing trial ending notifications
    const { data: trialEndingTenants, error: trialError } = await supabase
      .from('tenant_subscription_details')
      .select(`
        tenant_id,
        trial_end,
        billing_plan_id,
        tenants!inner(name, contact_email),
        billing_plans!inner(name, price)
      `)
      .eq('status', 'trial')
      .eq('trial_end', targetDateStr)
      .not('tenants.contact_email', 'is', null);

    if (trialError) {
      throw new Error(`Error fetching trial ending tenants: ${trialError.message}`);
    }

    logStep('Found trial ending tenants', { count: trialEndingTenants?.length || 0 });

    // Query for tenants needing payment due notifications
    const { data: paymentDueTenants, error: paymentError } = await supabase
      .from('tenant_subscription_details')
      .select(`
        tenant_id,
        next_billing_date,
        billing_plan_id,
        tenants!inner(name, contact_email),
        billing_plans!inner(name, price)
      `)
      .eq('status', 'active')
      .eq('next_billing_date', targetDateStr)
      .not('tenants.contact_email', 'is', null);

    if (paymentError) {
      throw new Error(`Error fetching payment due tenants: ${paymentError.message}`);
    }

    logStep('Found payment due tenants', { count: paymentDueTenants?.length || 0 });

    // Query for early trial encouragement (3 days into trial)
    const { data: earlyTrialTenants, error: earlyTrialError } = await supabase
      .from('tenant_subscription_details')
      .select(`
        tenant_id,
        trial_end,
        trial_start,
        billing_plan_id,
        tenants!inner(name, contact_email),
        billing_plans!inner(name, price)
      `)
      .eq('status', 'trial')
      .eq('trial_start', threeDaysAgoStr)
      .not('tenants.contact_email', 'is', null);

    if (earlyTrialError) {
      throw new Error(`Error fetching early trial tenants: ${earlyTrialError.message}`);
    }

    logStep('Found early trial tenants', { count: earlyTrialTenants?.length || 0 });

    // Query for mid-trial encouragement (7 days into trial)
    const { data: midTrialTenants, error: midTrialError } = await supabase
      .from('tenant_subscription_details')
      .select(`
        tenant_id,
        trial_end,
        trial_start,
        billing_plan_id,
        tenants!inner(name, contact_email),
        billing_plans!inner(name, price)
      `)
      .eq('status', 'trial')
      .eq('trial_start', sevenDaysAgoStr)
      .not('tenants.contact_email', 'is', null);

    if (midTrialError) {
      throw new Error(`Error fetching mid trial tenants: ${midTrialError.message}`);
    }

    logStep('Found mid trial tenants', { count: midTrialTenants?.length || 0 });

    const notifications: NotificationData[] = [];

    // Process trial ending notifications
    if (trialEndingTenants) {
      for (const tenant of trialEndingTenants) {
        notifications.push({
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenants.name,
          contact_email: tenant.tenants.contact_email,
          notification_type: 'trial_ending',
          target_date: tenant.trial_end,
          plan_name: tenant.billing_plans.name,
          plan_price: tenant.billing_plans.price,
        });
      }
    }

    // Process payment due notifications
    if (paymentDueTenants) {
      for (const tenant of paymentDueTenants) {
        notifications.push({
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenants.name,
          contact_email: tenant.tenants.contact_email,
          notification_type: 'payment_due',
          target_date: tenant.next_billing_date,
          plan_name: tenant.billing_plans.name,
          plan_price: tenant.billing_plans.price,
        });
      }
    }

    // Process early trial encouragement notifications
    if (earlyTrialTenants) {
      for (const tenant of earlyTrialTenants) {
        notifications.push({
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenants.name,
          contact_email: tenant.tenants.contact_email,
          notification_type: 'trial_encouragement_early',
          target_date: tenant.trial_end,
          plan_name: tenant.billing_plans.name,
          plan_price: tenant.billing_plans.price,
        });
      }
    }

    // Process mid trial encouragement notifications
    if (midTrialTenants) {
      for (const tenant of midTrialTenants) {
        notifications.push({
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenants.name,
          contact_email: tenant.tenants.contact_email,
          notification_type: 'trial_encouragement_mid',
          target_date: tenant.trial_end,
          plan_name: tenant.billing_plans.name,
          plan_price: tenant.billing_plans.price,
        });
      }
    }

    logStep('Total notifications to process', { count: notifications.length });

    let emailsSent = 0;
    let emailsSkipped = 0;

    for (const notification of notifications) {
      try {
        // Check if notification already sent
        const { data: existingNotification } = await supabase
          .from('billing_notifications')
          .select('id')
          .eq('tenant_id', notification.tenant_id)
          .eq('notification_type', notification.notification_type)
          .eq('notification_date', notification.target_date)
          .single();

        if (existingNotification) {
          logStep('Notification already sent, skipping', { 
            tenant: notification.tenant_name,
            type: notification.notification_type 
          });
          emailsSkipped++;
          continue;
        }

        // Generate appropriate email content
        let emailHtml: string;
        let subject: string;

        if (notification.notification_type === 'trial_ending') {
          const upgradeUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/admin/settings?tab=billing`;
          
          emailHtml = await renderAsync(
            React.createElement(TrialEndingEmail, {
              businessName: notification.tenant_name,
              trialEndDate: new Date(notification.target_date).toLocaleDateString(),
              planName: notification.plan_name,
              planPrice: notification.plan_price,
              upgradeUrl,
            })
          );
          subject = 'Your VibePOS Trial Ends in 5 Days';
        } else if (notification.notification_type === 'payment_due') {
          const manageUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/admin/settings?tab=billing`;
          
          emailHtml = await renderAsync(
            React.createElement(PaymentDueEmail, {
              businessName: notification.tenant_name,
              billingDate: new Date(notification.target_date).toLocaleDateString(),
              planName: notification.plan_name,
              planPrice: notification.plan_price,
              manageUrl,
            })
          );
          subject = 'VibePOS Payment Due in 5 Days';
        } else if (notification.notification_type === 'trial_encouragement_early') {
          const upgradeUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/admin/settings?tab=billing`;
          
          emailHtml = await renderAsync(
            React.createElement(TrialEncouragementEmail, {
              userName: 'there', // We don't have user name in this context
              tenantName: notification.tenant_name,
              trialEndsAt: notification.target_date,
              upgradeUrl,
              encouragementType: 'early',
            })
          );
          subject = `How's your ${notification.tenant_name} experience going?`;
        } else if (notification.notification_type === 'trial_encouragement_mid') {
          const upgradeUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovableproject.com')}/admin/settings?tab=billing`;
          
          emailHtml = await renderAsync(
            React.createElement(TrialEncouragementEmail, {
              userName: 'there', // We don't have user name in this context
              tenantName: notification.tenant_name,
              trialEndsAt: notification.target_date,
              upgradeUrl,
              encouragementType: 'mid',
            })
          );
          subject = `Unlock the full potential of ${notification.tenant_name}`;
        }

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: 'VibePOS <billing@vibepos.com>',
          to: [notification.contact_email],
          subject,
          html: emailHtml,
        });

        if (emailError) {
          logStep('Failed to send email', { 
            tenant: notification.tenant_name,
            error: emailError.message 
          });
          continue;
        }

        // Record notification sent
        await supabase
          .from('billing_notifications')
          .insert({
            tenant_id: notification.tenant_id,
            notification_type: notification.notification_type,
            notification_date: notification.target_date,
            email_sent_to: notification.contact_email,
          });

        logStep('Email sent successfully', { 
          tenant: notification.tenant_name,
          type: notification.notification_type,
          email: notification.contact_email 
        });

        emailsSent++;

      } catch (error) {
        logStep('Error processing notification', { 
          tenant: notification.tenant_name,
          error: error.message 
        });
      }
    }

    logStep('Billing notifications completed', { 
      emailsSent, 
      emailsSkipped, 
      totalProcessed: notifications.length 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsSkipped, 
        totalProcessed: notifications.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in billing notifications', { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});