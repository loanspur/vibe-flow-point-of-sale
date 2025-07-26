-- Create legal documents management system

-- Create legal documents table
CREATE TABLE public.legal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID, -- NULL for global documents, tenant_id for tenant-specific
  document_type TEXT NOT NULL, -- 'privacy_policy', 'terms_of_service', 'cookie_policy', etc.
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create legal document versions table
CREATE TABLE public.legal_document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(document_id, version_number)
);

-- Create user legal acceptances table
CREATE TABLE public.user_legal_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID, -- NULL for global acceptances, tenant_id for tenant-specific
  document_version_id UUID NOT NULL REFERENCES public.legal_document_versions(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, document_version_id)
);

-- Enable RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for legal_documents
-- Public can view global active documents
CREATE POLICY "Public can view global active legal documents"
ON public.legal_documents
FOR SELECT
USING (tenant_id IS NULL AND is_active = true);

-- Tenant users can view their tenant's active documents
CREATE POLICY "Tenant users can view tenant legal documents"
ON public.legal_documents
FOR SELECT
USING (tenant_id = get_user_tenant_id() AND is_active = true);

-- Superadmins can manage all documents
CREATE POLICY "Superadmins can manage all legal documents"
ON public.legal_documents
FOR ALL
USING (get_current_user_role() = 'superadmin'::user_role);

-- Tenant admins can manage their tenant's documents
CREATE POLICY "Tenant admins can manage tenant legal documents"
ON public.legal_documents
FOR ALL
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['admin'::user_role, 'manager'::user_role]));

-- RLS Policies for legal_document_versions
-- Public can view versions of accessible documents
CREATE POLICY "Public can view legal document versions"
ON public.legal_document_versions
FOR SELECT
USING (
  document_id IN (
    SELECT id FROM public.legal_documents 
    WHERE (tenant_id IS NULL OR tenant_id = get_user_tenant_id()) 
    AND is_active = true
  )
);

-- Superadmins can manage all versions
CREATE POLICY "Superadmins can manage all legal document versions"
ON public.legal_document_versions
FOR ALL
USING (get_current_user_role() = 'superadmin'::user_role);

-- Tenant admins can manage their tenant's document versions
CREATE POLICY "Tenant admins can manage tenant legal document versions"
ON public.legal_document_versions
FOR ALL
USING (
  document_id IN (
    SELECT id FROM public.legal_documents 
    WHERE tenant_id = get_user_tenant_id()
  ) 
  AND get_current_user_role() = ANY(ARRAY['admin'::user_role, 'manager'::user_role])
);

-- RLS Policies for user_legal_acceptances
-- Users can view their own acceptances
CREATE POLICY "Users can view their own legal acceptances"
ON public.user_legal_acceptances
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own acceptances
CREATE POLICY "Users can create their own legal acceptances"
ON public.user_legal_acceptances
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Superadmins can view all acceptances
CREATE POLICY "Superadmins can view all legal acceptances"
ON public.user_legal_acceptances
FOR SELECT
USING (get_current_user_role() = 'superadmin'::user_role);

-- Tenant admins can view their tenant's acceptances
CREATE POLICY "Tenant admins can view tenant legal acceptances"
ON public.user_legal_acceptances
FOR SELECT
USING (
  tenant_id = get_user_tenant_id() 
  AND get_current_user_role() = ANY(ARRAY['admin'::user_role, 'manager'::user_role])
);

-- Create indexes for better performance
CREATE INDEX idx_legal_documents_tenant_type ON public.legal_documents(tenant_id, document_type);
CREATE INDEX idx_legal_document_versions_document_current ON public.legal_document_versions(document_id, is_current);
CREATE INDEX idx_user_legal_acceptances_user ON public.user_legal_acceptances(user_id);
CREATE INDEX idx_user_legal_acceptances_tenant ON public.user_legal_acceptances(tenant_id);

-- Create function to ensure only one current version per document
CREATE OR REPLACE FUNCTION public.ensure_single_current_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If this version is being set as current, unset all other versions for this document
  IF NEW.is_current = true THEN
    UPDATE public.legal_document_versions 
    SET is_current = false, updated_at = now()
    WHERE document_id = NEW.document_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for version management
CREATE TRIGGER ensure_single_current_version_trigger
  BEFORE INSERT OR UPDATE ON public.legal_document_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_current_version();

-- Create function to get current version of a document
CREATE OR REPLACE FUNCTION public.get_current_legal_document(
  document_type_param TEXT,
  tenant_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  document_id UUID,
  version_id UUID,
  title TEXT,
  content TEXT,
  version_number TEXT,
  effective_date DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ld.id as document_id,
    ldv.id as version_id,
    ld.title,
    ldv.content,
    ldv.version_number,
    ldv.effective_date
  FROM public.legal_documents ld
  JOIN public.legal_document_versions ldv ON ld.id = ldv.document_id
  WHERE ld.document_type = document_type_param
    AND ld.is_active = true
    AND ldv.is_current = true
    AND (ld.tenant_id = tenant_id_param OR (tenant_id_param IS NULL AND ld.tenant_id IS NULL))
  ORDER BY ld.created_at DESC
  LIMIT 1;
END;
$$;

-- Insert default global legal documents
INSERT INTO public.legal_documents (document_type, title, description, is_active, created_by)
VALUES 
  ('privacy_policy', 'Privacy Policy', 'VibePOS Privacy Policy document', true, NULL),
  ('terms_of_service', 'Terms of Service', 'VibePOS Terms of Service document', true, NULL),
  ('cookie_policy', 'Cookie Policy', 'VibePOS Cookie Policy document', true, NULL);

-- Insert initial versions with current content
WITH privacy_doc AS (
  SELECT id FROM public.legal_documents WHERE document_type = 'privacy_policy' AND tenant_id IS NULL
),
terms_doc AS (
  SELECT id FROM public.legal_documents WHERE document_type = 'terms_of_service' AND tenant_id IS NULL
),
cookie_doc AS (
  SELECT id FROM public.legal_documents WHERE document_type = 'cookie_policy' AND tenant_id IS NULL
)
INSERT INTO public.legal_document_versions (document_id, version_number, content, is_current, created_by)
SELECT * FROM (
  SELECT 
    (SELECT id FROM privacy_doc),
    '1.0',
    '# Privacy Policy

## 1. Information We Collect
At vibePOS, we collect information you provide directly to us, such as when you create an account, use our services, or contact us for support...

[Content continues with full privacy policy text]',
    true,
    NULL
  UNION ALL
  SELECT 
    (SELECT id FROM terms_doc),
    '1.0',
    '# Terms of Service

## 1. Acceptance of Terms
By accessing and using vibePOS ("the Service"), you accept and agree to be bound by the terms and provision of this agreement...

[Content continues with full terms of service text]',
    true,
    NULL
  UNION ALL
  SELECT 
    (SELECT id FROM cookie_doc),
    '1.0',
    '# Cookie Policy

## What are cookies?
Cookies are small text files that are stored on your device when you visit our website...

[Content continues with cookie policy text]',
    true,
    NULL
) AS versions;