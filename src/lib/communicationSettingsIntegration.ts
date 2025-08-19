import { supabase } from '@/integrations/supabase/client';

/**
 * Communication Settings Integration
 * Checks business settings to determine if communication channels are enabled
 */

export type CommunicationChannel = 'email' | 'sms' | 'whatsapp';

export const checkCommunicationSettings = async (
  tenantId: string, 
  channel: CommunicationChannel
): Promise<boolean> => {
  try {
    const { data: settings } = await supabase
      .from('business_settings')
      .select('email_notifications, sms_enable_notifications, whatsapp_enable_notifications')
      .eq('tenant_id', tenantId)
      .single();

    if (!settings) return false;

    switch (channel) {
      case 'email':
        return settings.email_notifications ?? true;
      case 'sms':
        return settings.sms_enable_notifications ?? false;
      case 'whatsapp':
        return settings.whatsapp_enable_notifications ?? false;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking communication settings:', error);
    return false;
  }
};

/**
 * Enhanced communication wrapper that respects business settings
 */
export const sendCommunicationWithSettings = async (
  tenantId: string,
  channel: CommunicationChannel,
  recipient: string,
  message: string,
  sendFunction: () => Promise<any>
): Promise<{ success: boolean; error?: string }> => {
  // Check if communication is enabled in business settings
  const isChannelEnabled = await checkCommunicationSettings(tenantId, channel);
  
  if (!isChannelEnabled) {
    return {
      success: false,
      error: `${channel} communication is disabled in business settings`
    };
  }

  try {
    await sendFunction();
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || `Failed to send ${channel} communication`
    };
  }
};