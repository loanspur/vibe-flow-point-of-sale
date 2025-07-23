import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { TenantAdminLayout } from "./components/TenantAdminLayout";
import PerformanceMonitor from "./components/PerformanceMonitor";
// Lazy load components for better performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Auth = lazy(() => import("./pages/Auth"));
const TrialSignup = lazy(() => import("./pages/TrialSignup"));
const Success = lazy(() => import("./pages/Success"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Dashboards
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const TenantAdminDashboard = lazy(() => import("./pages/TenantAdminDashboard"));
const ComprehensivePOS = lazy(() => import("./pages/ComprehensivePOS"));

// Admin Pages
const TenantManagement = lazy(() => import("./pages/TenantManagement"));
const Settings = lazy(() => import("./pages/Settings"));
const Products = lazy(() => import("./pages/Products"));
const Reports = lazy(() => import("./pages/Reports"));
const Team = lazy(() => import("./pages/Team"));
const Customers = lazy(() => import("./pages/Customers"));
const Sales = lazy(() => import("./pages/Sales"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Accounting = lazy(() => import("./pages/Accounting"));
const Profile = lazy(() => import("./pages/Profile"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
    <div className="text-center space-y-4">
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PerformanceMonitor />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
            <Route 
              path="/admin/sales" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier']}>
                  <TenantAdminLayout>
                    <Sales />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/purchases" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <Purchases />
                  </TenantAdminLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/accounting" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
                  <TenantAdminLayout>
                    <Accounting />
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
            
            {/* Profile Route - accessible to all authenticated users */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'cashier', 'user']}>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            
            {/* Fallback - redirect to appropriate dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><div /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;