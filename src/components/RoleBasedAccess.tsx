import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  const { userRole } = useAuth();

  // Check role-based access
  if (allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Also allow superadmin and admin to access everything
      if (userRole !== 'superadmin' && userRole !== 'admin') {
        return <>{fallback}</>;
      }
    }
  }

  // Check permission-based access - simplified for now
  if (requiredPermission) {
    // Basic permission check - admin and superadmin can do anything
    if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'manager') {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default RoleBasedAccess;