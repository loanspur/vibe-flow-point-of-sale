-- Enhanced Roles and Permissions System with System Features

-- Create enum types for better data consistency
DO $$ BEGIN
  CREATE TYPE feature_type AS ENUM ('core', 'premium', 'enterprise', 'addon');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feature_status AS ENUM ('active', 'inactive', 'deprecated', 'beta');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- System Features Table - Defines available features in the system
CREATE TABLE IF NOT EXISTS public.system_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  feature_type feature_type NOT NULL DEFAULT 'core',
  status feature_status NOT NULL DEFAULT 'active',
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  requires_subscription BOOLEAN DEFAULT false,
  min_plan_level TEXT,
  dependencies TEXT[], -- Array of feature names this depends on
  metadata JSONB DEFAULT '{}',
  is_system_feature BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Feature Sets - Predefined collections of features
CREATE TABLE IF NOT EXISTS public.feature_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  features TEXT[] NOT NULL, -- Array of feature names
  is_system_set BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tenant Feature Access - Which features are enabled for each tenant
CREATE TABLE IF NOT EXISTS public.tenant_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  enabled_by UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, feature_name)
);

-- Enhanced User Roles with more metadata
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'level') THEN
    ALTER TABLE public.user_roles 
    ADD COLUMN level INTEGER DEFAULT 1,
    ADD COLUMN can_manage_users BOOLEAN DEFAULT false,
    ADD COLUMN can_manage_settings BOOLEAN DEFAULT false,
    ADD COLUMN can_view_reports BOOLEAN DEFAULT false,
    ADD COLUMN feature_set_id UUID,
    ADD COLUMN resource_limits JSONB DEFAULT '{}';
  END IF;
END $$;

-- Permission Templates - Predefined permission sets
CREATE TABLE IF NOT EXISTS public.permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  template_data JSONB NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_system_template BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Activity Permissions - Track what users can do
CREATE TABLE IF NOT EXISTS public.user_activity_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  is_allowed BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- Conditions for permission (time, location, etc.)
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, tenant_id, resource, action)
);

-- Enable RLS on new tables
ALTER TABLE public.system_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_permissions ENABLE ROW LEVEL SECURITY;