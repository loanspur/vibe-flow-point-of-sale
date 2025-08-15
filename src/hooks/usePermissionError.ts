import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  PermissionError, 
  PermissionErrorHandler, 
  PermissionErrorType,
  createFeatureError,
  createRoleError,
  createPermissionError
} from '@/lib/permission-errors';

interface UsePermissionErrorOptions {
  showToast?: boolean;
  logErrors?: boolean;
  onError?: (error: PermissionError) => void;
}

export function usePermissionError(options: UsePermissionErrorOptions = {}) {
  const { showToast = true, logErrors = true, onError } = options;
  const { toast } = useToast();
  const [lastError, setLastError] = useState<PermissionError | null>(null);

  const handlePermissionError = useCallback((error: PermissionError) => {
    setLastError(error);

    if (logErrors) {
      console.error('Permission Error:', {
        type: error.type,
        message: error.message,
        context: {
          featureName: error.featureName,
          requiredRole: error.requiredRole,
          requiredPermission: error.requiredPermission
        }
      });
    }

    if (showToast) {
      toast({
        title: "Access Restricted",
        description: error.userMessage,
        variant: "destructive",
        duration: error.upgradeRequired ? 8000 : 5000, // Longer duration for upgrade-related errors
      });
    }

    onError?.(error);
  }, [showToast, logErrors, onError, toast]);

  const handleSupabaseError = useCallback((supabaseError: any) => {
    const permissionError = PermissionErrorHandler.getErrorFromSupabaseError(supabaseError);
    handlePermissionError(permissionError);
  }, [handlePermissionError]);

  const handleFeatureError = useCallback((featureName: string, currentLimit?: number, planLimit?: number) => {
    const error = createFeatureError(featureName, currentLimit, planLimit);
    handlePermissionError(error);
  }, [handlePermissionError]);

  const handleRoleError = useCallback((requiredRole: string, userRole?: string) => {
    const error = createRoleError(requiredRole, userRole);
    handlePermissionError(error);
  }, [handlePermissionError]);

  const handleMissingPermissionError = useCallback((requiredPermission: string, resource?: string) => {
    const error = createPermissionError(requiredPermission, resource);
    handlePermissionError(error);
  }, [handlePermissionError]);

  const handleAuthenticationError = useCallback(() => {
    const error = PermissionErrorHandler.createError(PermissionErrorType.AUTHENTICATION_REQUIRED);
    handlePermissionError(error);
  }, [handlePermissionError]);

  const handleSubscriptionError = useCallback((expired = false) => {
    const errorType = expired ? PermissionErrorType.SUBSCRIPTION_EXPIRED : PermissionErrorType.SUBSCRIPTION_REQUIRED;
    const error = PermissionErrorHandler.createError(errorType);
    handlePermissionError(error);
  }, [handlePermissionError]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const withPermissionErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => R | Promise<R>,
    errorContext?: string
  ) => {
    return async (...args: T): Promise<R | void> => {
      try {
        const result = await fn(...args);
        return result;
      } catch (error: any) {
        // Check if it's a Supabase error
        if (error?.code || error?.message) {
          handleSupabaseError(error);
        } else if (error instanceof Error) {
          // Generic error - try to categorize
          const permissionError = PermissionErrorHandler.createError(
            PermissionErrorType.UNKNOWN_PERMISSION_ERROR,
            { originalError: error, context: errorContext }
          );
          handlePermissionError(permissionError);
        } else {
          // Unknown error type
          const permissionError = PermissionErrorHandler.createError(
            PermissionErrorType.UNKNOWN_PERMISSION_ERROR,
            { context: errorContext }
          );
          handlePermissionError(permissionError);
        }
      }
    };
  }, [handlePermissionError, handleSupabaseError]);

  return {
    lastError,
    handlePermissionError,
    handleSupabaseError,
    handleFeatureError,
    handleRoleError,
    handleMissingPermissionError,
    handleAuthenticationError,
    handleSubscriptionError,
    clearError,
    withPermissionErrorHandling,
    
    // Helper functions for checking error types
    isUpgradeRequired: lastError?.upgradeRequired || false,
    isActionable: lastError?.actionable || false,
    shouldShowUpgradeDialog: lastError ? PermissionErrorHandler.shouldShowUpgradeDialog(lastError) : false,
    getActionableMessage: lastError ? PermissionErrorHandler.getActionableMessage(lastError) : ''
  };
}