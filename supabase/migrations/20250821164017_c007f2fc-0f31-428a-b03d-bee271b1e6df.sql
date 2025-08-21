-- Create enhanced role management tables without conflicting enum inserts

-- Create system_permissions table 
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

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.system_permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_role_assignments table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  assigned_by UUID,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deactivated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.system_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_permissions (readable by authenticated users)
CREATE POLICY "System permissions are viewable by authenticated users" 
ON public.system_permissions FOR SELECT 
TO authenticated 
USING (true);

-- RLS Policies for role_permissions
CREATE POLICY "Role permissions are viewable by tenant members" 
ON public.role_permissions FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_users tu 
    WHERE tu.user_id = auth.uid() AND tu.is_active = true
  )
);

CREATE POLICY "Admins can manage role permissions" 
ON public.role_permissions FOR ALL 
TO authenticated 
USING (
  get_current_user_role() IN ('superadmin', 'admin')
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