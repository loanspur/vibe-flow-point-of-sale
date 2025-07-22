-- Add variant_id column to purchase_items table to support product variants in purchases
ALTER TABLE public.purchase_items 
ADD COLUMN variant_id UUID REFERENCES public.product_variants(id);

-- Add index for better performance
CREATE INDEX idx_purchase_items_variant_id ON public.purchase_items(variant_id);