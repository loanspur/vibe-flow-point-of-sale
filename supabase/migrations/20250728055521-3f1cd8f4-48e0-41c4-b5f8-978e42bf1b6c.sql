-- Create RLS policies for tenant_domains table
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Policy for users to view domains from their own tenant
CREATE POLICY "Users can view domains from their tenant" 
ON public.tenant_domains 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tu.tenant_id 
    FROM tenant_users tu 
    WHERE tu.user_id = auth.uid() 
    AND tu.is_active = true
  )
);

-- Policy for admins to insert domains for their tenant
CREATE POLICY "Admins can insert domains for their tenant" 
ON public.tenant_domains 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM tenant_users tu 
    WHERE tu.user_id = auth.uid() 
    AND tu.tenant_id = tenant_domains.tenant_id
    AND tu.role IN ('admin', 'owner')
    AND tu.is_active = true
  )
);

-- Policy for admins to update domains from their tenant
CREATE POLICY "Admins can update domains from their tenant" 
ON public.tenant_domains 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM tenant_users tu 
    WHERE tu.user_id = auth.uid() 
    AND tu.tenant_id = tenant_domains.tenant_id
    AND tu.role IN ('admin', 'owner')
    AND tu.is_active = true
  )
);

-- Policy for admins to delete domains from their tenant
CREATE POLICY "Admins can delete domains from their tenant" 
ON public.tenant_domains 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM tenant_users tu 
    WHERE tu.user_id = auth.uid() 
    AND tu.tenant_id = tenant_domains.tenant_id
    AND tu.role IN ('admin', 'owner')
    AND tu.is_active = true
  )
);

-- Super admin policy to manage all domains
CREATE POLICY "Super admins can manage all domains" 
ON public.tenant_domains 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'superadmin'
  )
);

-- Create policy for domain_verification_logs table
ALTER TABLE public.domain_verification_logs ENABLE ROW LEVEL SECURITY;

-- Policy for users to view verification logs for their tenant's domains
CREATE POLICY "Users can view verification logs for their tenant domains" 
ON public.domain_verification_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM tenant_domains td
    JOIN tenant_users tu ON td.tenant_id = tu.tenant_id
    WHERE td.id = domain_verification_logs.domain_id
    AND tu.user_id = auth.uid() 
    AND tu.is_active = true
  )
);

-- Policy for super admins to view all verification logs
CREATE POLICY "Super admins can view all verification logs" 
ON public.domain_verification_logs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'superadmin'
  )
);