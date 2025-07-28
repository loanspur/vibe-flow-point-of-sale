-- Create table for tenant-specific pricing overrides
CREATE TABLE public.tenant_custom_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_plan_id UUID NOT NULL REFERENCES public.billing_plans(id) ON DELETE CASCADE,
  custom_amount NUMERIC NOT NULL,
  original_amount NUMERIC NOT NULL,
  discount_percentage NUMERIC,
  reason TEXT,
  notes TEXT,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, billing_plan_id)
);

-- Enable RLS
ALTER TABLE public.tenant_custom_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for superadmins only
CREATE POLICY "Superadmins can manage custom pricing" 
ON public.tenant_custom_pricing 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_custom_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tenant_custom_pricing_updated_at
BEFORE UPDATE ON public.tenant_custom_pricing
FOR EACH ROW
EXECUTE FUNCTION update_tenant_custom_pricing_updated_at();

-- Create function to get effective pricing for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_effective_pricing(
  tenant_id_param UUID,
  billing_plan_id_param UUID
)
RETURNS TABLE(
  effective_amount NUMERIC,
  is_custom BOOLEAN,
  custom_pricing_id UUID,
  discount_percentage NUMERIC,
  original_amount NUMERIC
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  plan_price NUMERIC;
  custom_price RECORD;
BEGIN
  -- Get the base plan price
  SELECT price INTO plan_price
  FROM billing_plans
  WHERE id = billing_plan_id_param AND is_active = true;
  
  IF plan_price IS NULL THEN
    RETURN;
  END IF;
  
  -- Check for active custom pricing
  SELECT 
    tcp.*
  INTO custom_price
  FROM tenant_custom_pricing tcp
  WHERE tcp.tenant_id = tenant_id_param 
    AND tcp.billing_plan_id = billing_plan_id_param
    AND tcp.is_active = true
    AND (tcp.effective_date <= CURRENT_DATE)
    AND (tcp.expires_at IS NULL OR tcp.expires_at >= CURRENT_DATE);
  
  IF custom_price.id IS NOT NULL THEN
    -- Return custom pricing
    RETURN QUERY SELECT 
      custom_price.custom_amount,
      true,
      custom_price.id,
      custom_price.discount_percentage,
      custom_price.original_amount;
  ELSE
    -- Return standard pricing
    RETURN QUERY SELECT 
      plan_price,
      false,
      NULL::UUID,
      NULL::NUMERIC,
      plan_price;
  END IF;
END;
$$;