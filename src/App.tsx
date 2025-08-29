import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState, useRef } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDomainContext, isDevelopmentDomain, isSubdomain, getBaseDomain } from "@/lib/domain-manager";
import { tabStabilityManager } from "@/lib/tab-stability-manager";
import ProtectedRoute from "./components/ProtectedRoute";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { FeatureGuard } from "./components/FeatureGuard";
import { TenantAdminLayout } from "./components/TenantAdminLayout";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
import { StockManagement } from "./components/StockManagement";
import PerformanceMonitor from "./components/PerformanceMonitor";
import CookieConsent from "./components/CookieConsent";
import { AuthSessionFix } from "./components/AuthSessionFix";
import { AppOptimizer } from "./components/AppOptimizer";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { TabStabilityProvider } from "./components/TabStabilityProvider";
import { DebugEnv } from "./components/DebugEnv";

// Import critical components directly to avoid dynamic import failures
import LandingPage from "./pages/LandingPage";
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CurrencyDebug = lazy(() => import("./pages/CurrencyDebug"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const TrialSignup = lazy(() => import("./pages/TrialSignup"));
const TenantRedirect = lazy(() => import("./pages/TenantRedirect"));

// AI Components for Phase 5
const AIDashboard = lazy(() => import("./components/ai/AIDashboard"));
const AIAutomationRules = lazy(() => import("./components/ai/AIAutomationRules"));
const AIPerformanceMetrics = lazy(() => import("./components/ai/AIPerformanceMetrics"));

// Mobile Components for Phase 6
const CashierPWA = lazy(() => import("./components/mobile/CashierPWA"));

// Advanced Analytics & Integrations for Phase 7
const AdvancedAnalyticsDashboard = lazy(() => import("./components/analytics/AdvancedAnalyticsDashboard"));
const ExternalIntegrationsManager = lazy(() => import("./components/integrations/ExternalIntegrationsManager"));

// Advanced Customer Management for Phase 8.5
const AdvancedCustomerManagementDashboard = lazy(() => import("./components/crm/AdvancedCustomerManagementDashboard"));

const Success = lazy(() => import("./pages/Success"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Demo = lazy(() => import("./pages/Demo"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CompanyInfo = lazy(() => import("./pages/CompanyInfo"));
const Careers = lazy(() => import("./pages/Careers"));
const AccountsReceivablePayable = lazy(() => import("./components/AccountsReceivablePayable"));

// Dashboards
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
import TenantAdminDashboard from "./pages/TenantAdminDashboard";
import { TenantSetupCompletion } from "./components/TenantSetupCompletion";

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
import Products from "./pages/Products";
const Reports = lazy(() => import("./pages/Reports"));
const Team = lazy(() => import("./pages/Team"));
const Customers = lazy(() => import("./pages/Customers"));
const Sales = lazy(() => import("./pages/Sales"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Simplified auth wrapper - no automatic redirects to prevent loops
const AuthPageWrapper = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

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

// Suppress Firebase and other noisy logs in production
if (process.env.NODE_ENV !== 'development') {
  const originalError = console.error;
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
        message.includes('sandbox')) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = function(...args) {
    const message = args.join(' ').toLowerCase();
    if (message.includes('firebase') || 
        message.includes('firestore') || 
        message.includes('googleapis') ||
        message.includes('multiple gotrueclient') ||
        message.includes('sandbox')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Optimized query client configuration for better performance with tab stability
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120000, // 2 minutes
      gcTime: 300000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Disabled to prevent performance issues
      refetchOnMount: false, // Disabled to prevent unnecessary refetches
      refetchOnReconnect: false, // Disabled to prevent network spam
      // Custom refetch condition that respects tab stability
      queryFn: undefined, // Will be set per query
    },
    mutations: {
      retry: 1, // Limit mutation retries
    },
  },
});

const DomainRouter = () => {
  const { domainConfig, loading } = useDomainContext();
  const { user, loading: authLoading, userRole } = useAuth();
  const location = useLocation();
  
  // Removed excessive logging that caused tab switching reload issues
  
  // Handle auth callbacks with React Router to prevent hydration issues
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('🔄 App Router - Current location:', {
      pathname: location.pathname,
      search: location.search,
      hash: window.location.hash,
      href: window.location.href
    });
    
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(location.search || '');
    
    // Check if we're at root with OAuth fragments - redirect to callback
    if (location.pathname === '/' && hash && /access_token|error|type=/.test(hash)) {
      console.log('🔀 OAuth fragments detected at root - redirecting to callback');
      const callbackUrl = `/auth/callback${location.search}${hash}`;
      console.log('🎯 Redirecting to:', callbackUrl);
      window.location.replace(callbackUrl);
      return;
    }
    
    // Also handle OAuth fragments on /auth path (some OAuth providers redirect here)
    if (location.pathname === '/auth' && hash && /access_token|error/.test(hash)) {
      console.log('🔀 OAuth fragments detected on /auth - redirecting to callback');
      const callbackUrl = `/auth/callback${location.search}${hash}`;
      console.log('🎯 Redirecting to:', callbackUrl);
      window.location.replace(callbackUrl);
      return;
    }
    
    // Only redirect to reset-password for specific invite/recovery types, not Google OAuth
    const isInviteCallback = hash && /type=invite|type=recovery/i.test(hash);
    const isGoogleOAuth = searchParams.get('type') === 'google' || location.pathname === '/auth/callback';
    
    console.log('🔍 Router checks:', {
      isInviteCallback,
      isGoogleOAuth,
      currentPath: location.pathname
    });
    
    if (isInviteCallback && !isGoogleOAuth && location.pathname !== '/reset-password') {
      const search = new URLSearchParams(location.search || '');
      if (!search.get('from')) search.set('from', 'invite');
      const qs = search.toString();
      
      console.log('🔀 Redirecting to reset-password');
      // Use setTimeout to avoid hydration mismatch
      setTimeout(() => {
        window.location.href = `/reset-password${qs ? `?${qs}` : ''}${hash}`;
      }, 0);
    }
  }, [location.pathname, location.search]);
  
  // Simplified auth session check - removed to prevent excessive API calls
  const [showAuthFix, setShowAuthFix] = useState(false);
  
  // Force localhost subdomains to auth for unauthenticated users
  const currentDomain = window.location.hostname;
  const isLocalhostSubdomain = currentDomain.endsWith('.localhost') && currentDomain !== 'localhost';

  if (isLocalhostSubdomain && !user && !authLoading) {
    console.log('🏠 Force redirecting localhost subdomain to auth:', currentDomain);
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }
  
  // Handle subdomain without tenant ID
  if (domainConfig?.isSubdomain && !domainConfig.tenantId) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }

  const currentPath = location.pathname;
  if (currentPath === '/auth' || currentPath === '/auth/callback' || currentPath === '/reset-password' || currentPath === '/forgot-password') {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route 
            path="/auth" 
            element={
              domainConfig?.isSubdomain 
                ? (<AuthPageWrapper><Auth /></AuthPageWrapper>) 
                : (<Auth />)
            } 
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }
  
  if (loading) {
    return <PageLoader />;
  }

  if (authLoading) {
    return <PageLoader />;
  }
  
  // Show auth session fix if needed
  if (showAuthFix) {
    return <AuthSessionFix />;
  }

  // If on subdomain, show tenant-specific routes only
  if (domainConfig?.isSubdomain && domainConfig.tenantId) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth routes - redirect to dashboard if already authenticated on subdomain */}
          <Route 
            path="/auth" 
            element={
              <AuthPageWrapper>
                <Auth />
              </AuthPageWrapper>
            } 
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Root route - redirect unauthenticated users to login */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff', 'admin']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <TenantAdminDashboard />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard route - check for setup completion first */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff', 'admin']}>
                <SubscriptionGuard>
                  <TenantSetupCompletion />
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* Tenant Admin routes - all the same as main domain */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            path="/admin/customers" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff']}>
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
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Accounting />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Team />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <TenantCommunications />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* Advanced Customer Management Routes for Phase 8.5 */}
          <Route 
            path="/admin/customer-management" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <FeatureGuard featureName="advanced_customer_management">
                    <TenantAdminLayout>
                      <AdvancedCustomerManagementDashboard />
                    </TenantAdminLayout>
                  </FeatureGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* AI Routes for Phase 5 */}
          <Route 
            path="/admin/ai-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <FeatureGuard featureName="ai_features">
                    <TenantAdminLayout>
                      <AIDashboard />
                    </TenantAdminLayout>
                  </FeatureGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/ai-automation" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <FeatureGuard featureName="ai_features">
                    <TenantAdminLayout>
                      <AIAutomationRules />
                    </TenantAdminLayout>
                  </FeatureGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/ai-performance" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <FeatureGuard featureName="ai_features">
                    <TenantAdminLayout>
                      <AIPerformanceMetrics />
                    </TenantAdminLayout>
                  </FeatureGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* Advanced Analytics & Integrations Routes for Phase 7 */}
          <Route 
            path="/admin/advanced-analytics" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <FeatureGuard featureName="ai_features">
                    <TenantAdminLayout>
                      <AdvancedAnalyticsDashboard />
                    </TenantAdminLayout>
                  </FeatureGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/integrations" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <ExternalIntegrationsManager />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* Profile Route - accessible to all authenticated users */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff']}>
                <SubscriptionGuard>
                  <TenantAdminLayout>
                    <Profile />
                  </TenantAdminLayout>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* Mobile Cashier PWA Route */}
          <Route 
            path="/mobile" 
            element={
              <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff']}>
                <SubscriptionGuard>
                  <FeatureGuard featureName="mobile_offline">
                    <CashierPWA deviceId={`device_${Date.now()}`} tenantId={domainConfig.tenantId} />
                  </FeatureGuard>
                </SubscriptionGuard>
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback routes */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // This check is now handled above to prevent Auth component loading

  // Main domain routes (all existing routes)
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/tenant-redirect" element={<TenantRedirect />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/trial-signup" element={<TrialSignup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/success" element={<Success />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/company-info" element={<CompanyInfo />} />
        <Route path="/currency-debug" element={<CurrencyDebug />} />
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <TenantCommunications />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        
        {/* AI Routes for Phase 5 */}
        <Route 
          path="/admin/ai-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <FeatureGuard featureName="ai_features">
                  <TenantAdminLayout>
                    <AIDashboard />
                  </TenantAdminLayout>
                </FeatureGuard>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/ai-automation" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <FeatureGuard featureName="ai_features">
                  <TenantAdminLayout>
                    <AIAutomationRules />
                  </TenantAdminLayout>
                </FeatureGuard>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/ai-performance" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <FeatureGuard featureName="ai_features">
                  <TenantAdminLayout>
                    <AIPerformanceMetrics />
                  </TenantAdminLayout>
                </FeatureGuard>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        
        {/* Advanced Analytics & Integrations Routes for Phase 7 */}
        <Route 
          path="/admin/advanced-analytics" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <FeatureGuard featureName="ai_features">
                  <TenantAdminLayout>
                    <AdvancedAnalyticsDashboard />
                  </TenantAdminLayout>
                </FeatureGuard>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/integrations" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <ExternalIntegrationsManager />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        
        {/* Advanced Customer Management Routes for Phase 8.5 */}
        <Route 
          path="/admin/customer-management" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <FeatureGuard featureName="advanced_customer_management">
                  <TenantAdminLayout>
                    <AdvancedCustomerManagementDashboard />
                  </TenantAdminLayout>
                </FeatureGuard>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/sales" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Purchases />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/ar-ap" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <AccountsReceivablePayable />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/accounting" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager']}>
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
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff']}>
              <SubscriptionGuard>
                <TenantAdminLayout>
                  <Profile />
                </TenantAdminLayout>
              </SubscriptionGuard>
            </ProtectedRoute>
          } 
        />
        
        {/* Mobile Cashier PWA Route */}
        <Route 
          path="/mobile" 
          element={
            <ProtectedRoute allowedRoles={['Business Owner', 'Store Manager', 'Sales Staff']}>
              <SubscriptionGuard>
                <FeatureGuard featureName="mobile_offline">
                  <CashierPWA deviceId={`device_${Date.now()}`} tenantId={user?.tenant_id} />
                </FeatureGuard>
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

const App = () => {
  return (
    <ErrorBoundary>
      <TabStabilityProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
             <AppProvider>
               <TooltipProvider>
                 <>
                   <Toaster />
                   <Sonner />
                   <PerformanceMonitor />
                   <AppOptimizer />
                   <CookieConsent />
                   <DebugEnv />
                   <BrowserRouter>
                     <DomainRouter />
                   </BrowserRouter>
                 </>
               </TooltipProvider>
             </AppProvider>
          </AuthProvider>
        </QueryClientProvider>
      </TabStabilityProvider>
    </ErrorBoundary>
  );
};

export default App;