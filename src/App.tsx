import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { TenantAdminLayout } from "./components/TenantAdminLayout";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import TrialSignup from "./pages/TrialSignup";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";

// Dashboards
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import TenantAdminDashboard from "./pages/TenantAdminDashboard";
import ComprehensivePOS from "./pages/ComprehensivePOS";

// Admin Pages
import TenantManagement from "./pages/TenantManagement";
import Settings from "./pages/Settings";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Team from "./pages/Team";
import Customers from "./pages/Customers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<TrialSignup />} />
            <Route path="/success" element={<Success />} />
            
            {/* Super Admin Routes */}
            <Route 
              path="/superadmin" 
              element={
                <ProtectedRoute allowedRoles={['superadmin']} requiredViewMode="superadmin">
                  <SuperAdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/superadmin/tenants" 
              element={
                <ProtectedRoute allowedRoles={['superadmin']} requiredViewMode="superadmin">
                  <TenantManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Tenant Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <TenantAdminDashboard />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/products" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <Products />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reports" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <Reports />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/team" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <Team />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/customers" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <Customers />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <Settings />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            
            {/* POS Routes */}
            <Route 
              path="/pos" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier', 'user']}>
                  <ComprehensivePOS />
                </ProtectedRoute>
              } 
            />
            
            {/* Fallback - redirect to appropriate dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><div /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;