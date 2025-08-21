import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  feature?: string;
  resource?: string;
  action?: string;
  role?: string | string[];
  fallback?: ReactNode;
  showMessage?: boolean;
}

export const PermissionGuard = ({ 
  children, 
  feature, 
  resource, 
  action = 'read', 
  role, 
  fallback = null,
  showMessage = true 
}: PermissionGuardProps) => {
  const { user, userRole } = useAuth();
  const { hasFeature } = useFeatureAccess();

  // Must be authenticated
  if (!user) {
    if (showMessage) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to access this feature.
          </AlertDescription>
        </Alert>
      );
    }
    return fallback;
  }

  // Superadmin and admin bypass all checks
  if (userRole === 'superadmin' || userRole === 'admin') {
    return <>{children}</>;
  }

  // Check role-based access
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!userRole || !allowedRoles.includes(userRole)) {
      if (showMessage) {
        return (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied: This feature requires {role} role or higher. Your current role ({userRole}) doesn't have sufficient permissions. Please contact your administrator to request access.
            </AlertDescription>
          </Alert>
        );
      }
      return fallback;
    }
  }

  // Check feature access (subscription-based)
  if (feature && !hasFeature(feature)) {
    if (showMessage) {
      return (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This feature is not available in your current plan. Please upgrade your subscription to access advanced features like {feature}.
          </AlertDescription>
        </Alert>
      );
    }
    return fallback;
  }

  // Check resource/action permissions - simplified for now, can be enhanced with unified system
  if (resource && action) {
    // Basic admin/manager access for now
    const hasResourcePermission = userRole === 'superadmin' || userRole === 'admin' || userRole === 'manager';
    
    if (!hasResourcePermission) {
      if (showMessage) {
        const actionText = action === 'read' ? 'view' : 
                          action === 'create' ? 'add new items to' :
                          action === 'update' ? 'modify items in' :
                          action === 'delete' ? 'remove items from' :
                          action;
        
        const resourceText = resource.replace('_', ' ');
        
        return (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied: You don't have permission to {actionText} {resourceText}. Your current role ({userRole}) doesn't include this permission. Please contact your administrator to request access to this feature.
            </AlertDescription>
          </Alert>
        );
      }
      return fallback;
    }
  }

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
  const { hasFeature } = useFeatureAccess();

  const checkPermission = (
    feature?: string,
    resource?: string,
    action?: string,
    role?: string | string[]
  ): boolean => {
    // Check if user is an administrator - grant all permissions
    if (userRole === 'admin' || userRole === 'superadmin') {
      return true;
    }

    // Check role
    if (role) {
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (!allowedRoles.includes(userRole || '')) {
        return false;
      }
    }

    // Check feature
    if (feature && !hasFeature(feature)) {
      return false;
    }

    // Check resource/action - simplified for now
    if (resource && action) {
      return userRole === 'manager' || userRole === 'admin' || userRole === 'superadmin';
    }

    return true;
  };

  return {
    checkPermission,
    hasFeatureAccess: hasFeature,
    userRole,
  };
};