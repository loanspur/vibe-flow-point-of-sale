-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Create storage policies for product images
CREATE POLICY "Anyone can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Create product subcategories table
CREATE TABLE public.product_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subcategories
ALTER TABLE public.product_subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies for subcategories
CREATE POLICY "Tenant managers can manage tenant subcategories" 
ON public.product_subcategories 
FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]));

CREATE POLICY "Tenant users can view tenant subcategories" 
ON public.product_subcategories 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create product variants table
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Size", "Color"
  value TEXT NOT NULL, -- e.g., "Large", "Red"
  sku TEXT,
  price_adjustment NUMERIC DEFAULT 0, -- Additional cost for this variant
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, name, value)
);

-- Enable RLS on variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Create policies for variants
CREATE POLICY "Tenant managers can manage variants of tenant products" 
ON public.product_variants 
FOR ALL 
USING (
  product_id IN (
    SELECT id FROM public.products 
    WHERE tenant_id = get_user_tenant_id()
  ) 
  AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

CREATE POLICY "Tenant users can view variants of tenant products" 
ON public.product_variants 
FOR SELECT 
USING (
  product_id IN (
    SELECT id FROM public.products 
    WHERE tenant_id = get_user_tenant_id()
  )
);

-- Add subcategory_id to products table
ALTER TABLE public.products ADD COLUMN subcategory_id UUID REFERENCES public.product_subcategories(id);

-- Create triggers for updated_at
CREATE TRIGGER update_product_subcategories_updated_at
BEFORE UPDATE ON public.product_subcategories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_product_subcategories_category_id ON public.product_subcategories(category_id);
CREATE INDEX idx_product_subcategories_tenant_id ON public.product_subcategories(tenant_id);
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_products_subcategory_id ON public.products(subcategory_id);