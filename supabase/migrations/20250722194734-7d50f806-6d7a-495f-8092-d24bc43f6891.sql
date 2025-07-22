-- Enable RLS on system_notes table with a simple policy
ALTER TABLE public.system_notes ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policy for system_notes - allow read access to all authenticated users
CREATE POLICY "Authenticated users can view system notes" 
ON public.system_notes 
FOR SELECT 
TO authenticated
USING (true);

-- Only allow superadmins to manage system notes
CREATE POLICY "Only superadmins can manage system notes" 
ON public.system_notes 
FOR ALL 
TO authenticated
USING (get_current_user_role() = 'superadmin'::user_role);