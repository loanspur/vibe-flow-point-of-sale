-- Add has_expiry_date boolean field to products table
ALTER TABLE public.products 
ADD COLUMN has_expiry_date boolean DEFAULT false;

-- Add comment for the new field
COMMENT ON COLUMN public.products.has_expiry_date IS 'Whether this product tracks expiry dates';