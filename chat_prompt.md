hook.js:608 The above error occurred in the <ProductsTab> component:

    at ProductsTab (http://traction-energies.localhost:5173/src/components/ProductsTab.tsx?t=1756916192906:52:22)
    at Suspense
    at SafeErrorBoundary (http://traction-energies.localhost:5173/src/components/SafeWrapper.tsx:85:9)
    at SafeWrapper (http://traction-energies.localhost:5173/src/components/SafeWrapper.tsx:91:31)
    at div
    at http://traction-energies.localhost:5173/node_modules/.vite/deps/chunk-AT6CSIJO.js?v=223a8e0b:43:13
    at Presence (http://traction-energies.localhost:5173/node_modules/.vite/deps/chunk-57TCVHD5.js?v=223a8e0b:24:11)
    at http://traction-energies.localhost:5173/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=223a8e0b:178:13
    at _c4 (http://traction-energies.localhost:5173/src/components/ui/tabs.tsx:47:61)
    at div
    at http://traction-energies.localhost:5173/node_modules/.vite/deps/chunk-AT6CSIJO.js?v=223a8e0b:43:13
    at Provider (http://traction-energies.localhost:5173/node_modules/.vite/deps/chunk-3RXG37ZK.js?v=223a8e0b:38:15)
    at http://traction-energies.localhost:5173/node_modules/.vite/deps/@radix-ui_react-tabs.js?v=223a8e0b:55:7
    at div
    at UnifiedProductManagement (http://traction-energies.localhost:5173/src/components/UnifiedProductManagement.tsx?t=1756916100188:40:44)
    at div
    at Products
    at RenderedRoute (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4088:5)
    at Outlet (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4494:26)
    at main
    at div
    at div
    at div
    at http://traction-energies.localhost:5173/src/components/ui/sidebar.tsx:49:72
    at TenantAdminLayout (http://traction-energies.localhost:5173/src/routes/TenantAdminLayout.tsx:34:31)
    at RenderedRoute (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4088:5)
    at Outlet (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4494:26)
    at SubscriptionGuard (http://traction-energies.localhost:5173/src/routes/SubscriptionGuard.tsx:33:54)
    at RenderedRoute (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4088:5)
    at Outlet (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4494:26)
    at ProtectedRoute (http://traction-energies.localhost:5173/src/routes/ProtectedRoute.tsx:26:27)
    at RenderedRoute (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4088:5)
    at Routes (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4558:5)
    at Suspense
    at DomainRouter
    at DomainRouter
    at AppOptimizer (http://traction-energies.localhost:5173/src/components/AppOptimizer.tsx:26:36)
    at Provider (http://traction-energies.localhost:5173/node_modules/.vite/deps/chunk-3RXG37ZK.js?v=223a8e0b:38:15)
    at TooltipProvider (http://traction-energies.localhost:5173/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=223a8e0b:65:5)
    at AppProvider (http://traction-energies.localhost:5173/src/contexts/AppContext.tsx:26:31)
    at AuthProvider (http://traction-energies.localhost:5173/src/contexts/AuthContext.tsx:41:32)
    at QueryClientProvider (http://traction-energies.localhost:5173/node_modules/.vite/deps/@tanstack_react-query.js?v=223a8e0b:2934:3)
    at TabStabilityProvider (http://traction-energies.localhost:5173/src/components/TabStabilityProvider.tsx:26:44)
    at Router (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:4501:15)
    at BrowserRouter (http://traction-energies.localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=223a8e0b:5247:5)
    at EnhancedErrorBoundary (http://traction-energies.localhost:5173/src/components/EnhancedErrorBoundary.tsx:101:5)
    at App

React will try to recreate this component tree from scratch using the error boundary you provided, SafeErrorBoundary.
SafeWrapper.tsx:24 🚨 Component Error Boundary Caught: ReferenceError: Label is not defined
    at ProductsTab (ProductsTab.tsx:403:20)
 
{componentStack: '\n    at ProductsTab (http://traction-energies.loca…nents/EnhancedErrorBoundary.tsx:101:5)\n    at App'}
 Error Component Stack
    at SafeErrorBoundary (SafeWrapper.tsx:15:5)
    at SafeWrapper (SafeWrapper.tsx:51:31)
    at div (<anonymous>)
    at _c4 (tabs.tsx:41:6)
    at div (<anonymous>)
    at UnifiedProductManagement (UnifiedProductManagement.tsx:26:85)
    at div (<anonymous>)
    at Products (<anonymous>)
    at sidebar.tsx:56:7
    at TenantAdminLayout (TenantAdminLayout.tsx:25:29)
    at SubscriptionGuard (SubscriptionGuard.tsx:19:52)
    at ProtectedRoute (ProtectedRoute.tsx:14:3)
    at AppOptimizer (AppOptimizer.tsx:8:73)
    at AppProvider (AppContext.tsx:61:31)
    at AuthProvider (AuthContext.tsx:45:32)
    at TabStabilityProvider (TabStabilityProvider.tsx:9:81)
    at EnhancedErrorBoundary (EnhancedErrorBoundary.tsx:28:5)
    at App (<anonymous>)
﻿

