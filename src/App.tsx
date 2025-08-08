import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDomainContext, isDevelopmentDomain } from "@/lib/domain-manager";
import ProtectedRoute from "./components/ProtectedRoute";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { FeatureGuard } from "./components/FeatureGuard";
import { TenantAdminLayout } from "./components/TenantAdminLayout";
import { SuperAdminLayout } from "./components/SuperAdminLayout";
import { StockManagement } from "./components/StockManagement";
import PerformanceMonitor from "./components/PerformanceMonitor";
import CookieConsent from "./components/CookieConsent";
import { PasswordChangeModal } from "./components/PasswordChangeModal";
import { AuthSessionFix } from "./components/AuthSessionFix";
import { supabase } from "@/integrations/supabase/client";

// Import critical components directly to avoid dynamic import failures
import LandingPage from "./pages/LandingPage";
const Auth = lazy(() => import("./pages/Auth"));
const CurrencyDebug = lazy(() => import("./pages/CurrencyDebug"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const TrialSignup = lazy(() => import("./pages/TrialSignup"));

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

// Auth page wrapper to redirect authenticated users on subdomains
const AuthPageWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  useEffect(() => {
    // If user is authenticated and on subdomain, redirect to dashboard
    if (user && window.location.hostname.includes('.vibenet.shop') && window.location.hostname !== 'vibenet.shop') {
      console.log('👤 User authenticated, redirecting from auth page to dashboard');
      window.location.replace('/dashboard');
    }
  }, [user]);
  
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
  console.log('🎯 DomainRouter component START');
  const { domainConfig, loading } = useDomainContext();
  const { user, loading: authLoading, userRole } = useAuth();
  
  console.log('🌐 DomainRouter DETAILED state:', { 
    domainConfig, 
    loading, 
    authLoading,
    user: !!user,
    userRole,
    pathname: window.location.pathname, 
    hostname: window.location.hostname 
  });
  
  console.log('🌐 DomainRouter state:', { 
    domainConfig, 
    loading, 
    pathname: window.location.pathname,
    hostname: window.location.hostname 
  });
  
  // Check for authentication session issues
  const [showAuthFix, setShowAuthFix] = useState(false);
  
  useEffect(() => {
    const checkAuthSession = async () => {
      console.log('🔍 Checking auth session...', { loading, user: !!user, tenantId: domainConfig?.tenantId });
      
      if (!loading && user && domainConfig?.tenantId) {
        try {
          console.log('🔐 Running debug_user_auth...');
          const { data: authData, error } = await supabase.rpc('debug_user_auth');
          console.log('🔐 Auth session check result:', { authData, error });
          
          if (error) {
            console.error('❌ Error checking auth session:', error);
            return;
          }
          
          if (authData && authData.length > 0 && !authData[0].auth_uid_result) {
            console.warn('🚨 Auth session broken - auth.uid() is null, showing fix dialog');
            setShowAuthFix(true);
          } else {
            console.log('✅ Auth session appears healthy');
            setShowAuthFix(false);
          }
        } catch (error) {
          console.error('❌ Failed to check auth session:', error);
        }
      }
    };

    checkAuthSession();
  }, [loading, domainConfig, user]);
  
  // CRITICAL: Check for unresolved subdomain FIRST before rendering any auth routes
  // This prevents infinite redirect loops on problematic subdomains like santalama.vibenet.shop
  if (domainConfig?.isSubdomain && !domainConfig.tenantId) {
    console.log('🚫 Unresolved subdomain detected, blocking auth routes and redirecting');
    
    // Force immediate redirect to prevent any React routing issues
    const targetUrl = 'https://vibenet.shop/dashboard';
    console.log('🔄 Executing redirect to:', targetUrl);
    window.location.replace(targetUrl);
    
    // Show loading message while redirecting - NEVER render Auth component
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Redirecting to main site...</p>
        </div>
      </div>
    );
  }

  // Render auth routes for valid domains only
  const currentPath = window.location.pathname;
  if (currentPath === '/auth' || currentPath === '/reset-password' || currentPath === '/forgot-password') {
    console.log('🔐 Rendering auth routes for valid domain');
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }
  
  if (loading) {
    console.log('⏳ Domain loading, showing page loader...');
    return <PageLoader />;
  }
  
  console.log('🔍 CRITICAL DEBUG - Post domain loading check:', {
    loading,
    authLoading,
    user: !!user,
    userRole,
    showAuthFix,
    domainConfig
  });
  
  console.log('🎯 About to render tenant routes. Domain config:', domainConfig);

  // Show auth session fix if needed
  if (showAuthFix) {
    console.log('🔧 Displaying AuthSessionFix component');
    return <AuthSessionFix />;
  }
  
  console.log('🎯 Proceeding to normal routing, showAuthFix:', showAuthFix);

  // If on subdomain, show tenant-specific routes only
  if (domainConfig?.isSubdomain && domainConfig.tenantId) {
    console.log('🏢 Rendering tenant-specific routes for subdomain');
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
          
          {/* Dashboard route - same as root for subdomains */}
          <Route 
            path="/dashboard" 
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
          
          {/* Fallback routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
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
        <Route path="/reset-password" element={<ResetPassword />} />
        
        
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
        
        {/* Fallback - redirect to appropriate dashboard */}
        <Route path="/dashboard" element={<ProtectedRoute><div /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  console.log('🚀 APP COMPONENT RENDER START');
  
  return (
    <QueryClientProvider client={queryClient}>
      {(() => {
        console.log('🔄 QueryClientProvider rendered');
        return (
          <AuthProvider>
            {(() => {
              console.log('🔐 AuthProvider rendered');
              return (
                <AppProvider>
                  {(() => {
                    console.log('📱 AppProvider rendered');
                    return (
                      <TooltipProvider>
                        {(() => {
                          console.log('💡 TooltipProvider rendered');
                          return (
                            <>
                              <Toaster />
                              <Sonner />
                              <PerformanceMonitor />
                              <CookieConsent />
                              <PasswordChangeModal />
                              <BrowserRouter>
                                {(() => {
                                  console.log('🌐 BrowserRouter rendered - about to render DomainRouter');
                                  return <DomainRouter />;
                                })()}
                              </BrowserRouter>
                            </>
                          );
                        })()}
                      </TooltipProvider>
                    );
                  })()}
                </AppProvider>
              );
            })()}
          </AuthProvider>
        );
      })()}
    </QueryClientProvider>
  );
};

export default App;