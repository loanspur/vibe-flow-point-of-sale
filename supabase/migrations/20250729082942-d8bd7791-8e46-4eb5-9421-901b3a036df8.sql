-- Create application versions table
CREATE TABLE public.application_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_number TEXT NOT NULL,
  version_name TEXT,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  release_notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  is_stable BOOLEAN NOT NULL DEFAULT true,
  build_number INTEGER,
  git_commit_hash TEXT,
  changelog JSONB DEFAULT '[]'::jsonb,
  features_added JSONB DEFAULT '[]'::jsonb,
  bugs_fixed JSONB DEFAULT '[]'::jsonb,
  breaking_changes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(version_number)
);

-- Create version tracking table for tenant deployments
CREATE TABLE public.tenant_version_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  version_id UUID NOT NULL REFERENCES public.application_versions(id),
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deployment_method TEXT DEFAULT 'automatic',
  deployment_status TEXT NOT NULL DEFAULT 'active',
  rollback_version_id UUID REFERENCES public.application_versions(id),
  rollback_reason TEXT,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system health tracking
CREATE TABLE public.system_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  version_id UUID REFERENCES public.application_versions(id),
  health_score NUMERIC(3,2) DEFAULT 100.00,
  uptime_percentage NUMERIC(5,2) DEFAULT 100.00,
  error_count INTEGER DEFAULT 0,
  performance_score NUMERIC(3,2) DEFAULT 100.00,
  user_satisfaction NUMERIC(3,2),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.application_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_version_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_versions
CREATE POLICY "Public can view current version info" 
ON public.application_versions 
FOR SELECT 
USING (is_current = true OR is_stable = true);

CREATE POLICY "Superadmins can manage all versions" 
ON public.application_versions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);

-- RLS Policies for tenant_version_tracking
CREATE POLICY "Tenants can view their version tracking" 
ON public.tenant_version_tracking 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage tenant version tracking" 
ON public.tenant_version_tracking 
FOR ALL 
USING (
  (tenant_id = get_user_tenant_id() AND is_tenant_admin()) OR
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'superadmin'))
);

-- RLS Policies for system_health_logs
CREATE POLICY "Tenants can view their health logs" 
ON public.system_health_logs 
FOR SELECT 
USING (tenant_id = get_user_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Admins can manage health logs" 
ON public.system_health_logs 
FOR ALL 
USING (
  (tenant_id = get_user_tenant_id() AND is_tenant_admin()) OR
  (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'superadmin'))
);

-- Create function to get current application version
CREATE OR REPLACE FUNCTION public.get_current_application_version()
RETURNS TABLE(
  version_number TEXT,
  version_name TEXT,
  release_date DATE,
  build_number INTEGER,
  is_stable BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    av.version_number,
    av.version_name,
    av.release_date,
    av.build_number,
    av.is_stable
  FROM public.application_versions av
  WHERE av.is_current = true
  LIMIT 1;
END;
$function$;

-- Create function to set current version
CREATE OR REPLACE FUNCTION public.set_current_version(version_number_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is superadmin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'Only superadmins can set current version';
  END IF;
  
  -- Clear current version flag from all versions
  UPDATE public.application_versions 
  SET is_current = false, updated_at = now();
  
  -- Set new current version
  UPDATE public.application_versions 
  SET is_current = true, updated_at = now()
  WHERE version_number = version_number_param;
  
  RETURN FOUND;
END;
$function$;

-- Create function to track tenant version deployment
CREATE OR REPLACE FUNCTION public.track_tenant_deployment(
  tenant_id_param UUID,
  version_number_param TEXT,
  deployment_method_param TEXT DEFAULT 'automatic'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  version_record RECORD;
  tracking_id UUID;
BEGIN
  -- Get version info
  SELECT * INTO version_record
  FROM public.application_versions
  WHERE version_number = version_number_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % not found', version_number_param;
  END IF;
  
  -- Deactivate previous deployments for this tenant
  UPDATE public.tenant_version_tracking
  SET deployment_status = 'superseded', updated_at = now()
  WHERE tenant_id = tenant_id_param AND deployment_status = 'active';
  
  -- Create new tracking record
  INSERT INTO public.tenant_version_tracking (
    tenant_id, version_id, deployment_method, deployment_status
  ) VALUES (
    tenant_id_param, version_record.id, deployment_method_param, 'active'
  ) RETURNING id INTO tracking_id;
  
  RETURN tracking_id;
END;
$function$;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_version_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_application_versions_updated_at
  BEFORE UPDATE ON public.application_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_version_updated_at();

CREATE TRIGGER update_tenant_version_tracking_updated_at
  BEFORE UPDATE ON public.tenant_version_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_version_updated_at();

-- Insert initial version data
INSERT INTO public.application_versions (
  version_number,
  version_name,
  release_notes,
  is_current,
  is_stable,
  build_number,
  changelog,
  features_added
) VALUES (
  '1.0.0',
  'Initial Release',
  'First stable release of VibePOS with core functionality including POS operations, inventory management, customer management, and basic reporting.',
  true,
  true,
  1001,
  '[
    {"type": "feature", "description": "Core POS functionality"},
    {"type": "feature", "description": "Inventory management system"},
    {"type": "feature", "description": "Customer management"},
    {"type": "feature", "description": "Basic reporting and analytics"},
    {"type": "feature", "description": "User authentication and roles"},
    {"type": "feature", "description": "Multi-tenant architecture"}
  ]'::jsonb,
  '[
    "Point of Sale operations",
    "Product and inventory tracking", 
    "Customer database",
    "Sales reporting",
    "User management",
    "Tenant isolation"
  ]'::jsonb
);