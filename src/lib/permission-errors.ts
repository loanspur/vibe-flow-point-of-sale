// Permission Error Management System
// Provides specific error handling for permission-related scenarios

export enum PermissionErrorType {
  // Feature Access Errors
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
  FEATURE_LIMIT_EXCEEDED = 'FEATURE_LIMIT_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  TRIAL_EXPIRED = 'TRIAL_EXPIRED',
  
  // Role & Permission Errors
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  MISSING_PERMISSION = 'MISSING_PERMISSION',
  ROLE_NOT_ASSIGNED = 'ROLE_NOT_ASSIGNED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Resource Access Errors
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  TENANT_ACCESS_DENIED = 'TENANT_ACCESS_DENIED',
  USER_ACCESS_DENIED = 'USER_ACCESS_DENIED',
  
  // System Errors
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  
  // Unknown/Generic
  UNKNOWN_PERMISSION_ERROR = 'UNKNOWN_PERMISSION_ERROR'
}

export interface PermissionError {
  type: PermissionErrorType;
  message: string;
  userMessage: string;
  actionable: boolean;
  upgradeRequired: boolean;
  suggestedActions: string[];
  featureName?: string;
  requiredRole?: string;
  requiredPermission?: string;
  currentLimit?: number;
  planLimit?: number;
}

export class PermissionErrorHandler {
  
  static createError(type: PermissionErrorType, context?: any): PermissionError {
    const baseErrors: Record<PermissionErrorType, Omit<PermissionError, 'type'>> = {
      [PermissionErrorType.FEATURE_NOT_AVAILABLE]: {
        message: 'Feature is not available on current subscription plan',
        userMessage: 'This feature is not included in your current plan',
        actionable: true,
        upgradeRequired: true,
        suggestedActions: ['Upgrade your subscription plan', 'Contact sales for plan options']
      },
      
      [PermissionErrorType.FEATURE_LIMIT_EXCEEDED]: {
        message: 'Feature usage limit has been exceeded',
        userMessage: `You've reached your plan's limit for this feature`,
        actionable: true,
        upgradeRequired: true,
        suggestedActions: ['Upgrade to a higher plan for increased limits', 'Remove existing items to stay within limits']
      },
      
      [PermissionErrorType.SUBSCRIPTION_REQUIRED]: {
        message: 'Active subscription required for this feature',
        userMessage: 'This feature requires an active subscription',
        actionable: true,
        upgradeRequired: true,
        suggestedActions: ['Subscribe to a paid plan', 'Start a free trial']
      },
      
      [PermissionErrorType.SUBSCRIPTION_EXPIRED]: {
        message: 'Subscription has expired',
        userMessage: 'Your subscription has expired. Please renew to continue using premium features',
        actionable: true,
        upgradeRequired: true,
        suggestedActions: ['Renew your subscription', 'Update payment method', 'Contact support for assistance']
      },
      
      [PermissionErrorType.TRIAL_EXPIRED]: {
        message: 'Free trial period has ended',
        userMessage: 'Your free trial has ended. Subscribe to continue using premium features',
        actionable: true,
        upgradeRequired: true,
        suggestedActions: ['Subscribe to a paid plan', 'Contact sales for extension options']
      },
      
      [PermissionErrorType.INSUFFICIENT_ROLE]: {
        message: 'User role insufficient for this action',
        userMessage: 'You don\'t have the required role to perform this action',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact your administrator for role assignment', 'Request elevated permissions']
      },
      
      [PermissionErrorType.MISSING_PERMISSION]: {
        message: 'Required permission not granted',
        userMessage: 'You don\'t have permission to access this feature',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact your administrator for permission', 'Request access to this resource']
      },
      
      [PermissionErrorType.ROLE_NOT_ASSIGNED]: {
        message: 'No role assigned to user',
        userMessage: 'Your account doesn\'t have a role assigned',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact your administrator for role assignment', 'Request account setup']
      },
      
      [PermissionErrorType.PERMISSION_DENIED]: {
        message: 'Permission explicitly denied',
        userMessage: 'Access denied. You are not authorized to perform this action',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact your administrator', 'Verify your account permissions']
      },
      
      [PermissionErrorType.RESOURCE_ACCESS_DENIED]: {
        message: 'Access to resource denied',
        userMessage: 'You don\'t have access to this resource',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact your administrator', 'Verify you have access to this data']
      },
      
      [PermissionErrorType.TENANT_ACCESS_DENIED]: {
        message: 'Access to tenant denied',
        userMessage: 'You don\'t have access to this organization',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact the organization administrator', 'Verify you\'re logged into the correct account']
      },
      
      [PermissionErrorType.USER_ACCESS_DENIED]: {
        message: 'User access denied',
        userMessage: 'Your account access has been restricted',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact support for assistance', 'Verify your account status']
      },
      
      [PermissionErrorType.AUTHENTICATION_REQUIRED]: {
        message: 'Authentication required',
        userMessage: 'Please log in to access this feature',
        actionable: true,
        upgradeRequired: false,
        suggestedActions: ['Log in to your account', 'Create an account if you don\'t have one']
      },
      
      [PermissionErrorType.SESSION_INVALID]: {
        message: 'Session is invalid or expired',
        userMessage: 'Your session has expired. Please log in again',
        actionable: true,
        upgradeRequired: false,
        suggestedActions: ['Log out and log back in', 'Refresh the page']
      },
      
      [PermissionErrorType.ACCOUNT_SUSPENDED]: {
        message: 'Account has been suspended',
        userMessage: 'Your account has been suspended',
        actionable: false,
        upgradeRequired: false,
        suggestedActions: ['Contact support for account reactivation', 'Review account status']
      },
      
      [PermissionErrorType.UNKNOWN_PERMISSION_ERROR]: {
        message: 'Unknown permission error occurred',
        userMessage: 'An unexpected permission error occurred',
        actionable: true,
        upgradeRequired: false,
        suggestedActions: ['Try again in a moment', 'Contact support if the issue persists']
      }
    };

