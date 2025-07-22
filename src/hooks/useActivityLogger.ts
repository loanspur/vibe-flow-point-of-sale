import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityLogData {
  action_type: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
}

export const useActivityLogger = () => {
  const { user, tenantId } = useAuth();

  const logActivity = useCallback(async (data: ActivityLogData) => {
    if (!user || !tenantId) return;

    try {
      // Get user's IP address (approximate)
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      const ipAddress = ipData.ip;

      // Get user agent
      const userAgent = navigator.userAgent;

      await supabase.rpc('log_user_activity', {
        tenant_id_param: tenantId,
        user_id_param: user.id,
        action_type_param: data.action_type,
        resource_type_param: data.resource_type || null,
        resource_id_param: data.resource_id || null,
        details_param: data.details || null,
        ip_address_param: ipAddress,
        user_agent_param: userAgent
      });
    } catch (error) {
      // Silently fail - don't disrupt user experience
      console.error('Failed to log activity:', error);
    }
  }, [user, tenantId]);

  // Convenience methods for common activities
  const logLogin = useCallback(() => {
    logActivity({
      action_type: 'login',
      details: { timestamp: new Date().toISOString() }
    });
  }, [logActivity]);

  const logLogout = useCallback(() => {
    logActivity({
      action_type: 'logout',
      details: { timestamp: new Date().toISOString() }
    });
  }, [logActivity]);

  const logCreate = useCallback((resourceType: string, resourceId: string, details?: Record<string, any>) => {
    logActivity({
      action_type: 'create',
      resource_type: resourceType,
      resource_id: resourceId,
      details
    });
  }, [logActivity]);

  const logUpdate = useCallback((resourceType: string, resourceId: string, details?: Record<string, any>) => {
    logActivity({
      action_type: 'update',
      resource_type: resourceType,
      resource_id: resourceId,
      details
    });
  }, [logActivity]);

  const logDelete = useCallback((resourceType: string, resourceId: string, details?: Record<string, any>) => {
    logActivity({
      action_type: 'delete',
      resource_type: resourceType,
      resource_id: resourceId,
      details
    });
  }, [logActivity]);

  const logView = useCallback((resourceType: string, resourceId?: string, details?: Record<string, any>) => {
    logActivity({
      action_type: 'view',
      resource_type: resourceType,
      resource_id: resourceId,
      details
    });
  }, [logActivity]);

  const logExport = useCallback((resourceType: string, details?: Record<string, any>) => {
    logActivity({
      action_type: 'export',
      resource_type: resourceType,
      details
    });
  }, [logActivity]);

  const logSearch = useCallback((resourceType: string, searchTerm: string, details?: Record<string, any>) => {
    logActivity({
      action_type: 'search',
      resource_type: resourceType,
      details: { search_term: searchTerm, ...details }
    });
  }, [logActivity]);

  return {
    logActivity,
    logLogin,
    logLogout,
    logCreate,
    logUpdate,
    logDelete,
    logView,
    logExport,
    logSearch
  };
};