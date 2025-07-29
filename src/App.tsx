import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { useDomainContext, isDevelopmentDomain } from "@/lib/domain-router";
import ProtectedRoute from "./components/ProtectedRoute";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { FeatureGuard } from "./components/FeatureGuard";
import { TenantAdminLayout } from "./components/TenantAdminLayout";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
import { StockManagement } from "./components/StockManagement";
import PerformanceMonitor from "./components/PerformanceMonitor";
import CookieConsent from "./components/CookieConsent";
import { PasswordChangeModal } from "./components/PasswordChangeModal";

// Import critical components directly to avoid dynamic import failures
import LandingPage from "./pages/LandingPage";
const Auth = lazy(() => import("./pages/Auth"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const TrialSignup = lazy(() => import("./pages/TrialSignup"));
const SubdomainTestPage = lazy(() => import("./components/SubdomainTestPage"));
const Success = lazy(() => import("./pages/Success"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Demo = lazy(() => import("./pages/Demo"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CompanyInfo = lazy(() => import("./pages/CompanyInfo"));
const Careers = lazy(() => import("./pages/Careers"));

// Dashboards
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const TenantAdminDashboard = lazy(() => import("./pages/TenantAdminDashboard"));


// Admin Pages
const TenantManagement = lazy(() => import("./pages/TenantManagement"));
const SuperAdminUserManagement = lazy(() => import("./pages/SuperAdminUserManagement"));
const SuperAdminAnalytics = lazy(() => import("./pages/SuperAdminAnalytics"));
const SuperAdminRevenue = lazy(() => import("./pages/SuperAdminRevenue"));
const SuperAdminSystemHealth = lazy(() => import("./pages/SuperAdminSystemHealth"));
const SuperAdminDatabase = lazy(() => import("./pages/SuperAdminDatabase"));
const SuperAdminSecurity = lazy(() => import("./pages/SuperAdminSecurity"));
const Settings = lazy(() => import("./pages/Settings"));
const TenantSettings = lazy(() => import("./pages/TenantSettings"));
const TenantCommunications = lazy(() => import("./pages/TenantCommunications"));
const SuperAdminSettings = lazy(() => import("./pages/SuperAdminSettings"));
const SuperAdminCommunications = lazy(() => import("./pages/SuperAdminCommunications"));
const SuperAdminPlanManagement = lazy(() => import("./pages/SuperAdminPlanManagement"));
const Products = lazy(() => import("./pages/Products"));
const Reports = lazy(() => import("./pages/Reports"));
const Team = lazy(() => import("./pages/Team"));
const Customers = lazy(() => import("./pages/Customers"));
const Sales = lazy(() => import("./pages/Sales"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
    <div className="text-center space-y-4 animate-fade-in">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Comprehensive error suppression for external errors and warnings
window.addEventListener('error', (event) => {
  const message = event.message?.toLowerCase() || '';
  const filename = event.filename?.toLowerCase() || '';
  
  if (message.includes('firebase') || 
      message.includes('firestore') || 
      message.includes('googleapis') ||
      message.includes('unrecognized feature') ||
      message.includes('iframe') ||
      message.includes('sandbox') ||
      message.includes('message channel closed') ||
      message.includes('listener indicated an asynchronous response') ||
      filename.includes('firebase') ||
      filename.includes('firestore') ||
      message.includes('webchannelconnection') ||
      message.includes('quic_protocol_error')) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message?.toLowerCase() || 
                event.reason?.toString?.()?.toLowerCase() || '';
  
  if (reason.includes('firebase') || 
      reason.includes('firestore') || 
      reason.includes('googleapis') ||
      reason.includes('webchannelconnection') ||
      reason.includes('message channel closed') ||
      reason.includes('listener indicated an asynchronous response') ||
      reason.includes('quic_protocol_error')) {
    event.preventDefault();
    return false;
  }
});

// Block Firebase network requests and feature warnings at the console level
const originalLog = console.error;
const originalWarn = console.warn;

console.error = function(...args) {
  const message = args.join(' ').toLowerCase();
  if (message.includes('firebase') || 
      message.includes('firestore') || 
      message.includes('googleapis') ||
      message.includes('webchannelconnection') ||
      message.includes('unrecognized feature') ||
      message.includes('iframe') ||
      message.includes('message channel closed') ||
      message.includes('listener indicated an asynchronous response') ||
      message.includes('sandbox')) {
    return; // Suppress these error logs
  }
  originalLog.apply(console, args);
};

console.warn = function(...args) {
  const message = args.join(' ').toLowerCase();
  if (message.includes('firebase') || 
      message.includes('firestore') || 
      message.includes('googleapis') ||
      message.includes('unrecognized feature') ||
      message.includes('iframe') ||
      message.includes('multiple gotrueclient') ||
      message.includes('sandbox')) {
    return; // Suppress these warnings
  }
  originalWarn.apply(console, args);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DomainRouter = () => {
  const { domainConfig, loading } = useDomainContext();
  
  if (loading) {
    return <PageLoader />;
  }

  // If on subdomain, show tenant-specific routes only
  if (domainConfig?.isSubdomain && domainConfig.tenantId) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier', 'user']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <TenantAdminDashboard />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/products" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Products />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/customers" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Customers />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/sales" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Sales />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Reports />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier', 'user']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Profile />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Main domain routes (all existing routes)
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/test-subdomains" element={<SubdomainTestPage />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/success" element={<Success />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/company-info" element={<CompanyInfo />} />
        <Route path="/careers" element={<Careers />} />
        
        {/* Super Admin Routes */}
        <Route 
          path="/superadmin" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminDashboard />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/tenants" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <TenantManagement />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/users" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminUserManagement />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/analytics" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminAnalytics />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/revenue" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminRevenue />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/system" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminSystemHealth />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/database" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminDatabase />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/security" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminSecurity />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/communications" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminCommunications />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/plans" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminPlanManagement />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin/settings" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminLayout>
                <SuperAdminSettings />
              </SuperAdminLayout>
            </ProtectedRoute>
          } 
        />
        
        {/* Tenant Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <TenantAdminDashboard />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/products" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Products />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/stock" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <FeatureGuard featureName="advanced_inventory">
                  <TenantAdminLayout>
                    <StockManagement />
                  </TenantAdminLayout>
                </FeatureGuard>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Reports />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/team" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Team />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/customers" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Customers />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/settings" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <TenantSettings />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/communications" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <TenantCommunications />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/sales" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Sales />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/purchases" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Purchases />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/accounting" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Accounting />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        
        
        {/* Profile Route - accessible to all authenticated users */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier', 'user']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Profile />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback - redirect to appropriate dashboard */}
        <Route path="/dashboard" element={<ProtectedRoute><div /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PerformanceMonitor />
          <CookieConsent />
          <PasswordChangeModal />
          <BrowserRouter>
            <DomainRouter />
          </BrowserRouter>
        </TooltipProvider>
      </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;