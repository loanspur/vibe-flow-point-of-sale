import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'superadmin' | 'admin' | 'manager' | 'cashier' | 'user';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles
}: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

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

  // Special handling for dashboard redirect
  if (window.location.pathname === '/dashboard') {
    if (userRole === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    } else if (userRole === 'admin' || userRole === 'manager') {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/pos" replace />;
    }
  }

  // Redirect superadmin users to superadmin dashboard from any other route (except auth)
  if (userRole === 'superadmin' && 
      !window.location.pathname.startsWith('/superadmin') && 
      !window.location.pathname.startsWith('/auth') &&
      !window.location.pathname.startsWith('/profile')) {
    return <Navigate to="/superadmin" replace />;
  }

  // Redirect tenant admin/manager users to their dashboard if they're on root or other public pages
  if ((userRole === 'admin' || userRole === 'manager') && 
      (window.location.pathname === '/' || 
       window.location.pathname === '/demo' ||
       window.location.pathname.startsWith('/signup') ||
       window.location.pathname.startsWith('/success'))) {
    return <Navigate to="/admin" replace />;
  }

  // Redirect cashier/user to POS if they're on root or other public pages
  if ((userRole === 'cashier' || userRole === 'user') && 
      (window.location.pathname === '/' || 
       window.location.pathname === '/demo' ||
       window.location.pathname.startsWith('/signup') ||
       window.location.pathname.startsWith('/success'))) {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
}