-- Create contacts table for customers and suppliers
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('customer', 'supplier')),
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for contacts
CREATE POLICY "Tenant users can view tenant contacts" 
ON public.contacts 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage tenant contacts" 
ON public.contacts 
FOR ALL 
USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();