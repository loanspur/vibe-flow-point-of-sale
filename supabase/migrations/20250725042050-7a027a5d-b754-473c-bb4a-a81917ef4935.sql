-- Create brands table for brand management
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product units table for unit management
CREATE TABLE public.product_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  base_unit_id UUID REFERENCES public.product_units(id),
  conversion_factor NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranty info table for warranty tracking
CREATE TABLE public.warranty_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  warranty_period_months INTEGER NOT NULL DEFAULT 0,
  warranty_type TEXT DEFAULT 'manufacturer',
  warranty_terms TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create combo products table for product bundles
CREATE TABLE public.combo_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  combo_product_id UUID NOT NULL,
  component_product_id UUID NOT NULL,
  component_variant_id UUID,
  quantity_required INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add brand_id and unit_id to products table
ALTER TABLE public.products 
ADD COLUMN brand_id UUID REFERENCES public.brands(id),
ADD COLUMN unit_id UUID REFERENCES public.product_units(id),
ADD COLUMN is_combo_product BOOLEAN DEFAULT false,
ADD COLUMN barcode TEXT,
ADD COLUMN allow_negative_stock BOOLEAN DEFAULT false;

-- Add RLS policies for brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers can manage brands" 
ON public.brands 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view brands" 
ON public.brands 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Add RLS policies for product units
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers can manage product units" 
ON public.product_units 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view product units" 
ON public.product_units 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Add RLS policies for warranty info
ALTER TABLE public.warranty_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers can manage warranty info" 
ON public.warranty_info 
FOR ALL 
USING (product_id IN (SELECT id FROM products WHERE tenant_id = get_user_tenant_id()) AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view warranty info" 
ON public.warranty_info 
FOR SELECT 
USING (product_id IN (SELECT id FROM products WHERE tenant_id = get_user_tenant_id()));

-- Add RLS policies for combo products
ALTER TABLE public.combo_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant managers can manage combo products" 
ON public.combo_products 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view combo products" 
ON public.combo_products 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create triggers for updated_at columns
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_units_updated_at
  BEFORE UPDATE ON public.product_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warranty_info_updated_at
  BEFORE UPDATE ON public.warranty_info
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create some default product units
INSERT INTO public.product_units (tenant_id, name, abbreviation, conversion_factor) 
SELECT DISTINCT tenant_id, 'Piece', 'pc', 1 FROM public.products WHERE tenant_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.product_units (tenant_id, name, abbreviation, conversion_factor) 
SELECT DISTINCT tenant_id, 'Kilogram', 'kg', 1 FROM public.products WHERE tenant_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.product_units (tenant_id, name, abbreviation, conversion_factor) 
SELECT DISTINCT tenant_id, 'Liter', 'l', 1 FROM public.products WHERE tenant_id IS NOT NULL
ON CONFLICT DO NOTHING;