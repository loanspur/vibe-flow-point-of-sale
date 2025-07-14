-- Add user_id to contacts table for profile mapping
ALTER TABLE public.contacts 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add unique constraint to ensure one contact per user
ALTER TABLE public.contacts 
ADD CONSTRAINT unique_user_contact UNIQUE(user_id, tenant_id);

-- Add unique constraint for email within tenant to prevent duplicates
ALTER TABLE public.contacts 
ADD CONSTRAINT unique_email_per_tenant UNIQUE(email, tenant_id) 
DEFERRABLE INITIALLY DEFERRED;

-- Create index for better performance on user lookups
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id) WHERE user_id IS NOT NULL;

-- Create function to get current user's contact profile
CREATE OR REPLACE FUNCTION public.get_user_contact_profile()
RETURNS UUID AS $$
  SELECT id FROM public.contacts 
  WHERE user_id = auth.uid() 
  AND tenant_id = get_user_tenant_id()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create function to link user to contact
CREATE OR REPLACE FUNCTION public.link_user_to_contact(contact_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_tenant_id UUID;
  contact_tenant_id UUID;
BEGIN
  -- Get current user's tenant
  current_tenant_id := get_user_tenant_id();
  
  -- Get contact's tenant
  SELECT tenant_id INTO contact_tenant_id 
  FROM public.contacts 
  WHERE id = contact_id;
  
  -- Verify contact belongs to same tenant
  IF contact_tenant_id != current_tenant_id THEN
    RETURN FALSE;
  END IF;
  
  -- Update contact with user_id
  UPDATE public.contacts 
  SET user_id = auth.uid()
  WHERE id = contact_id 
  AND tenant_id = current_tenant_id
  AND user_id IS NULL; -- Only link if not already linked
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to include user-linked contacts
DROP POLICY IF EXISTS "Tenant managers can manage tenant contacts" ON public.contacts;
DROP POLICY IF EXISTS "Tenant users can view tenant contacts" ON public.contacts;

-- New RLS policies with user access
CREATE POLICY "Tenant managers can manage tenant contacts" 
ON public.contacts 
FOR ALL 
USING (
  (tenant_id = get_user_tenant_id()) AND 
  (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
);

CREATE POLICY "Tenant users can view tenant contacts" 
ON public.contacts 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view and update their own contact profile" 
ON public.contacts 
FOR ALL 
USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

-- Insert default sales rep contact types for existing tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN SELECT id FROM public.tenants WHERE is_active = true
    LOOP
        -- This is just a comment - we're not inserting default sales reps
        -- Sales reps will be created manually through the UI
    END LOOP;
END $$;