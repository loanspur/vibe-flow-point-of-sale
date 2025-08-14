import { ReactNode } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { usePermissionError } from '@/hooks/usePermissionError';

interface RoleBasedAccessProps {
  children: ReactNode;
  allowedRoles?: string[];
  requiredPermission?: {
    resource: string;
    action: string;
  };
  fallback?: ReactNode;
}

export const RoleBasedAccess = ({ 
  children, 
  allowedRoles = [], 
  requiredPermission,
  fallback = null 
}: RoleBasedAccessProps) => {
  const { userRole, hasPermission, canAccess } = useUserRoles();
  const { handleRoleError, handleMissingPermissionError } = usePermissionError({ showToast: false });

  // Check role-based access
  if (allowedRoles.length > 0) {
    if (!canAccess(allowedRoles)) {
      handleRoleError(allowedRoles.join(' or '), userRole?.name);
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    if (!hasPermission(requiredPermission.resource, requiredPermission.action)) {
      handleMissingPermissionError(
        `${requiredPermission.action} on ${requiredPermission.resource}`,
        requiredPermission.resource
      );
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default RoleBasedAccess;