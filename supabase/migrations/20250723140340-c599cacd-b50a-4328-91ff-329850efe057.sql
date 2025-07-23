-- Create comprehensive tax management system

-- Tax types/categories (Sales Tax, VAT, GST, etc.)
CREATE TABLE public.tax_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type_code TEXT NOT NULL, -- 'sales_tax', 'vat', 'gst', 'excise', etc.
  is_compound BOOLEAN DEFAULT false, -- Can this tax be applied on top of other taxes
  is_inclusive BOOLEAN DEFAULT false, -- Is this tax included in the price
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, type_code)
);

-- Tax jurisdictions/locations
CREATE TABLE public.tax_jurisdictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  jurisdiction_code TEXT NOT NULL,
  country TEXT,
  state_province TEXT,
  city TEXT,
  postal_code_pattern TEXT, -- Regex pattern for postal codes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, jurisdiction_code)
);

-- Tax rates with historical tracking
CREATE TABLE public.tax_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tax_type_id UUID NOT NULL REFERENCES public.tax_types(id) ON DELETE CASCADE,
  jurisdiction_id UUID REFERENCES public.tax_jurisdictions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  rate_percentage DECIMAL(8,4) NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax groups for bundling multiple taxes
CREATE TABLE public.tax_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax group members
CREATE TABLE public.tax_group_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_group_id UUID NOT NULL REFERENCES public.tax_groups(id) ON DELETE CASCADE,
  tax_rate_id UUID NOT NULL REFERENCES public.tax_rates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tax_group_id, tax_rate_id)
);

-- Tax exemptions
CREATE TABLE public.tax_exemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  exemption_code TEXT NOT NULL,
  description TEXT,
  exemption_type TEXT NOT NULL, -- 'customer', 'product', 'transaction'
  tax_type_id UUID REFERENCES public.tax_types(id) ON DELETE CASCADE,
  exemption_percentage DECIMAL(5,2) DEFAULT 100.00, -- 100% = full exemption
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, exemption_code)
);

-- Tax calculations for transactions
CREATE TABLE public.tax_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  transaction_type TEXT NOT NULL, -- 'sale', 'purchase', 'quote'
  transaction_id UUID NOT NULL,
  tax_type_id UUID NOT NULL REFERENCES public.tax_types(id),
  tax_rate_id UUID REFERENCES public.tax_rates(id),
  jurisdiction_id UUID REFERENCES public.tax_jurisdictions(id),
  base_amount DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(8,4) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL,
  exemption_id UUID REFERENCES public.tax_exemptions(id),
  exemption_amount DECIMAL(12,2) DEFAULT 0,
  final_tax_amount DECIMAL(12,2) NOT NULL,
  calculation_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tax tables
ALTER TABLE public.tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_group_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tax_types
CREATE POLICY "Tenant managers can manage tax types" ON public.tax_types
FOR ALL USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view tax types" ON public.tax_types
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- RLS Policies for tax_jurisdictions
CREATE POLICY "Tenant managers can manage tax jurisdictions" ON public.tax_jurisdictions
FOR ALL USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view tax jurisdictions" ON public.tax_jurisdictions
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- RLS Policies for tax_rates
CREATE POLICY "Tenant managers can manage tax rates" ON public.tax_rates
FOR ALL USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view tax rates" ON public.tax_rates
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- RLS Policies for tax_groups
CREATE POLICY "Tenant managers can manage tax groups" ON public.tax_groups
FOR ALL USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view tax groups" ON public.tax_groups
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- RLS Policies for tax_group_rates
CREATE POLICY "Tenant managers can manage tax group rates" ON public.tax_group_rates
FOR ALL USING ((tax_group_id IN (SELECT id FROM public.tax_groups WHERE tenant_id = get_user_tenant_id())) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view tax group rates" ON public.tax_group_rates
FOR SELECT USING (tax_group_id IN (SELECT id FROM public.tax_groups WHERE tenant_id = get_user_tenant_id()));

-- RLS Policies for tax_exemptions
CREATE POLICY "Tenant managers can manage tax exemptions" ON public.tax_exemptions
FOR ALL USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])));

CREATE POLICY "Tenant users can view tax exemptions" ON public.tax_exemptions
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- RLS Policies for tax_calculations
CREATE POLICY "Tenant staff can manage tax calculations" ON public.tax_calculations
FOR ALL USING ((tenant_id = get_user_tenant_id()) AND (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role])));

CREATE POLICY "Tenant users can view tax calculations" ON public.tax_calculations
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Create triggers for updated_at
CREATE TRIGGER update_tax_types_updated_at
  BEFORE UPDATE ON public.tax_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_jurisdictions_updated_at
  BEFORE UPDATE ON public.tax_jurisdictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at
  BEFORE UPDATE ON public.tax_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_groups_updated_at
  BEFORE UPDATE ON public.tax_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_exemptions_updated_at
  BEFORE UPDATE ON public.tax_exemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_tax_rates_tenant_active ON public.tax_rates(tenant_id, is_active);
CREATE INDEX idx_tax_rates_effective_date ON public.tax_rates(effective_date, expiry_date);
CREATE INDEX idx_tax_calculations_transaction ON public.tax_calculations(transaction_type, transaction_id);
CREATE INDEX idx_tax_calculations_tenant_date ON public.tax_calculations(tenant_id, calculation_date);

-- Insert default tax types
INSERT INTO public.tax_types (tenant_id, name, description, type_code, is_compound, is_inclusive)
SELECT 
  t.id as tenant_id,
  'Sales Tax' as name,
  'Standard sales tax' as description,
  'sales_tax' as type_code,
  false as is_compound,
  false as is_inclusive
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tax_types tt 
  WHERE tt.tenant_id = t.id AND tt.type_code = 'sales_tax'
);

-- Create tax calculation function
CREATE OR REPLACE FUNCTION public.calculate_tax_amount(
  tenant_id_param UUID,
  base_amount_param DECIMAL,
  tax_rate_id_param UUID,
  exemption_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  tax_amount DECIMAL,
  exemption_amount DECIMAL,
  final_tax_amount DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tax_rate DECIMAL;
  exemption_percentage DECIMAL DEFAULT 0;
  calculated_tax DECIMAL;
  calculated_exemption DECIMAL;
  final_amount DECIMAL;
BEGIN
  -- Get tax rate
  SELECT rate_percentage INTO tax_rate
  FROM public.tax_rates
  WHERE id = tax_rate_id_param AND tenant_id = tenant_id_param AND is_active = true;
  
  IF tax_rate IS NULL THEN
    tax_rate := 0;
  END IF;
  
  -- Calculate base tax amount
  calculated_tax := base_amount_param * (tax_rate / 100);
  
  -- Apply exemption if provided
  IF exemption_id_param IS NOT NULL THEN
    SELECT e.exemption_percentage INTO exemption_percentage
    FROM public.tax_exemptions e
    WHERE e.id = exemption_id_param 
      AND e.tenant_id = tenant_id_param 
      AND e.is_active = true
      AND (e.effective_date <= CURRENT_DATE)
      AND (e.expiry_date IS NULL OR e.expiry_date >= CURRENT_DATE);
      
    IF exemption_percentage IS NULL THEN
      exemption_percentage := 0;
    END IF;
  END IF;
  
  -- Calculate exemption amount
  calculated_exemption := calculated_tax * (exemption_percentage / 100);
  
  -- Calculate final tax amount
  final_amount := calculated_tax - calculated_exemption;
  
  RETURN QUERY SELECT calculated_tax, calculated_exemption, final_amount;
END;
$$;