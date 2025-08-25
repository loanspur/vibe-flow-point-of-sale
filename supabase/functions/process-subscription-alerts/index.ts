import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get pending subscription alerts
    const { data: pendingAlerts, error: fetchError } = await supabase.rpc('get_pending_subscription_alerts', {
      p_limit: 50
    })

    if (fetchError) {
      console.error('Error fetching pending alerts:', fetchError)
      throw fetchError
    }

    if (!pendingAlerts || pendingAlerts.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No pending alerts to process',
          processed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    let processedCount = 0
    const errors: string[] = []

    // Process each alert
    for (const alert of pendingAlerts) {
      try {
        // Send notification based on method
        let notificationSent = false

        switch (alert.notification_method) {
          case 'email':
            notificationSent = await sendEmailNotification(alert, supabase)
            break
          case 'whatsapp':
            notificationSent = await sendWhatsAppNotification(alert, supabase)
            break
          case 'sms':
            notificationSent = await sendSMSNotification(alert, supabase)
            break
          default:
            console.warn(`Unknown notification method: ${alert.notification_method}`)
            continue
        }

        if (notificationSent) {
          // Mark alert as sent
          const { error: updateError } = await supabase.rpc('mark_subscription_alert_sent', {
            p_alert_id: alert.id
          })

          if (updateError) {
            console.error('Error marking alert as sent:', updateError)
            errors.push(`Failed to mark alert ${alert.id} as sent: ${updateError.message}`)
          } else {
            processedCount++
          }
        } else {
          errors.push(`Failed to send notification for alert ${alert.id}`)
        }
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error)
        errors.push(`Error processing alert ${alert.id}: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedCount} alerts`,
        processed: processedCount,
        total: pendingAlerts.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in process-subscription-alerts:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function sendEmailNotification(alert: any, supabase: any): Promise<boolean> {
  try {
    if (!alert.recipient_email) {
      console.warn('No email recipient specified for alert:', alert.id)
      return false
    }

    // Get tenant customization for email template
    const { data: customization } = await supabase.rpc('get_tenant_customization', {
      p_tenant_id: alert.tenant_id
    })

    const tenantCustom = customization?.[0] || {}

    // Prepare email content
    const subject = getEmailSubject(alert.alert_type)
    const content = alert.message_content || getDefaultMessage(alert.alert_type, tenantCustom)

    // Queue email notification using the notification system
    const { error: queueError } = await supabase.rpc('queue_notification', {
      p_template_name: 'subscription_alert_email',
      p_recipient: alert.recipient_email,
      p_variables: {
        alert_type: alert.alert_type,
        alert_date: alert.alert_date,
        message: content,
        tenant_name: tenantCustom.footer_text || 'Vibe POS'
      }
    })

    if (queueError) {
      console.error('Error queuing email notification:', queueError)
      return false
    }

    console.log(`Email notification queued for alert ${alert.id} to ${alert.recipient_email}`)
    return true

  } catch (error) {
    console.error('Error sending email notification:', error)
    return false
  }
}

async function sendWhatsAppNotification(alert: any, supabase: any): Promise<boolean> {
  try {
    if (!alert.recipient_phone) {
      console.warn('No phone number specified for WhatsApp alert:', alert.id)
      return false
    }

    // Get tenant customization
    const { data: customization } = await supabase.rpc('get_tenant_customization', {
      p_tenant_id: alert.tenant_id
    })

    const tenantCustom = customization?.[0] || {}

    // Prepare WhatsApp message
    const content = alert.message_content || getDefaultMessage(alert.alert_type, tenantCustom)

    // Queue WhatsApp notification
    const { error: queueError } = await supabase.rpc('queue_notification', {
      p_template_name: 'subscription_alert_whatsapp',
      p_recipient: alert.recipient_phone,
      p_variables: {
        alert_type: alert.alert_type,
        alert_date: alert.alert_date,
        message: content,
        tenant_name: tenantCustom.footer_text || 'Vibe POS'
      }
    })

    if (queueError) {
      console.error('Error queuing WhatsApp notification:', queueError)
      return false
    }

    console.log(`WhatsApp notification queued for alert ${alert.id} to ${alert.recipient_phone}`)
    return true

  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
    return false
  }
}

async function sendSMSNotification(alert: any, supabase: any): Promise<boolean> {
  try {
    if (!alert.recipient_phone) {
      console.warn('No phone number specified for SMS alert:', alert.id)
      return false
    }

    // Get tenant customization
    const { data: customization } = await supabase.rpc('get_tenant_customization', {
      p_tenant_id: alert.tenant_id
    })

    const tenantCustom = customization?.[0] || {}

    // Prepare SMS message
    const content = alert.message_content || getDefaultMessage(alert.alert_type, tenantCustom)

    // Queue SMS notification
    const { error: queueError } = await supabase.rpc('queue_notification', {
      p_template_name: 'subscription_alert_sms',
      p_recipient: alert.recipient_phone,
      p_variables: {
        alert_type: alert.alert_type,
        alert_date: alert.alert_date,
        message: content,
        tenant_name: tenantCustom.footer_text || 'Vibe POS'
      }
    })

    if (queueError) {
      console.error('Error queuing SMS notification:', queueError)
      return false
    }

    console.log(`SMS notification queued for alert ${alert.id} to ${alert.recipient_phone}`)
    return true

  } catch (error) {
    console.error('Error sending SMS notification:', error)
    return false
  }
}

function getEmailSubject(alertType: string): string {
  const subjects = {
    trial_ending: 'Trial Period Ending Soon',
    trial_ended: 'Trial Period Ended',
    renewal_due: 'Subscription Renewal Due',
    payment_failed: 'Payment Processing Failed',
    subscription_expired: 'Subscription Expired',
  }

  return subjects[alertType as keyof typeof subjects] || 'Subscription Alert'
}

function getDefaultMessage(alertType: string, customization: any): string {
  const messages = {
    trial_ending: `Your trial period is ending soon. Please upgrade to continue using our services. ${customization.footer_text || 'Powered by Vibe POS'}`,
    trial_ended: `Your trial period has ended. Please upgrade to continue using our services. ${customization.footer_text || 'Powered by Vibe POS'}`,
    renewal_due: `Your subscription renewal is due. Please ensure your payment method is up to date. ${customization.footer_text || 'Powered by Vibe POS'}`,
    payment_failed: `We were unable to process your payment. Please update your payment method. ${customization.footer_text || 'Powered by Vibe POS'}`,
    subscription_expired: `Your subscription has expired. Please renew to continue using our services. ${customization.footer_text || 'Powered by Vibe POS'}`,
  }

  return messages[alertType as keyof typeof messages] || 'Subscription alert notification'
}
