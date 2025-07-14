import { useAuth } from "@/contexts/AuthContext";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import TenantAdminDashboard from "@/pages/TenantAdminDashboard";
import ComprehensivePOS from "@/pages/ComprehensivePOS";

export default function DashboardRouter() {
  const { viewMode, userRole, loading, user } = useAuth();

  // Debug logging to help troubleshoot
  console.log('DashboardRouter - userRole:', userRole, 'viewMode:', viewMode, 'user:', !!user);

  // Show loading while auth is initializing or user info is being fetched
  if (loading || (user && userRole === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Route based on view mode for superadmins, or role for others
  if (userRole === 'superadmin' && viewMode === 'superadmin') {
    console.log('Rendering SuperAdminDashboard');
    return <SuperAdminDashboard key="superadmin-dashboard" />;
  } else if (userRole === 'admin' || userRole === 'manager' || (userRole === 'superadmin' && viewMode === 'tenant')) {
    console.log('Rendering TenantAdminDashboard');
    // Tenant admins and managers get the redesigned dashboard
    return <TenantAdminDashboard key="tenant-admin-dashboard" />;
  } else {
    console.log('Rendering ComprehensivePOS');
    // Regular users get the comprehensive POS system
    return <ComprehensivePOS key="comprehensive-pos" />;
  }
}