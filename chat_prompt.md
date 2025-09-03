⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition. Error Component Stack
    at BrowserRouter (react-router-dom.js?v=223a8e0b:5247:5)
    at EnhancedErrorBoundary (EnhancedErrorBoundary.tsx:28:5)
    at App (<anonymous>)
overrideMethod @ hook.js:608
warnOnce @ react-router-dom.js?v=223a8e0b:4393
logDeprecation @ react-router-dom.js?v=223a8e0b:4396
logV6DeprecationWarnings @ react-router-dom.js?v=223a8e0b:4399
(anonymous) @ react-router-dom.js?v=223a8e0b:5271
commitHookEffectListMount @ chunk-276SZO74.js?v=223a8e0b:16915
commitPassiveMountOnFiber @ chunk-276SZO74.js?v=223a8e0b:18156
commitPassiveMountEffects_complete @ chunk-276SZO74.js?v=223a8e0b:18129
commitPassiveMountEffects_begin @ chunk-276SZO74.js?v=223a8e0b:18119
commitPassiveMountEffects @ chunk-276SZO74.js?v=223a8e0b:18109
flushPassiveEffectsImpl @ chunk-276SZO74.js?v=223a8e0b:19490
flushPassiveEffects @ chunk-276SZO74.js?v=223a8e0b:19447
performSyncWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18868
flushSyncCallbacks @ chunk-276SZO74.js?v=223a8e0b:9119
commitRootImpl @ chunk-276SZO74.js?v=223a8e0b:19432
commitRoot @ chunk-276SZO74.js?v=223a8e0b:19277
finishConcurrentRender @ chunk-276SZO74.js?v=223a8e0b:18805
performConcurrentWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18718
workLoop @ chunk-276SZO74.js?v=223a8e0b:197
flushWork @ chunk-276SZO74.js?v=223a8e0b:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=223a8e0b:384Understand this warning
hook.js:608 ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath. Error Component Stack
    at BrowserRouter (react-router-dom.js?v=223a8e0b:5247:5)
    at EnhancedErrorBoundary (EnhancedErrorBoundary.tsx:28:5)
    at App (<anonymous>)
overrideMethod @ hook.js:608
warnOnce @ react-router-dom.js?v=223a8e0b:4393
logDeprecation @ react-router-dom.js?v=223a8e0b:4396
logV6DeprecationWarnings @ react-router-dom.js?v=223a8e0b:4402
(anonymous) @ react-router-dom.js?v=223a8e0b:5271
commitHookEffectListMount @ chunk-276SZO74.js?v=223a8e0b:16915
commitPassiveMountOnFiber @ chunk-276SZO74.js?v=223a8e0b:18156
commitPassiveMountEffects_complete @ chunk-276SZO74.js?v=223a8e0b:18129
commitPassiveMountEffects_begin @ chunk-276SZO74.js?v=223a8e0b:18119
commitPassiveMountEffects @ chunk-276SZO74.js?v=223a8e0b:18109
flushPassiveEffectsImpl @ chunk-276SZO74.js?v=223a8e0b:19490
flushPassiveEffects @ chunk-276SZO74.js?v=223a8e0b:19447
performSyncWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18868
flushSyncCallbacks @ chunk-276SZO74.js?v=223a8e0b:9119
commitRootImpl @ chunk-276SZO74.js?v=223a8e0b:19432
commitRoot @ chunk-276SZO74.js?v=223a8e0b:19277
finishConcurrentRender @ chunk-276SZO74.js?v=223a8e0b:18805
performConcurrentWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18718
workLoop @ chunk-276SZO74.js?v=223a8e0b:197
flushWork @ chunk-276SZO74.js?v=223a8e0b:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=223a8e0b:384Understand this warning
AppContext.tsx:106 Real-time business settings updates disabled to prevent currency switching
ProductsTab.tsx:69 Uncaught ReferenceError: Cannot access 'debouncedSearchQuery' before initialization
    at ProductsTab (ProductsTab.tsx:69:17)
    at renderWithHooks (chunk-276SZO74.js?v=223a8e0b:11548:26)
    at mountIndeterminateComponent (chunk-276SZO74.js?v=223a8e0b:14926:21)
    at beginWork (chunk-276SZO74.js?v=223a8e0b:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-276SZO74.js?v=223a8e0b:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-276SZO74.js?v=223a8e0b:3699:24)
    at invokeGuardedCallback (chunk-276SZO74.js?v=223a8e0b:3733:39)
    at beginWork$1 (chunk-276SZO74.js?v=223a8e0b:19765:15)
    at performUnitOfWork (chunk-276SZO74.js?v=223a8e0b:19198:20)
    at workLoopConcurrent (chunk-276SZO74.js?v=223a8e0b:19189:13)
