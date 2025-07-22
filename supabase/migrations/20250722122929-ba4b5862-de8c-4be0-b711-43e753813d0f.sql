-- Add variant_id column to sale_items table to support product variants
ALTER TABLE public.sale_items 
ADD COLUMN variant_id UUID REFERENCES public.product_variants(id);

-- Add index for better performance on variant lookups
CREATE INDEX idx_sale_items_variant_id ON public.sale_items(variant_id);