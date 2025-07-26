-- Create legal documents management system (fixed version)

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
INSERT INTO public.legal_documents (document_type, title, description, is_active)
VALUES 
  ('privacy_policy', 'Privacy Policy', 'VibePOS Privacy Policy document', true),
  ('terms_of_service', 'Terms of Service', 'VibePOS Terms of Service document', true),
  ('cookie_policy', 'Cookie Policy', 'VibePOS Cookie Policy document', true);

-- Insert initial versions with current content
INSERT INTO public.legal_document_versions (document_id, version_number, content, is_current)
SELECT 
  ld.id,
  '1.0',
  CASE 
    WHEN ld.document_type = 'privacy_policy' THEN 
      '# Privacy Policy

Last updated: ' || CURRENT_DATE || '

## 1. Information We Collect
At vibePOS, we collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes:

- Account information (name, email address, phone number)
- Business information (company name, address, tax information)
- Transaction data (sales records, inventory, customer data)
- Payment information (processed securely through our payment partners)
- Usage data (how you interact with our platform)

## 2. How We Use Your Information
We use the information we collect to:

- Provide, maintain, and improve our POS services
- Process transactions and manage your account
- Send you technical notices and support messages
- Respond to your comments and questions
- Analyze usage patterns to enhance user experience
- Comply with legal obligations and enforce our terms

## 3. Information Sharing
We do not sell, trade, or otherwise transfer your personal information to third parties except:

- With your explicit consent
- To trusted service providers who assist in operating our platform
- When required by law or to protect our rights
- In connection with a business transfer or acquisition

## 4. Data Security
We implement industry-standard security measures to protect your information, including:

- Encryption of data in transit and at rest
- Regular security audits and monitoring
- Access controls and authentication protocols
- Secure data centers with physical safeguards

For questions about this Privacy Policy, please contact us at privacy@vibepos.com'
    
    WHEN ld.document_type = 'terms_of_service' THEN
      '# Terms of Service

Last updated: ' || CURRENT_DATE || '

## 1. Acceptance of Terms
By accessing and using vibePOS ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

## 2. Description of Service
vibePOS is a cloud-based point-of-sale system that provides:

- Multi-tenant POS functionality
- Inventory management
- Sales reporting and analytics
- Customer management
- Payment processing integration
- User management and role-based access

## 3. User Accounts
To use our Service, you must:

- Provide accurate and complete registration information
- Maintain the security of your account credentials
- Be responsible for all activities under your account
- Notify us immediately of any unauthorized use
- Be at least 18 years old or have legal capacity to enter contracts

## 4. Subscription and Payment
Our Service operates on a subscription model:

- Fees are charged monthly or annually as selected
- Payment is due in advance for each billing period
- All fees are non-refundable except as required by law
- We may change pricing with 30 days notice
- Failure to pay may result in service suspension

For questions about these Terms of Service, please contact us at legal@vibepos.com'
    
    WHEN ld.document_type = 'cookie_policy' THEN
      '# Cookie Policy

Last updated: ' || CURRENT_DATE || '

## What are cookies?
Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and analyzing how you use our site.

## How we use cookies
We use cookies for:

- Essential site functionality
- Remembering your preferences
- Analyzing site traffic and usage
- Improving our services
- Security and fraud prevention

## Types of cookies we use
- **Strictly necessary cookies**: Required for the website to function properly
- **Functional cookies**: Remember your preferences and settings
- **Analytics cookies**: Help us understand how visitors use our site
- **Marketing cookies**: Used to track visitors across websites

## Managing cookies
You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed.

For questions about this Cookie Policy, please contact us at privacy@vibepos.com'
    
    ELSE 'Default legal document content'
  END,
  true
FROM public.legal_documents ld
WHERE ld.tenant_id IS NULL;