ProductsTab @ ProductsTab.tsx:69
renderWithHooks @ chunk-276SZO74.js?v=223a8e0b:11548
mountIndeterminateComponent @ chunk-276SZO74.js?v=223a8e0b:14926
beginWork @ chunk-276SZO74.js?v=223a8e0b:15914
callCallback2 @ chunk-276SZO74.js?v=223a8e0b:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=223a8e0b:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=223a8e0b:3733
beginWork$1 @ chunk-276SZO74.js?v=223a8e0b:19765
performUnitOfWork @ chunk-276SZO74.js?v=223a8e0b:19198
workLoopConcurrent @ chunk-276SZO74.js?v=223a8e0b:19189
renderRootConcurrent @ chunk-276SZO74.js?v=223a8e0b:19164
performConcurrentWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18678
workLoop @ chunk-276SZO74.js?v=223a8e0b:197
flushWork @ chunk-276SZO74.js?v=223a8e0b:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=223a8e0b:384Understand this error
ProductsTab.tsx:69 Uncaught ReferenceError: Cannot access 'debouncedSearchQuery' before initialization
    at ProductsTab (ProductsTab.tsx:69:17)
    at renderWithHooks (chunk-276SZO74.js?v=223a8e0b:11548:26)
    at mountIndeterminateComponent (chunk-276SZO74.js?v=223a8e0b:14926:21)
    at beginWork (chunk-276SZO74.js?v=223a8e0b:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-276SZO74.js?v=223a8e0b:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-276SZO74.js?v=223a8e0b:3699:24)
    at invokeGuardedCallback (chunk-276SZO74.js?v=223a8e0b:3733:39)
    at beginWork$1 (chunk-276SZO74.js?v=223a8e0b:19765:15)
    at performUnitOfWork (chunk-276SZO74.js?v=223a8e0b:19198:20)
    at workLoopSync (chunk-276SZO74.js?v=223a8e0b:19137:13)
