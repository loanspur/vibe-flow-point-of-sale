import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { useEnhancedRoles } from '@/hooks/useEnhancedRoles';
import { AlertTriangle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PermissionGuardProps {
  children: ReactNode;
  feature?: string;
  resource?: string;
  action?: string;
  role?: string | string[];
  fallback?: ReactNode;
  showMessage?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  feature,
  resource,
  action,
  role,
  fallback,
  showMessage = true,
}) => {
  const { userRole, user } = useAuth();
  const { hasFeatureAccess, userRoles, loading } = useRoleManagement();
  const { hasPermission: hasEnhancedPermission } = useEnhancedRoles();

  // If loading, show children to avoid flickering
  if (loading) {
    return <>{children}</>;
  }

  // Check if user is authenticated
  if (!user) {
    return showMessage ? (
      <Alert className="border-red-200 bg-red-50">
        <Lock className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Authentication required to access this feature.
        </AlertDescription>
      </Alert>
    ) : null;
  }

  // Check role-based access
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(userRole || '')) {
      return fallback || (showMessage ? (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You don't have the required role to access this feature.
            Required: {allowedRoles.join(', ')}
          </AlertDescription>
        </Alert>
      ) : null);
    }
  }

  // Check feature-based access
  if (feature) {
    if (!hasFeatureAccess(feature)) {
      return fallback || (showMessage ? (
        <Alert className="border-blue-200 bg-blue-50">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            The "{feature}" feature is not enabled for your account.
            Contact your administrator to enable this feature.
          </AlertDescription>
        </Alert>
      ) : null);
    }
  }

  // Check resource and action based access with enhanced permissions
  if (resource && action) {
    // Use enhanced permission system first
    if (!hasEnhancedPermission(resource, action)) {
      // Fallback to legacy role-based check
      const currentUserRole = userRoles.find(r => r.name.toLowerCase() === userRole?.toLowerCase());
      
      if (currentUserRole) {
        const permissions = currentUserRole.permissions || {};
        
        if (permissions[resource]) {
          const allowedActions = permissions[resource];
          if (!allowedActions.includes(action) && !allowedActions.includes('*')) {
            return fallback || (showMessage ? (
              <Alert className="border-orange-200 bg-orange-50">
                <Lock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  You don't have permission to {action} {resource}.
                </AlertDescription>
              </Alert>
            ) : null);
          }
        } else {
          // No permission found
          return fallback || (showMessage ? (
            <Alert className="border-orange-200 bg-orange-50">
              <Lock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                You don't have permission to {action} {resource}.
              </AlertDescription>
            </Alert>
          ) : null);
        }
      } else {
        // No role found, deny access
        return fallback || (showMessage ? (
          <Alert className="border-orange-200 bg-orange-50">
            <Lock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              You don't have permission to {action} {resource}.
            </AlertDescription>
          </Alert>
        ) : null);
      }
    }
  }

  // If all checks pass, render children
  return <>{children}</>;
};

// Higher-order component for easier usage
export const withPermission = (
  Component: React.ComponentType<any>,
  permissions: Omit<PermissionGuardProps, 'children'>
) => {
  return (props: any) => (
    <PermissionGuard {...permissions}>
      <Component {...props} />
    </PermissionGuard>
  );
};

// Hook for checking permissions in components
export const usePermissions = () => {
  const { userRole } = useAuth();
  const { hasFeatureAccess, userRoles } = useRoleManagement();
  const { hasPermission: hasEnhancedPermission } = useEnhancedRoles();

  const checkPermission = (
    feature?: string,
    resource?: string,
    action?: string,
    role?: string | string[]
  ): boolean => {
    // Check role
    if (role) {
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (!allowedRoles.includes(userRole || '')) {
        return false;
      }
    }

    // Check feature
    if (feature && !hasFeatureAccess(feature)) {
      return false;
    }

    // Check resource/action with enhanced permissions
    if (resource && action) {
      if (!hasEnhancedPermission(resource, action)) {
        // Fallback to legacy role check
        const currentUserRole = userRoles.find(r => r.name.toLowerCase() === userRole?.toLowerCase());
        if (currentUserRole) {
          const permissions = currentUserRole.permissions || {};
          if (permissions[resource]) {
            const allowedActions = permissions[resource];
            if (!allowedActions.includes(action) && !allowedActions.includes('*')) {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  };

  return {
    checkPermission,
    hasFeatureAccess,
    userRole,
  };
};