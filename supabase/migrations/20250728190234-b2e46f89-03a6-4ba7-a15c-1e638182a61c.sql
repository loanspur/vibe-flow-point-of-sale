-- Add vibepos.shop domain entry to properly route invitations
-- This should point to a system tenant or be handled specially for invitations

-- First, let's create a system configuration for the main domain
INSERT INTO public.tenant_domains (
  tenant_id,
  domain_name,
  domain_type,
  status,
  is_primary,
  is_active,
  verified_at,
  created_by
) VALUES (
  NULL, -- No specific tenant - this is the main domain
  'vibepos.shop',
  'custom_domain',
  'verified',
  false,
  true,
  NOW(),
  NULL
) ON CONFLICT (domain_name) DO NOTHING;