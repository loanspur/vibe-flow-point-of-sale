# POS System Architecture Guide

## 🎯 New Simplified Structure

### Routes Overview
```
Public Routes:
├── / (Landing Page)
├── /auth (Login/Signup)
├── /signup (Trial Signup)
└── /success (Success Page)

Super Admin Routes:
├── /superadmin (Super Admin Dashboard)
└── /superadmin/tenants (Tenant Management)

Tenant Admin Routes:
├── /admin (Tenant Admin Dashboard)
├── /admin/products (Product Management)
├── /admin/reports (Reports)
├── /admin/team (Team Management)
├── /admin/customers (Customer Management)
└── /admin/settings (Business Settings)

POS Routes:
└── /pos (Point of Sale System)
```

### User Flow
1. **Super Admin**: Can switch between `/superadmin` (platform management) and `/admin` (tenant view)
2. **Tenant Admin/Manager**: Access `/admin` routes for business management
3. **Cashier/User**: Primarily use `/pos` for daily operations

### Key Components

#### ProtectedRoute
- Handles authentication checks
- Manages role-based access control
- Redirects users to appropriate dashboards
- Replaces the old DashboardRouter complexity

#### RoleSwitcher
- Allows superadmins to switch between platform and tenant views
- Automatically navigates to correct routes
- Clear visual indication of current view mode

### Authentication Context
- Simplified role management
- Clear separation of concerns
- Handles user profile fetching
- Manages view mode switching

## 🚀 Benefits of New Structure

1. **Predictable URLs**: Each feature has a clear, consistent route
2. **Role-Based Access**: Clean separation between user types
3. **Easier Navigation**: No more confusing route overlaps
4. **Better UX**: Users always know where they are
5. **Maintainable**: Each route maps to one specific component

## 🛠️ Development Guidelines

### Adding New Pages
1. Create your component in `/src/pages/`
2. Add route to `App.tsx` with appropriate `ProtectedRoute`
3. Update navigation components if needed

### Role Management
- Use `allowedRoles` prop in `ProtectedRoute`
- Super admins can access everything
- Tenant admins/managers get business features
- Cashiers/users get POS access

### Navigation
- Use React Router's `Link` or `useNavigate`
- Update `RoleSwitcher` if adding new dashboard types
- Keep URLs consistent with the established pattern