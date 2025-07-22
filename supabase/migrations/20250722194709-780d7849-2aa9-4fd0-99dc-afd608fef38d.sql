-- Enable RLS on system_notes table
ALTER TABLE public.system_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for system_notes (assuming it should be readable by all tenant users)
CREATE POLICY "Tenant users can view system notes" 
ON public.system_notes 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage system notes" 
ON public.system_notes 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));