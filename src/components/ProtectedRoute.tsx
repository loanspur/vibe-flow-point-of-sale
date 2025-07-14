import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier' | 'user';
type ViewMode = 'superadmin' | 'tenant';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredViewMode?: ViewMode;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles,
  requiredViewMode 
}: ProtectedRouteProps) {
  const { user, userRole, viewMode, loading } = useAuth();

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role permissions
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/pos" replace />;
  }

  // Check view mode for superadmins
  if (requiredViewMode && viewMode !== requiredViewMode) {
    return <Navigate to="/pos" replace />;
  }

  // Special handling for dashboard redirect
  if (window.location.pathname === '/dashboard') {
    if (userRole === 'superadmin' && viewMode === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    } else if (userRole === 'admin' || userRole === 'manager' || (userRole === 'superadmin' && viewMode === 'tenant')) {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/pos" replace />;
    }
  }

  return <>{children}</>;
}