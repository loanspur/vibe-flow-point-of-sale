import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isSubdomain } from '@/lib/domain-manager';
import { isAuthPath } from '@/lib/route-helpers';

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

  // Short-circuit: allow any /auth path to render without role checks
  if (isAuthPath(location.pathname)) {
    return <>{children}</>;
  }

  // Simple role mapping for basic functionality
  const mapRole = (role: string): string => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'superadmin':
      case 'tenant admin':
      case 'tenant_admin':
      case 'owner':
      case 'business owner':
        return 'Business Owner';
      case 'manager':
      case 'store manager':
        return 'Store Manager';
      case 'user':
      case 'cashier':
      case 'sales staff':
        return 'Sales Staff';
      default:
        return role || 'Sales Staff';
    }
  };

  const mappedRole = authUserRole ? mapRole(authUserRole) : null;

  // Show loading while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    // If user is not authenticated
    if (!user) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // If user exists but role hasn't loaded yet, show a loading state instead of redirecting
    if (user && !authUserRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    // On tenant subdomains or localhost, be more permissive to avoid redirect loops
    if (isSubdomain() || window.location.hostname.includes('localhost')) {
      return <>{children}</>;
    }

    // Normalize role comparisons (case-insensitive)
    const allowedNormalized = allowedRoles.map(r => r.toLowerCase());
    const authLower = authUserRole?.toLowerCase();
    const mappedLower = mappedRole?.toLowerCase();

    // Simple role checking - can be enhanced with unified permission system
    const roleMatch = (mappedLower && allowedNormalized.includes(mappedLower)) || 
                     (authLower && allowedNormalized.includes(authLower)) ||
                     authUserRole === 'superadmin' || 
                     authUserRole === 'admin';
    
    if (!roleMatch) {
      const redirectPath = isSubdomain() ? '/auth' : '/';
      return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;