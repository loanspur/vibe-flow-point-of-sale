import { useAuth } from "@/contexts/AuthContext";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import ComprehensivePOS from "@/pages/ComprehensivePOS";

export default function DashboardRouter() {
  const { viewMode, userRole, loading } = useAuth();

  // Debug logging to help troubleshoot
  console.log('DashboardRouter - userRole:', userRole, 'viewMode:', viewMode);

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
  } else {
    // All other users (including tenant admins) get the comprehensive POS system
    return <ComprehensivePOS />;
  }
}