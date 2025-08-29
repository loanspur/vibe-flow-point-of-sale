Tab stability provider disabled to prevent refresh triggers
AppOptimizer.tsx:10 App optimizer disabled to prevent refresh triggers
domain-manager.ts:441 🌐 Initializing domain context for: walela.wines.spirits.localhost
AppContext.tsx:262 Real-time business settings updates disabled to prevent currency switching
domain-manager.ts:211 ✅ Tenant resolved: null
domain-manager.ts:444 🔍 Domain config resolved: {tenantId: null, domain: 'walela.wines.spirits.localhost', isCustomDomain: true, isSubdomain: false}
2chunk-ZMLY2J2T.js?v=04b66c49:903 Uncaught SyntaxError: The requested module '/src/components/CustomerStatement.tsx?t=1756386728419' does not provide an export named 'CustomerStatement' (at ContactManagement.tsx:21:10)Understand this error
hook.js:608 The above error occurred in one of your React components:

    at Lazy
    at main
    at div
    at div
    at div
    at Provider (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/chunk-XSD2Y4RK.js?v=04b66c49:38:15)
    at TooltipProvider (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=04b66c49:63:5)
    at http://walela.wines.spirits.localhost:8080/src/components/ui/sidebar.tsx:50:72
    at TenantAdminLayout (http://walela.wines.spirits.localhost:8080/src/components/TenantAdminLayout.tsx?t=1756389619536:33:37)
    at SubscriptionGuard (http://walela.wines.spirits.localhost:8080/src/components/SubscriptionGuard.tsx?t=1756383474962:29:37)
    at ProtectedRoute (http://walela.wines.spirits.localhost:8080/src/components/ProtectedRoute.tsx?t=1756383474962:25:27)
    at RenderedRoute (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=04b66c49:4069:5)
    at Routes (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=04b66c49:4508:5)
    at Suspense
    at DomainRouter (http://walela.wines.spirits.localhost:8080/src/App.tsx?t=1756390305071:229:39)
    at Router (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=04b66c49:4451:15)
    at BrowserRouter (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/react-router-dom.js?v=04b66c49:5196:5)
    at AppOptimizer (http://walela.wines.spirits.localhost:8080/src/components/AppOptimizer.tsx?t=1756383170803:25:36)
    at Provider (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/chunk-XSD2Y4RK.js?v=04b66c49:38:15)
    at TooltipProvider (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/@radix-ui_react-tooltip.js?v=04b66c49:63:5)
    at AppProvider (http://walela.wines.spirits.localhost:8080/src/contexts/AppContext.tsx?t=1756383529122:31:31)
    at AuthProvider (http://walela.wines.spirits.localhost:8080/src/contexts/AuthContext.tsx?t=1756383474962:37:32)
    at QueryClientProvider (http://walela.wines.spirits.localhost:8080/node_modules/.vite/deps/@tanstack_react-query.js?v=04b66c49:2794:3)
    at TabStabilityProvider (http://walela.wines.spirits.localhost:8080/src/components/TabStabilityProvider.tsx?t=1756383137504:25:44)
    at EnhancedErrorBoundary (http://walela.wines.spirits.localhost:8080/src/components/EnhancedErrorBoundary.tsx?t=1756378058088:108:5)
    at App

React will try to recreate this component tree from scratch using the error boundary you provided, EnhancedErrorBoundary.
overrideMethod @ hook.js:608
logCapturedError @ chunk-W6L2VRDA.js?v=04b66c49:14032
callback @ chunk-W6L2VRDA.js?v=04b66c49:14078
callCallback @ chunk-W6L2VRDA.js?v=04b66c49:11248
commitUpdateQueue @ chunk-W6L2VRDA.js?v=04b66c49:11265
commitLayoutEffectOnFiber @ chunk-W6L2VRDA.js?v=04b66c49:17075
commitLayoutMountEffects_complete @ chunk-W6L2VRDA.js?v=04b66c49:17980
commitLayoutEffects_begin @ chunk-W6L2VRDA.js?v=04b66c49:17969
commitLayoutEffects @ chunk-W6L2VRDA.js?v=04b66c49:17920
commitRootImpl @ chunk-W6L2VRDA.js?v=04b66c49:19353
commitRoot @ chunk-W6L2VRDA.js?v=04b66c49:19277
finishConcurrentRender @ chunk-W6L2VRDA.js?v=04b66c49:18760
performConcurrentWorkOnRoot @ chunk-W6L2VRDA.js?v=04b66c49:18718
workLoop @ chunk-W6L2VRDA.js?v=04b66c49:197
flushWork @ chunk-W6L2VRDA.js?v=04b66c49:176
performWorkUntilDeadline @ chunk-W6L2VRDA.js?v=04b66c49:384Understand this error
EnhancedErrorBoundary.tsx:46 EnhancedErrorBoundary caught an error: SyntaxError: The requested module '/src/components/CustomerStatement.tsx?t=1756386728419' does not provide an export named 'CustomerStatement' (at ContactManagement.tsx:21:10) {componentStack: '\n    at Lazy\n    at main\n    at div\n    at div\n   …rorBoundary.tsx?t=1756378058088:108:5)\n    at App'} Error Component Stack
    at EnhancedErrorBoundary (EnhancedErrorBoundary.tsx:28:5)
    at App (<anonymous>)