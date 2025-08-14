// Permission Utilities for comprehensive permission management
import { 
  PermissionError, 
  PermissionErrorHandler, 
  PermissionErrorType,
  createFeatureError,
  createRoleError,
  createPermissionError
} from './permission-errors';

// Permission check results with detailed context
export interface PermissionCheckResult {
  allowed: boolean;
  error?: PermissionError;
  reason?: string;
  context?: any;
}

// Comprehensive permission checker class
export class PermissionChecker {
  
  // Check feature access with detailed error information
  static checkFeatureAccess(
    featureName: string, 
    hasFeature: (name: string) => boolean,
    getFeatureLimit?: (name: string) => number,
    currentUsage?: number
  ): PermissionCheckResult {
    
    // Check basic feature availability
    if (!hasFeature(featureName)) {
      return {
        allowed: false,
        error: createFeatureError(featureName),
        reason: `Feature '${featureName}' not available in current plan`
      };
    }

    // Check usage limits if applicable
    if (getFeatureLimit && currentUsage !== undefined) {
      const limit = getFeatureLimit(featureName);
      if (currentUsage >= limit) {
        return {
          allowed: false,
          error: createFeatureError(featureName, currentUsage, limit),
          reason: `Feature '${featureName}' usage limit exceeded (${currentUsage}/${limit})`
        };
      }
    }

    return { allowed: true };
  }

  // Check role-based access
  static checkRoleAccess(
    requiredRoles: string[],
    userRole?: string,
    canAccess?: (roles: string[]) => boolean
  ): PermissionCheckResult {
    
    if (!userRole) {
      return {
        allowed: false,
        error: PermissionErrorHandler.createError(PermissionErrorType.ROLE_NOT_ASSIGNED),
        reason: 'No role assigned to user'
      };
    }

    if (canAccess && !canAccess(requiredRoles)) {
      return {
        allowed: false,
        error: createRoleError(requiredRoles.join(' or '), userRole),
        reason: `User role '${userRole}' insufficient. Required: ${requiredRoles.join(' or ')}`
      };
    }

    if (!canAccess && !requiredRoles.includes(userRole)) {
      return {
        allowed: false,
        error: createRoleError(requiredRoles.join(' or '), userRole),
        reason: `User role '${userRole}' not in required roles: ${requiredRoles.join(', ')}`
      };
    }

    return { allowed: true };
  }

  // Check permission-based access
  static checkPermissionAccess(
    resource: string,
    action: string,
    hasPermission?: (resource: string, action: string) => boolean
  ): PermissionCheckResult {
    
    if (!hasPermission) {
      return {
        allowed: false,
        error: PermissionErrorHandler.createError(PermissionErrorType.MISSING_PERMISSION),
        reason: 'Permission checker not available'
      };
    }

    if (!hasPermission(resource, action)) {
      return {
        allowed: false,
        error: createPermissionError(`${action} on ${resource}`, resource),
        reason: `Missing permission: ${action} on ${resource}`
      };
    }

    return { allowed: true };
  }

  // Check authentication status
  static checkAuthentication(isAuthenticated: boolean): PermissionCheckResult {
    if (!isAuthenticated) {
      return {
        allowed: false,
        error: PermissionErrorHandler.createError(PermissionErrorType.AUTHENTICATION_REQUIRED),
        reason: 'User not authenticated'
      };
    }

    return { allowed: true };
  }

  // Comprehensive access check combining all permission types
  static checkComprehensiveAccess(options: {
    // Authentication
    isAuthenticated?: boolean;
    
    // Feature access
    featureName?: string;
    hasFeature?: (name: string) => boolean;
    getFeatureLimit?: (name: string) => number;
    currentUsage?: number;
    
    // Role access
    requiredRoles?: string[];
    userRole?: string;
    canAccess?: (roles: string[]) => boolean;
    
    // Permission access
    requiredPermission?: {
      resource: string;
      action: string;
    };
    hasPermission?: (resource: string, action: string) => boolean;
  }): PermissionCheckResult {
    
    // Check authentication first
    if (options.isAuthenticated !== undefined) {
      const authCheck = this.checkAuthentication(options.isAuthenticated);
      if (!authCheck.allowed) return authCheck;
    }

    // Check feature access
    if (options.featureName && options.hasFeature) {
      const featureCheck = this.checkFeatureAccess(
        options.featureName,
        options.hasFeature,
        options.getFeatureLimit,
        options.currentUsage
      );
      if (!featureCheck.allowed) return featureCheck;
    }

    // Check role access
    if (options.requiredRoles && options.requiredRoles.length > 0) {
      const roleCheck = this.checkRoleAccess(
        options.requiredRoles,
        options.userRole,
        options.canAccess
      );
      if (!roleCheck.allowed) return roleCheck;
    }

    // Check permission access
    if (options.requiredPermission && options.hasPermission) {
      const permissionCheck = this.checkPermissionAccess(
        options.requiredPermission.resource,
        options.requiredPermission.action,
        options.hasPermission
      );
      if (!permissionCheck.allowed) return permissionCheck;
    }

    return { allowed: true };
  }
}

// Helper functions for common permission checks
export const checkFeatureAccess = PermissionChecker.checkFeatureAccess;
export const checkRoleAccess = PermissionChecker.checkRoleAccess;
export const checkPermissionAccess = PermissionChecker.checkPermissionAccess;
export const checkAuthentication = PermissionChecker.checkAuthentication;
export const checkComprehensiveAccess = PermissionChecker.checkComprehensiveAccess;

// Error logging utilities
export const logPermissionError = (error: PermissionError, context?: any) => {
  console.group('🚫 Permission Error');
  console.error('Type:', error.type);
  console.error('Message:', error.message);
  console.error('User Message:', error.userMessage);
  console.error('Feature:', error.featureName);
  console.error('Required Role:', error.requiredRole);
  console.error('Required Permission:', error.requiredPermission);
  console.error('Context:', context);
  console.groupEnd();
};

// Permission validation utilities
export const validatePermissionContext = (context: any): boolean => {
  // Add validation logic for permission context
  if (!context) return false;
  
  // Validate required fields based on permission type
  return true; // Simplified for now
};