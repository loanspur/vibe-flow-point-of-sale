import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardRouter from "./components/DashboardRouter";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import POSDashboard from "./pages/POSDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import TenantAdminDashboard from "./pages/TenantAdminDashboard";
import TenantManagement from "./pages/TenantManagement";
import TrialSignup from "./pages/TrialSignup";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<TrialSignup />} />
            <Route path="/success" element={<Success />} />
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/tenant-admin" element={<TenantAdminDashboard />} />
            <Route path="/pos" element={<POSDashboard />} />
            <Route path="/tenants" element={<TenantManagement />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
