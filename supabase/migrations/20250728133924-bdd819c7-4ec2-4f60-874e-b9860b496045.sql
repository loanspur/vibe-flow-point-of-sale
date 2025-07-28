-- Add expiry date field to products table
ALTER TABLE public.products 
ADD COLUMN expiry_date DATE;

-- Add expiry date field to purchase items table for tracking expiry when receiving products
ALTER TABLE public.purchase_items 
ADD COLUMN expiry_date DATE;

-- Create index for expiry date queries
CREATE INDEX idx_products_expiry_date ON public.products(expiry_date) WHERE expiry_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.expiry_date IS 'Product expiry date for perishable items';
COMMENT ON COLUMN public.purchase_items.expiry_date IS 'Expiry date for items in this purchase batch';