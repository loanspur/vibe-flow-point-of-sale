import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './ProtectedRoute';
import { SubscriptionGuard } from './SubscriptionGuard';
import { TenantAdminLayout } from './TenantAdminLayout';
import { SuperAdminLayout } from './SuperAdminLayout';

// AUTH pages (public)
const Auth = lazy(() => import('@/pages/Auth'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));

// SUPER ADMIN pages (auth-only, not tenant-bound)
const SuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard'));
const SuperAdminTenantManagement = lazy(() => import('../pages/TenantManagement'));
const SuperAdminUserManagement = lazy(() => import('../pages/SuperAdminUserManagement'));
const SuperAdminAnalytics = lazy(() => import('../pages/SuperAdminAnalytics'));
const SuperAdminRevenue = lazy(() => import('../pages/SuperAdminRevenue'));
const SuperAdminPlanManagement = lazy(() => import('../pages/SuperAdminPlanManagement'));
const SuperAdminSystemHealth = lazy(() => import('../pages/SuperAdminSystemHealth'));
const SuperAdminDatabase = lazy(() => import('../pages/SuperAdminDatabase'));
const SuperAdminSecurity = lazy(() => import('../pages/SuperAdminSecurity'));
const SuperAdminCommunications = lazy(() => import('../pages/SuperAdminCommunications'));
const SuperAdminSettings = lazy(() => import('../pages/SuperAdminSettings'));

// ADMIN pages (private)
const TenantAdminDashboard = lazy(() => import('../pages/TenantAdminDashboard'));
const Products = lazy(() => import('../pages/Products'));
const Customers = lazy(() => import('../pages/Customers'));
const Sales = lazy(() => import('../pages/Sales'));
const Purchases = lazy(() => import('../pages/Purchases'));
const Accounting = lazy(() => import('../pages/Accounting'));
const Reports = lazy(() => import('../pages/Reports'));
const Settings = lazy(() => import('../pages/Settings'));
const Team = lazy(() => import('../pages/Team'));
const Communications = lazy(() => import('../pages/Communications'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

export default function DomainRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* PUBLIC AUTH */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* SUPER ADMIN (auth-only, NOT tenant-bound) */}
        <Route element={<ProtectedRoute requireAuth={true} />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/tenants" element={<SuperAdminTenantManagement />} />
            <Route path="/superadmin/users" element={<SuperAdminUserManagement />} />
            <Route path="/superadmin/analytics" element={<SuperAdminAnalytics />} />
            <Route path="/superadmin/revenue" element={<SuperAdminRevenue />} />
            <Route path="/superadmin/plans" element={<SuperAdminPlanManagement />} />
            <Route path="/superadmin/system" element={<SuperAdminSystemHealth />} />
            <Route path="/superadmin/database" element={<SuperAdminDatabase />} />
            <Route path="/superadmin/security" element={<SuperAdminSecurity />} />
            <Route path="/superadmin/communications" element={<SuperAdminCommunications />} />
            <Route path="/superadmin/settings" element={<SuperAdminSettings />} />
          </Route>
        </Route>

        {/* TENANT ADMIN (auth + subscription + tenant layout) */}
        <Route element={<ProtectedRoute requireAuth={true} />}>
          <Route element={<SubscriptionGuard />}>
            <Route element={<TenantAdminLayout />}>
              <Route path="/admin" element={<TenantAdminDashboard />} />
              <Route path="/admin/dashboard" element={<TenantAdminDashboard />} />
              <Route path="/admin/products" element={<Products />} />
              <Route path="/admin/customers" element={<Customers />} />
              <Route path="/admin/sales" element={<Sales />} />
              <Route path="/admin/purchases" element={<Purchases />} />
              <Route path="/admin/accounting" element={<Accounting />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/team" element={<Team />} />
              <Route path="/admin/communications" element={<Communications />} />
            </Route>
          </Route>
        </Route>

        {/* DEFAULTS */}
        <Route path="/" element={<Navigate to="/auth" replace />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Suspense>
  );
}