    const errorTemplate = baseErrors[type];
    const error: PermissionError = {
      type,
      ...errorTemplate,
      featureName: context?.featureName,
      requiredRole: context?.requiredRole,
      requiredPermission: context?.requiredPermission,
      currentLimit: context?.currentLimit,
      planLimit: context?.planLimit
    };

    // Customize messages based on context
    if (context?.featureName) {
      error.userMessage = error.userMessage.replace('this feature', `${context.featureName}`);
    }

    if (context?.requiredRole) {
      error.userMessage += ` Required role: ${context.requiredRole}`;
    }

    if (context?.requiredPermission) {
      error.userMessage += ` Required permission: ${context.requiredPermission}`;
    }

    if (context?.currentLimit && context?.planLimit) {
      error.userMessage += ` (${context.currentLimit}/${context.planLimit})`;
    }

    return error;
  }

  static getErrorFromSupabaseError(supabaseError: any): PermissionError {
    // Map common Supabase errors to permission errors
    const errorCode = supabaseError?.code;
    const errorMessage = supabaseError?.message?.toLowerCase() || '';

    if (errorCode === '42501' || errorMessage.includes('permission denied')) {
      return this.createError(PermissionErrorType.PERMISSION_DENIED);
    }

    if (errorCode === 'PGRST301' || errorMessage.includes('jwt')) {
      return this.createError(PermissionErrorType.AUTHENTICATION_REQUIRED);
    }

    if (errorMessage.includes('rls') || errorMessage.includes('row level security')) {
      return this.createError(PermissionErrorType.RESOURCE_ACCESS_DENIED);
    }

    if (errorMessage.includes('subscription') || errorMessage.includes('billing')) {
      return this.createError(PermissionErrorType.SUBSCRIPTION_REQUIRED);
    }

    return this.createError(PermissionErrorType.UNKNOWN_PERMISSION_ERROR, {
      originalError: supabaseError
    });
  }

  static shouldShowUpgradeDialog(error: PermissionError): boolean {
    return error.upgradeRequired && error.actionable;
  }

  static getActionableMessage(error: PermissionError): string {
    if (!error.actionable || error.suggestedActions.length === 0) {
      return error.userMessage;
    }

    return `${error.userMessage}\n\nSuggested actions:\n${error.suggestedActions.map(action => `• ${action}`).join('\n')}`;
  }
}

// Helper function for feature access errors
export const createFeatureError = (featureName: string, currentLimit?: number, planLimit?: number): PermissionError => {
  if (currentLimit !== undefined && planLimit !== undefined && currentLimit >= planLimit) {
    return PermissionErrorHandler.createError(PermissionErrorType.FEATURE_LIMIT_EXCEEDED, {
      featureName,
      currentLimit,
      planLimit
    });
  }

  return PermissionErrorHandler.createError(PermissionErrorType.FEATURE_NOT_AVAILABLE, {
    featureName
  });
};

// Helper function for role-based errors
export const createRoleError = (requiredRole: string, userRole?: string): PermissionError => {
  return PermissionErrorHandler.createError(PermissionErrorType.INSUFFICIENT_ROLE, {
    requiredRole,
    userRole
  });
};

// Helper function for permission-based errors
export const createPermissionError = (requiredPermission: string, resource?: string): PermissionError => {
  return PermissionErrorHandler.createError(PermissionErrorType.MISSING_PERMISSION, {
    requiredPermission,
    resource
  });
};