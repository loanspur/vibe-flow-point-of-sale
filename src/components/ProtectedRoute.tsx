import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';

// User roles are now dynamically managed via user_roles table
type UserRole = string; // Dynamic role from database

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { userRole, canAccess, loading: rolesLoading } = useUserRoles();

  console.log('🛡️ ProtectedRoute debug:', {
    user: !!user,
    userEmail: user?.email,
    loading,
    rolesLoading,
    userRole: userRole?.name,
    allowedRoles,
    requireAuth,
    pathname: window.location.pathname,
    canAccessResult: allowedRoles.length > 0 ? canAccess(allowedRoles) : 'not applicable'
  });

  // Show loading while auth or roles are being determined
  if (loading || rolesLoading) {
    console.log('🛡️ ProtectedRoute loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authentication is required and user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/auth" replace />;
  }

  // If specific roles are required
  if (allowedRoles.length > 0) {
    // If user is not authenticated
    if (!user || !userRole) {
      return <Navigate to="/auth" replace />;
    }

    // Check if user has required role access
    if (!canAccess(allowedRoles)) {
      // Redirect based on user role level
      const redirectPath = userRole?.level === 1 ? '/dashboard' : 
                          userRole?.level === 2 ? '/sales' : 
                          '/dashboard';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;