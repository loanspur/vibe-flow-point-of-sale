import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import { EnhancedErrorBoundary } from "./components/EnhancedErrorBoundary";
import { TabStabilityProvider } from "./components/TabStabilityProvider";
import { GlobalErrorHandler } from "./components/GlobalErrorHandler";
import { AppOptimizer } from "./components/AppOptimizer";
import CookieConsent from "./components/CookieConsent";
import DomainRouterComponent from "./routes/DomainRouter";

// TypeScript declaration for global debug flag
declare global {
  interface Window {
    __DEBUG__?: boolean;
  }
}

// Global debug flag to gate noisy console logs
if (typeof window !== 'undefined') {
  window.__DEBUG__ ??= false;
}

// Optimized query client configuration for better performance with tab stability
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000, // 15 seconds - increased for better stability
      gcTime: 10 * 60 * 1000, // 10 minutes - increased for better cache retention
      retry: 1,
      refetchOnWindowFocus: false, // Disabled to prevent performance issues
      refetchOnMount: false, // Disabled to prevent unnecessary refetches
      refetchOnReconnect: false, // Disabled to prevent network spam
      // Custom refetch condition that respects tab stability
      queryFn: undefined, // Will be set per query
    },
    mutations: {
      retry: 1, // Limit mutation retries
      retryDelay: 1000, // Wait 1 second before retry
    },
  },
});

const DomainRouter = () => {
  return <DomainRouterComponent />;
};

const App = () => {
  return (
    <EnhancedErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TabStabilityProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
             <AppProvider>
               <TooltipProvider>
                 <>
                   <GlobalErrorHandler />
                   <Toaster />
                   <Sonner />
                   <AppOptimizer>
                     <DomainRouter />
                   </AppOptimizer>
                   <CookieConsent />
                 </>
               </TooltipProvider>
             </AppProvider>
          </AuthProvider>
        </QueryClientProvider>
      </TabStabilityProvider>
      </BrowserRouter>
    </EnhancedErrorBoundary>
  );
};

export default App;