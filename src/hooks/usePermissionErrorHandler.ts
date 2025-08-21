import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionErrorOptions {
  showToast?: boolean;
  logError?: boolean;
}

export const usePermissionErrorHandler = (options: PermissionErrorOptions = {}) => {
  const { showToast = true, logError = true } = options;
  const { userRole } = useAuth();

  const handlePermissionError = useCallback(async (
    resource: string,
    action: string,
    originalError?: any
  ) => {
    try {
      // Get user-friendly error message from database function
      const { data: errorMessage } = await supabase.rpc('get_permission_error_message', {
        p_resource: resource,
        p_action: action,
        p_user_role: userRole
      });

      const friendlyMessage = errorMessage || 
        `Access denied: You don't have permission to ${action} in ${resource.replace('_', ' ')}. Please contact your administrator.`;

      if (showToast) {
        toast.error(friendlyMessage, {
          duration: 5000,
          action: {
            label: 'Request Access',
            onClick: () => {
              // Could open a request access modal here
              toast.info('Please contact your system administrator to request access to this feature.');
            }
          }
        });
      }

      if (logError) {
        console.warn('Permission Denied:', {
          resource,
          action,
          userRole,
          message: friendlyMessage,
          originalError
        });
      }

      return friendlyMessage;
    } catch (error) {
      console.error('Error getting permission error message:', error);
      const fallbackMessage = `Access denied. You don't have sufficient permissions for this action. Please contact your administrator.`;
      
      if (showToast) {
        toast.error(fallbackMessage);
      }
      
      return fallbackMessage;
    }
  }, [showToast, logError, userRole]);

  const handleSupabaseError = useCallback(async (error: any) => {
    // Check if it's a permission-related error
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code;

    // Map common Supabase errors to user-friendly messages
    if (errorCode === '42501' || errorMessage.includes('permission denied')) {
      const friendlyMessage = 'Access denied: You don\'t have permission to perform this action. Please contact your administrator for access.';
      
      if (showToast) {
        toast.error(friendlyMessage, {
          duration: 5000,
          action: {
            label: 'Get Help',
            onClick: () => {
              toast.info('Contact your system administrator to request the necessary permissions for this feature.');
            }
          }
        });
      }
      return friendlyMessage;
    }

    if (errorMessage.includes('rls') || errorMessage.includes('row level security')) {
      const friendlyMessage = 'Access restricted: You can only access your own data or data you\'ve been given permission to view.';
      
      if (showToast) {
        toast.error(friendlyMessage);
      }
      return friendlyMessage;
    }

    if (errorCode === 'PGRST301' || errorMessage.includes('jwt')) {
      const friendlyMessage = 'Session expired: Please log in again to continue.';
      
      if (showToast) {
        toast.error(friendlyMessage, {
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
      }
      return friendlyMessage;
    }

    // For other errors, show a generic message
    const genericMessage = 'An error occurred. If this persists, please contact support.';
    
    if (showToast) {
      toast.error(genericMessage);
    }
    
    return genericMessage;
  }, [showToast]);

  const checkPermissionWithErrorHandling = useCallback(async (
    resource: string,
    action: string,
    operation: () => Promise<any>
  ) => {
    try {
      return await operation();
    } catch (error: any) {
      await handlePermissionError(resource, action, error);
      throw error; // Re-throw so caller can handle it appropriately
    }
  }, [handlePermissionError]);

  return {
    handlePermissionError,
    handleSupabaseError,
    checkPermissionWithErrorHandling
  };
};