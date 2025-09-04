# 🏠 Localhost Development Setup

This guide simplifies localhost development by removing complex domain resolution and routing logic.

## 🚀 Quick Setup

### 1. Configure Your Tenants

Edit `src/config/localhost.ts` and add your tenant IDs:

```typescript
export const LOCALHOST_TENANTS: Record<string, LocalhostTenant> = {
  'traction-energies': {
    id: 'your-actual-tenant-id-here', // Replace with real tenant ID
    name: 'Traction Energies',
    subdomain: 'traction-energies',
    status: 'active'
  },
  'walela-wines-spirits': {
    id: 'your-actual-tenant-id-here', // Replace with real tenant ID
    name: 'Walela Wines & Spirits',
    subdomain: 'walela-wines-spirits',
    status: 'active'
  }
};
```

### 2. Find Your Tenant IDs

Run this in your browser console to find available tenants:

```javascript
window.debugTenantLookup()
```

Or check your Supabase dashboard under the `tenants` table.

### 3. Test Your Setup

1. Start your development server: `npm run dev`
2. Visit `http://traction-energies.localhost:8080`
3. Check the console for localhost mode logs

## 🔧 Debug Commands

Available in browser console:

- `window.debugLocalhostTenants()` - List configured localhost tenants
- `window.debugAuthState()` - Show current auth state
- `window.debugTenantLookup()` - Test tenant database lookup

## 🎯 How It Works

### Simplified Flow:
1. **Localhost Detection** - Automatically detects `*.localhost` domains
2. **Direct Mapping** - Uses hardcoded tenant mapping instead of database queries
3. **No Complex Routing** - Bypasses debouncing and complex routing decisions
4. **Immediate Resolution** - No loading states or flickering

### What's Simplified:
- ✅ Removed complex domain resolution logic
- ✅ Removed debouncing and routing decisions
- ✅ Removed multiple fallback strategies
- ✅ Direct tenant ID mapping
- ✅ Faster loading and no flickering

## 🐛 Troubleshooting

### Issue: "No tenant found"
- Check that your tenant ID is correct in `src/config/localhost.ts`
- Verify the tenant exists in your Supabase database
- Run `window.debugTenantLookup()` to see available tenants

### Issue: Still seeing flickering
- Make sure you're using `*.localhost` domains
- Check that `import.meta.env.DEV` is true
- Clear browser cache and reload

### Issue: Auth errors
- Check that your Supabase environment variables are set
- Verify the tenant status is 'active' or 'trial'

## 🔄 Migration from Complex System

The simplified system:
- Uses `src/config/localhost.ts` for tenant mapping
- Bypasses `getCurrentDomainConfig()` complexity for localhost
- Removes routing decision state management
- Eliminates debouncing logic

This makes localhost development much faster and more reliable!


