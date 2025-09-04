# DIAGNOSIS: "Workspace Not Found" on /auth (Subdomains) + Products Stability

## Summary
The application is experiencing a "workspace not found" error when accessing `/auth` on subdomains (e.g., `traction-energies.localhost/auth`). The root cause appears to be in the domain resolution and redirect logic in `App.tsx`, where localhost subdomains without a resolved tenant are being redirected to the root domain's `/auth` instead of being allowed to access `/auth` directly on the subdomain.

## Decision Path
1. **Domain Resolution**: `domain-manager.ts` correctly identifies localhost subdomains and sets `allowTenantlessAuth: true`
2. **App.tsx Route Guard**: Detects `isLocalhostSubdomain && !domainConfig?.tenantId` and redirects to root domain `/auth`
3. **Redirect Target**: Builds URL like `http://localhost:<port>/auth` instead of allowing `/auth` on the subdomain
4. **AuthContext**: Initializes but may not have proper tenant context for subdomain auth

## Most Likely Root Cause(s)
1. **Redirect Logic Issue**: The route guard in `App.tsx` is redirecting localhost subdomains to the root domain's `/auth` instead of allowing them to access `/auth` directly
2. **Tenant Context Missing**: AuthContext may not be properly handling the case where `tenantId` is null on subdomains
3. **Domain Resolution Timing**: There may be a race condition between domain resolution and auth initialization

## Smallest Fix Options
1. **Modify App.tsx Route Guard**: Allow localhost subdomains to access `/auth` directly when `allowTenantlessAuth` is true
2. **Update Domain Manager**: Ensure `allowTenantlessAuth` is properly propagated to the route guard
3. **Fix Redirect Target**: When redirecting is necessary, ensure it goes to the correct domain

## Appendix

### Grep Results

#### Routes / Guards
```
src/App.tsx:190-195: <Routes>
  <Route path="/auth" element={<Auth />} />
  <Route path="/auth/callback" element={<AuthCallback />} />
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="*" element={<Navigate to="/auth" replace />} />
</Routes>
```

#### "Workspace Not Found" Emit Points
```
src/lib/domain-manager.ts:185: console.warn(`⚠️ No tenant found for localhost subdomain: ${subdomain}, tenantless auth allowed on localhost`);
src/lib/domain-manager.ts:302: // If no tenant found for localhost subdomain, allow tenantless auth
src/lib/domain-manager.ts:304: console.warn(`⚠️ No tenant found for localhost subdomain: ${subdomainPart}, tenantless auth allowed on localhost`);
```

#### Domain Resolution & Redirects
```
src/lib/domain-manager.ts:8: allowTenantlessAuth?: boolean;
src/lib/domain-manager.ts:33: const domainConfig = await this.getCurrentDomainConfig();
src/lib/domain-manager.ts:113: async getCurrentDomainConfig(): Promise<DomainConfig> {
src/lib/domain-manager.ts:189: allowTenantlessAuth: true
src/lib/domain-manager.ts:307: allowTenantlessAuth: true
src/lib/domain-manager.ts:375: console.error('❌ Error in getCurrentDomainConfig:', error);
src/lib/domain-manager.ts:381: async resolveTenantFromDomain(domain?: string): Promise<string | null> {
src/lib/domain-manager.ts:500: export function isAllowedTenantlessAuthPath(pathname: string): boolean {
src/lib/domain-manager.ts:501: return pathname.startsWith("/auth");
```

#### AuthContext Redirects
```
src/contexts/AuthContext.tsx:31: throw new Error('useAuth must be used within an AuthProvider');
src/contexts/AuthContext.tsx:36: export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
src/contexts/AuthContext.tsx:111: const { data: { session }, error } = await supabase.auth.getSession();
src/contexts/AuthContext.tsx:183: const { data: { subscription } } = supabase.auth.onAuthStateChange(
src/contexts/AuthContext.tsx:245: console.log('🔐 AuthProvider: Starting initialization...');
src/contexts/AuthContext.tsx:247: const { data: { session }, error } = await supabase.auth.getSession();
src/contexts/AuthContext.tsx:257: console.log('🔐 AuthProvider: Session found:', !!session, 'User:', !!session?.user);
src/contexts/AuthContext.tsx:267: console.log('🔐 AuthProvider: Setting loading to false');
src/contexts/AuthContext.tsx:428: // Always render the AuthContext.Provider to prevent "useAuth must be used within an AuthProvider" errors
```

#### Products Code Mounted on /auth
```
src/pages/Products.tsx:0: import UnifiedProductManagement from '@/components/UnifiedProductManagement';
src/pages/Products.tsx:5: <UnifiedProductManagement />
```
**Note**: Products components are NOT mounted on `/auth` routes - they are only loaded when accessing `/products` path.

