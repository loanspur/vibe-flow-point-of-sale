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
  
  console.log('🛡️ ProtectedRoute check:', { 
    hasUser: !!user, 
    userRole, 
    loading,
    allowedRoles,
    currentPath: window.location.pathname,
    hostname: window.location.hostname
  });

  // Show loading while auth is initializing
  if (loading) {
    console.log('⏳ Auth loading, showing spinner...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    console.log('🚫 No user found, redirecting to auth...');
    return <Navigate to="/auth" replace />;
  }

  // Check role permissions
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/admin" replace />;
  }

  // Special handling for dashboard redirect
  if (window.location.pathname === '/dashboard') {
    if (userRole === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    } else if (userRole === 'admin' || userRole === 'manager') {
      // Check if on subdomain, redirect to root for tenant-specific dashboard
      const isOnSubdomain = window.location.hostname.includes('.vibenet.shop') && 
                           window.location.hostname !== 'vibenet.shop';
      return <Navigate to={isOnSubdomain ? "/" : "/admin"} replace />;
    } else {
      return <Navigate to="/admin" replace />;
    }
  }

  // Redirect superadmin users to superadmin dashboard from any other route (except auth)
  if (userRole === 'superadmin' && 
      !window.location.pathname.startsWith('/superadmin') && 
      !window.location.pathname.startsWith('/auth') &&
      !window.location.pathname.startsWith('/profile')) {
    return <Navigate to="/superadmin" replace />;
  }

  // Redirect tenant users to their dashboard if they're on root or other public pages
  if (['admin', 'manager', 'cashier', 'user'].includes(userRole) && 
      (window.location.pathname === '/' || 
       window.location.pathname === '/demo' ||
       window.location.pathname.startsWith('/signup') ||
       window.location.pathname.startsWith('/success'))) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}