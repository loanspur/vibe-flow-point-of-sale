-- Create domain management tables for multi-tenant custom domains

-- Domain types enum
CREATE TYPE domain_type AS ENUM ('subdomain', 'custom_domain');

-- Domain verification status enum  
CREATE TYPE domain_status AS ENUM ('pending', 'verifying', 'verified', 'failed', 'expired');

-- SSL certificate status enum
CREATE TYPE ssl_status AS ENUM ('none', 'pending', 'issued', 'expired', 'failed');

-- Table to store tenant domains (both subdomains and custom domains)
CREATE TABLE public.tenant_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  domain_name TEXT NOT NULL,
  domain_type domain_type NOT NULL,
  status domain_status NOT NULL DEFAULT 'pending',
  ssl_status ssl_status NOT NULL DEFAULT 'none',
  verification_token TEXT,
  verification_method TEXT, -- 'dns_txt', 'dns_cname', 'file_upload'
  verification_value TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  ssl_issued_at TIMESTAMP WITH TIME ZONE,
  ssl_expires_at TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  
  -- Constraints
  UNIQUE(domain_name)
);

-- Create partial unique index for primary domain per tenant
CREATE UNIQUE INDEX idx_tenant_domains_primary_unique 
ON public.tenant_domains(tenant_id) 
WHERE is_primary = true;

-- Table to store domain verification attempts and logs
CREATE TABLE public.domain_verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES public.tenant_domains(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL,
  response_data JSONB,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_tenant_domains_tenant_id ON public.tenant_domains(tenant_id);
CREATE INDEX idx_tenant_domains_domain_name ON public.tenant_domains(domain_name);
CREATE INDEX idx_tenant_domains_status ON public.tenant_domains(status);
CREATE INDEX idx_tenant_domains_active ON public.tenant_domains(is_active) WHERE is_active = true;
CREATE INDEX idx_domain_verification_logs_domain_id ON public.domain_verification_logs(domain_id);

-- Enable RLS
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_domains
CREATE POLICY "Tenant admins can manage their domains" 
ON public.tenant_domains 
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

CREATE POLICY "Tenant users can view their domains" 
ON public.tenant_domains 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- RLS Policies for domain_verification_logs
CREATE POLICY "Tenant admins can view domain verification logs" 
ON public.domain_verification_logs 
FOR SELECT 
USING (
  domain_id IN (
    SELECT id FROM public.tenant_domains 
    WHERE tenant_id = get_user_tenant_id()
  )
  AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

-- Function to generate verification token
CREATE OR REPLACE FUNCTION generate_domain_verification_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'vibepos-verify-' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check if a domain is available
CREATE OR REPLACE FUNCTION is_domain_available(domain_name_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.tenant_domains 
    WHERE domain_name = domain_name_param 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tenant by domain
CREATE OR REPLACE FUNCTION get_tenant_by_domain(domain_name_param TEXT)
RETURNS UUID AS $$
DECLARE
  tenant_uuid UUID;
BEGIN
  SELECT tenant_id INTO tenant_uuid
  FROM public.tenant_domains
  WHERE domain_name = domain_name_param
    AND is_active = true
    AND status = 'verified'
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_tenant_domains_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.tenant_domains IS 'Stores both subdomain and custom domain configurations for tenants';
COMMENT ON TABLE public.domain_verification_logs IS 'Logs domain verification attempts and results';
COMMENT ON FUNCTION generate_domain_verification_token() IS 'Generates a unique verification token for domain ownership verification';
COMMENT ON FUNCTION is_domain_available(TEXT) IS 'Checks if a domain name is available for registration';
COMMENT ON FUNCTION get_tenant_by_domain(TEXT) IS 'Returns the tenant ID for a verified domain';