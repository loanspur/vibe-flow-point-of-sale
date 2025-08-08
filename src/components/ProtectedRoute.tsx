import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

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
    hasAccess:
      allowedRoles.length === 0 ||
      (mappedRole && allowedRoles.includes(mappedRole)) ||
      (authUserRole && allowedRoles.includes(authUserRole)),
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

  if (requireAuth && !user) {
    console.log('🚫 Redirecting to auth - no user');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    // If user is not authenticated
    if (!user) {
      console.log('🚫 Redirecting to auth - no user');
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // If user exists but role hasn't loaded yet, show a loading state instead of redirecting
    if (user && !authUserRole) {
      console.log('⏳ Waiting for role to load...');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    // Check if user has required role access (support both raw and mapped roles)
    const roleMatch = (mappedRole && allowedRoles.includes(mappedRole)) || (authUserRole && allowedRoles.includes(authUserRole));
    if (!roleMatch) {
      console.log('🚫 Access denied - role mismatch');
      return <Navigate to="/dashboard" replace />;
    }
  }

  console.log('✅ ProtectedRoute allowing access');
  console.log('🎯 About to render ProtectedRoute children');
  return <>{children}</>;
};

export default ProtectedRoute;