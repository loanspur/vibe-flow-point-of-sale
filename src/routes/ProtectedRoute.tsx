import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isSubdomain } from '@/lib/domain-manager';
import { isAuthPath } from '@/lib/route-helpers';

type UserRole = string;

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute = ({
  allowedRoles = [],
  requireAuth = true
}: ProtectedRouteProps) => {
  const { user, loading, userRole: authUserRole } = useAuth();
  const location = useLocation();

  // Never gate /auth — route must be public
  if (isAuthPath(location.pathname)) return <Outlet />;

  // Normalize role mapping (unchanged)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0) {
    if (!user) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    if (user && !authUserRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }
    // Be permissive on dev subdomains/localhost to avoid loops
    if (isSubdomain() || window.location.hostname.includes('localhost')) {
      return <Outlet />;
    }

    const allowedNormalized = allowedRoles.map(r => r.toLowerCase());
    const authLower = authUserRole?.toLowerCase();
    const mappedLower = mappedRole?.toLowerCase();

    const roleMatch =
      (mappedLower && allowedNormalized.includes(mappedLower)) ||
      (authLower && allowedNormalized.includes(authLower)) ||
      authUserRole === 'superadmin' ||
      authUserRole === 'admin';

    if (!roleMatch) {
      const redirectPath = isSubdomain() ? '/auth' : '/';
      return <Navigate to={redirectPath} state={{ from: location }} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