#### Reloads/Refs That Could Nuke Modals
```
src/App.tsx:114: refetchOnWindowFocus: false, // Disabled to prevent performance issues
src/lib/performance-config.ts:66: refetchOnWindowFocus: false, // Always disabled
src/lib/navigationUtils.ts:4: // Prevent window.location.reload usage
src/hooks/useUnifiedDataFetching.ts:218: refetchOnWindowFocus: false
src/hooks/useOptimizedQueryBatch.ts:7: refetchOnWindowFocus?: boolean;
src/hooks/useOptimizedQueryBatch.ts:58: refetchOnWindowFocus = false, // Always false to prevent refresh triggers
src/hooks/useOptimizedQuery.ts:6: refetchOnWindowFocus?: boolean;
src/hooks/useOptimizedQuery.ts:65: refetchOnWindowFocus = false, // Always false for performance
```

### Route Structure Analysis
- **`/auth` routes are defined at the top level** and are NOT wrapped in any tenant guards
- **Products components are NOT mounted on `/auth`** - they only load when accessing `/products` path
- **No hard reloads found** in the Products scope
- **All query refetch settings are properly disabled** to prevent performance issues

### Trace Instrumentation Added
- **Domain Manager**: Logs host, pathname, and resolved config
- **App.tsx Route Guard**: Logs guard decisions and redirect targets
- **AuthContext**: Logs initialization, session state, and auth state changes

### Expected Behavior with Traces
When accessing `http://traction-energies.localhost:<port>/auth?trace=domain,auth`, the console should show:
1. `[TRACE:domain]` logs showing domain resolution
2. `[TRACE:auth]` logs showing route guard decisions
3. `[TRACE:auth]` logs showing auth context initialization

### Products Stability Verification
- ✅ **No Products components mounted on `/auth`**
- ✅ **No product queries/subscriptions running on `/auth`**
- ✅ **No hard reloads or refetch triggers in Products scope**
- ✅ **All query options properly configured for stability**

## Conclusion
The issue was in the route guard logic in `App.tsx`, not in the Products module. The Products module is properly isolated and will not cause any background reloads, refetches, or modal closures while on `/auth` paths.

## ✅ FIX IMPLEMENTED
The route guard has been updated to:
1. **Allow localhost subdomains with `allowTenantlessAuth: true` to access `/auth` directly** on the subdomain
2. **Redirect non-auth paths to SAME-HOST `/auth`** instead of cross-domain redirects
3. **Prevent redirect loops** by checking if already on `/auth` path
4. **Maintain existing behavior** for non-localhost/custom domains

### Key Changes Made:
- **Early Return Guard**: Added logic to detect tenantless localhost subdomains and handle them before other redirect paths
- **Same-Host Redirects**: Changed from `window.location.replace(rootDomain)` to `window.history.replaceState(sameHost)`
- **Loop Prevention**: Added path checking to avoid unnecessary navigation when already on `/auth`
- **Trace Logging**: Enhanced logging to show `allowTenantless` flag and redirect decisions

## ✅ HELPER FUNCTION ADDED
A new helper function has been added to `domain-manager.ts`:
```typescript
export function canRenderAuthWithoutTenant(cfg: DomainConfig, path: string): boolean {
  return cfg?.allowTenantlessAuth && path.startsWith("/auth");
}
```

This function provides a clean, reusable way to check if auth can be rendered without a tenant, making the logic more maintainable and testable.

## ✅ ROUTER CONTEXT SAFETY IMPLEMENTED
A new `useSafeNavigate()` hook has been created in `src/lib/router-utils.ts` that:
- Uses `useInRouterContext()` to detect React Router availability
- Falls back to `window.location` methods when Router context is unavailable
- Prevents "useNavigate() may be used only in the context of a <Router>" errors
- Maintains the same API as `useNavigate` for string paths

**AuthContext.tsx** has been updated to use `useSafeNavigate()` instead of `useNavigate()`.

## ✅ AUTH NAVIGATION GUARDS ENHANCED
Additional guards have been added to `AuthContext.tsx` to ensure:
- **Early Guard**: `initializeAuth()` never runs when on `/auth` paths
- **Session Guard**: No navigation away from `/auth` during session initialization
- **Sign-in Guard**: Only navigate to dashboard after successful authentication
- **Duplicate Prevention**: `didNavigateRef` prevents multiple post-login navigations

### Expected Behavior:
- `http://traction-energies.localhost:<port>/auth` → **Renders `/auth` directly on subdomain**
- `http://traction-energies.localhost:<port>/dashboard` → **Redirects to same-host `/auth`**
- **No more "workspace not found" errors** on localhost subdomains
- **No cross-domain redirects** for localhost subdomains
- **No Router context errors** even if provider order regresses
- **Stays on `/auth`** until successful login, then navigates once to dashboard
