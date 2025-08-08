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
  const { user, loading, userRole: authUserRole } = useAuth();

  // Simple role mapping for basic functionality
  const mapRole = (role: string): string => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
        return 'Business Owner';
      case 'manager':
        return 'Store Manager';
      case 'user':
      case 'cashier':
        return 'Sales Staff';
      default:
        return role || 'Sales Staff';
    }
  };

  const mappedRole = authUserRole ? mapRole(authUserRole) : null;

  console.log('🛡️ ProtectedRoute SIMPLIFIED debug:', {
    user: !!user,
    userEmail: user?.email,
    loading,
    originalRole: authUserRole,
    mappedRole,
    allowedRoles,
    hasAccess: allowedRoles.length === 0 || (mappedRole && allowedRoles.includes(mappedRole)),
    pathname: window.location.pathname
  });

  // Show loading while auth is being determined
  if (loading) {
    console.log('🛡️ ProtectedRoute loading auth...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authentication is required and user is not logged in
  if (requireAuth && !user) {
    console.log('🚫 Redirecting to auth - no user');
    return <Navigate to="/auth" replace />;
  }

  // If specific roles are required
  if (allowedRoles.length > 0) {
    // If user is not authenticated or has no role
    if (!user || !authUserRole) {
      console.log('🚫 Redirecting to auth - no role');
      return <Navigate to="/auth" replace />;
    }

    // Check if user has required role access
    if (!mappedRole || !allowedRoles.includes(mappedRole)) {
      console.log('🚫 Access denied - role mismatch');
      return <Navigate to="/dashboard" replace />;
    }
  }

  console.log('✅ ProtectedRoute allowing access');
  console.log('🎯 About to render ProtectedRoute children');
  return <>{children}</>;
};

export default ProtectedRoute;