import { ReactNode } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';

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

  // Check role-based access
  if (allowedRoles.length > 0) {
    if (!canAccess(allowedRoles)) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (requiredPermission) {
    if (!hasPermission(requiredPermission.resource, requiredPermission.action)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default RoleBasedAccess;