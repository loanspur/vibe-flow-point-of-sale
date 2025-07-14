import { useAuth } from "@/contexts/AuthContext";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import TenantAdminDashboard from "@/pages/TenantAdminDashboard";
import POSDashboard from "@/pages/POSDashboard";

export default function DashboardRouter() {
  const { viewMode, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Route based on view mode for superadmins, or role for others
  if (userRole === 'superadmin' && viewMode === 'superadmin') {
    return <SuperAdminDashboard />;
  } else if (userRole === 'superadmin' && viewMode === 'tenant') {
    return <TenantAdminDashboard />;
  } else if (userRole === 'admin' || userRole === 'manager') {
    return <TenantAdminDashboard />;
  } else {
    // Default to POS dashboard for cashiers and regular users
    return <POSDashboard />;
  }
}