ProductsTab @ ProductsTab.tsx:69
renderWithHooks @ chunk-276SZO74.js?v=223a8e0b:11548
mountIndeterminateComponent @ chunk-276SZO74.js?v=223a8e0b:14926
beginWork @ chunk-276SZO74.js?v=223a8e0b:15914
callCallback2 @ chunk-276SZO74.js?v=223a8e0b:3674
invokeGuardedCallbackDev @ chunk-276SZO74.js?v=223a8e0b:3699
invokeGuardedCallback @ chunk-276SZO74.js?v=223a8e0b:3733
beginWork$1 @ chunk-276SZO74.js?v=223a8e0b:19765
performUnitOfWork @ chunk-276SZO74.js?v=223a8e0b:19198
workLoopSync @ chunk-276SZO74.js?v=223a8e0b:19137
renderRootSync @ chunk-276SZO74.js?v=223a8e0b:19116
recoverFromConcurrentError @ chunk-276SZO74.js?v=223a8e0b:18736
performConcurrentWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18684
workLoop @ chunk-276SZO74.js?v=223a8e0b:197
flushWork @ chunk-276SZO74.js?v=223a8e0b:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=223a8e0b:384Understand this error
hook.js:608 The above error occurred in the <ProductsTab> component:

    at ProductsTab (http://traction-energies.localhost:5173/src/components/ProductsTab.tsx?t=1756915718422:52:22)
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
    at UnifiedProductManagement (http://traction-energies.localhost:5173/src/components/UnifiedProductManagement.tsx?t=1756915718422:40:44)
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
overrideMethod @ hook.js:608
logCapturedError @ chunk-276SZO74.js?v=223a8e0b:14032
callback @ chunk-276SZO74.js?v=223a8e0b:14078
callCallback @ chunk-276SZO74.js?v=223a8e0b:11248
commitUpdateQueue @ chunk-276SZO74.js?v=223a8e0b:11265
commitLayoutEffectOnFiber @ chunk-276SZO74.js?v=223a8e0b:17075
commitLayoutMountEffects_complete @ chunk-276SZO74.js?v=223a8e0b:17980
commitLayoutEffects_begin @ chunk-276SZO74.js?v=223a8e0b:17969
commitLayoutEffects_begin @ chunk-276SZO74.js?v=223a8e0b:17950
commitLayoutEffects @ chunk-276SZO74.js?v=223a8e0b:17920
commitRootImpl @ chunk-276SZO74.js?v=223a8e0b:19353
commitRoot @ chunk-276SZO74.js?v=223a8e0b:19277
finishConcurrentRender @ chunk-276SZO74.js?v=223a8e0b:18760
performConcurrentWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18718
workLoop @ chunk-276SZO74.js?v=223a8e0b:197
flushWork @ chunk-276SZO74.js?v=223a8e0b:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=223a8e0b:384Understand this error
SafeWrapper.tsx:24 🚨 Component Error Boundary Caught: ReferenceError: Cannot access 'debouncedSearchQuery' before initialization
    at ProductsTab (ProductsTab.tsx:69:17)
    at renderWithHooks (chunk-276SZO74.js?v=223a8e0b:11548:26)
    at mountIndeterminateComponent (chunk-276SZO74.js?v=223a8e0b:14926:21)
    at beginWork (chunk-276SZO74.js?v=223a8e0b:15914:22)
    at beginWork$1 (chunk-276SZO74.js?v=223a8e0b:19753:22)
    at performUnitOfWork (chunk-276SZO74.js?v=223a8e0b:19198:20)
    at workLoopSync (chunk-276SZO74.js?v=223a8e0b:19137:13)
    at renderRootSync (chunk-276SZO74.js?v=223a8e0b:19116:15)
    at recoverFromConcurrentError (chunk-276SZO74.js?v=223a8e0b:18736:28)
    at performConcurrentWorkOnRoot (chunk-276SZO74.js?v=223a8e0b:18684:30) {componentStack: '\n    at ProductsTab (http://traction-energies.loca…nents/EnhancedErrorBoundary.tsx:101:5)\n    at App'} Error Component Stack
    at SafeErrorBoundary (SafeWrapper.tsx:15:5)
    at SafeWrapper (SafeWrapper.tsx:51:31)
    at div (<anonymous>)
    at chunk-AT6CSIJO.js?v=223a8e0b:43:13
    at Presence (chunk-57TCVHD5.js?v=223a8e0b:24:11)
    at @radix-ui_react-tabs.js?v=223a8e0b:178:13
    at _c4 (tabs.tsx:41:6)
    at div (<anonymous>)
    at chunk-AT6CSIJO.js?v=223a8e0b:43:13
    at Provider (chunk-3RXG37ZK.js?v=223a8e0b:38:15)
    at @radix-ui_react-tabs.js?v=223a8e0b:55:7
    at div (<anonymous>)
    at UnifiedProductManagement (UnifiedProductManagement.tsx:26:85)
    at div (<anonymous>)
    at Products (<anonymous>)
    at RenderedRoute (react-router-dom.js?v=223a8e0b:4088:5)
    at Outlet (react-router-dom.js?v=223a8e0b:4494:26)
    at main (<anonymous>)
    at div (<anonymous>)
    at div (<anonymous>)
    at div (<anonymous>)
    at sidebar.tsx:56:7
    at TenantAdminLayout (TenantAdminLayout.tsx:25:29)
    at RenderedRoute (react-router-dom.js?v=223a8e0b:4088:5)
    at Outlet (react-router-dom.js?v=223a8e0b:4494:26)
    at SubscriptionGuard (SubscriptionGuard.tsx:19:52)
    at RenderedRoute (react-router-dom.js?v=223a8e0b:4088:5)
    at Outlet (react-router-dom.js?v=223a8e0b:4494:26)
    at ProtectedRoute (ProtectedRoute.tsx:14:3)
    at RenderedRoute (react-router-dom.js?v=223a8e0b:4088:5)
    at Routes (react-router-dom.js?v=223a8e0b:4558:5)
    at Suspense (<anonymous>)
    at DomainRouter (<anonymous>)
    at DomainRouter (<anonymous>)
    at AppOptimizer (AppOptimizer.tsx:8:73)
    at Provider (chunk-3RXG37ZK.js?v=223a8e0b:38:15)
    at TooltipProvider (@radix-ui_react-tooltip.js?v=223a8e0b:65:5)
    at AppProvider (AppContext.tsx:61:31)
    at AuthProvider (AuthContext.tsx:45:32)
    at QueryClientProvider (@tanstack_react-query.js?v=223a8e0b:2934:3)
    at TabStabilityProvider (TabStabilityProvider.tsx:9:81)
    at Router (react-router-dom.js?v=223a8e0b:4501:15)
    at BrowserRouter (react-router-dom.js?v=223a8e0b:5247:5)
    at EnhancedErrorBoundary (EnhancedErrorBoundary.tsx:28:5)
    at App (<anonymous>)
overrideMethod @ hook.js:608
componentDidCatch @ SafeWrapper.tsx:24
callback @ chunk-276SZO74.js?v=223a8e0b:14084
callCallback @ chunk-276SZO74.js?v=223a8e0b:11248
commitUpdateQueue @ chunk-276SZO74.js?v=223a8e0b:11265
commitLayoutEffectOnFiber @ chunk-276SZO74.js?v=223a8e0b:17075
commitLayoutMountEffects_complete @ chunk-276SZO74.js?v=223a8e0b:17980
commitLayoutEffects_begin @ chunk-276SZO74.js?v=223a8e0b:17969
commitLayoutEffects_begin @ chunk-276SZO74.js?v=223a8e0b:17950
commitLayoutEffects @ chunk-276SZO74.js?v=223a8e0b:17920
commitRootImpl @ chunk-276SZO74.js?v=223a8e0b:19353
commitRoot @ chunk-276SZO74.js?v=223a8e0b:19277
finishConcurrentRender @ chunk-276SZO74.js?v=223a8e0b:18760
performConcurrentWorkOnRoot @ chunk-276SZO74.js?v=223a8e0b:18718
workLoop @ chunk-276SZO74.js?v=223a8e0b:197
flushWork @ chunk-276SZO74.js?v=223a8e0b:176
performWorkUntilDeadline @ chunk-276SZO74.js?v=223a8e0b:384Understand this error
useTenantProductsList.ts:72 [products:list] loaded locations: {c78b14a5-a671-4e95-9a84-201b9d212dad: 'Bungoma shop', c3cf5263-fdb4-41eb-88a2-d1cbaed43ab0: 'Nairobi Branch'}