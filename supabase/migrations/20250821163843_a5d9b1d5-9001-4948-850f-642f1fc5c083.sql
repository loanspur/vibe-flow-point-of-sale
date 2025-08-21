-- Check if enhanced role management tables exist and create them if needed

-- Create system_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(resource, action)
);

-- Create user_roles table if it doesn't exist (enhanced version)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    CREATE TABLE public.user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      level INTEGER DEFAULT 0,
      color TEXT DEFAULT '#6b7280',
      is_system_role BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      is_editable BOOLEAN DEFAULT true,
      permissions JSONB DEFAULT '{}',
      can_manage_users BOOLEAN DEFAULT false,
      can_manage_settings BOOLEAN DEFAULT false,
      can_view_reports BOOLEAN DEFAULT false,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE(tenant_id, name)
    );
  END IF;
END $$;

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.system_permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_role_assignments table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  assigned_by UUID,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id, tenant_id)
);

-- Insert basic system permissions if they don't exist
INSERT INTO public.system_permissions (name, description, resource, action, category, is_critical) VALUES
('view_dashboard', 'Access to main dashboard', 'dashboard', 'view', 'dashboard', false),
('create_products', 'Create new products', 'products', 'create', 'inventory', false),
('edit_products', 'Edit existing products', 'products', 'edit', 'inventory', false),
('delete_products', 'Delete products', 'products', 'delete', 'inventory', true),
('view_products', 'View products list', 'products', 'view', 'inventory', false),
('manage_categories', 'Manage product categories', 'categories', 'manage', 'inventory', false),
('view_sales', 'View sales data', 'sales', 'view', 'sales', false),
('create_sales', 'Create new sales', 'sales', 'create', 'sales', false),
('edit_sales', 'Edit sales records', 'sales', 'edit', 'sales', false),
('delete_sales', 'Delete sales records', 'sales', 'delete', 'sales', true),
('view_customers', 'View customer list', 'customers', 'view', 'customers', false),
('manage_customers', 'Create and edit customers', 'customers', 'manage', 'customers', false),
('view_reports', 'Access to reports', 'reports', 'view', 'reports', false),
('manage_users', 'User management access', 'users', 'manage', 'administration', true),
('manage_settings', 'System settings access', 'settings', 'manage', 'administration', true)
ON CONFLICT (resource, action) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_permissions (readable by authenticated users)
CREATE POLICY "System permissions are viewable by authenticated users" 
ON public.system_permissions FOR SELECT 
TO authenticated 
USING (true);

-- RLS Policies for user_roles (tenant-specific)
CREATE POLICY "User roles are viewable by tenant members" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage user roles" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() IN ('superadmin', 'admin')
);

-- RLS Policies for role_permissions
CREATE POLICY "Role permissions are viewable by tenant members" 
ON public.role_permissions FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.id = role_id AND ur.tenant_id = get_user_tenant_id()
  )
);

CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.id = role_id AND ur.tenant_id = get_user_tenant_id()
  ) AND get_current_user_role() IN ('superadmin', 'admin')
);

-- RLS Policies for user_role_assignments
CREATE POLICY "User role assignments are viewable by tenant members" 
ON public.user_role_assignments FOR SELECT 
TO authenticated 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage user role assignments" 
ON public.user_role_assignments FOR ALL 
TO authenticated 
USING (
  tenant_id = get_user_tenant_id() AND 
  get_current_user_role() IN ('superadmin', 'admin')
);