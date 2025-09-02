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
  return <DomainRouterComponent />;
};

const App = () => {
  return (
    <EnhancedErrorBoundary>
      <BrowserRouter>
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